'use server';

import pool from '@/lib/db';
import { actionSuccess, actionFailure } from '@/lib/actions/_shared/result';
import Stripe from 'stripe';
import { AccountingService } from '@/lib/services/AccountingService';

// Lazy Stripe client — prevents crash when STRIPE_SECRET_KEY is absent
let _stripe = null;
function getStripe() {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) return null;
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
  }
  return _stripe;
}

/**
 * Get store payment settings
 */
export async function getStorePaymentSettings(businessId) {
  const client = await pool.connect();
  
  try {
    // Get settings
    const settingsResult = await client.query(
      `SELECT * FROM store_payment_settings WHERE business_id = $1::uuid`,
      [businessId]
    );
    
    // Get active payment methods
    const methodsResult = await client.query(
      `SELECT * FROM business_payment_methods 
       WHERE business_id = $1::uuid AND is_active = true
       ORDER BY is_default DESC, sort_order ASC`,
      [businessId]
    );
    
    // Get Stripe Connect status
    const stripeResult = await client.query(
      `SELECT * FROM stripe_connect_accounts WHERE business_id = $1::uuid`,
      [businessId]
    );
    
    return actionSuccess({
      settings: settingsResult.rows[0] || null,
      paymentMethods: methodsResult.rows,
      stripeConnect: stripeResult.rows[0] || null,
    });
    
  } catch (error) {
    console.error('[getStorePaymentSettings] Error:', error);
    return actionFailure('FETCH_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Get available payment methods for customers
 */
export async function getAvailablePaymentMethods(businessId) {
  const client = await pool.connect();
  
  try {
    let result;
    try {
      result = await client.query(
        `SELECT id, provider, display_name, description, icon_url,
                supports_cod, supports_cards, supports_wallet, supports_bank_transfer,
                fee_percentage, fee_fixed
         FROM business_payment_methods
         WHERE business_id = $1::uuid AND is_active = true
         ORDER BY is_default DESC, sort_order ASC`,
        [businessId]
      );
    } catch (tableErr) {
      // Table may not exist yet — return safe COD default
      if (tableErr.code === '42P01' || tableErr.message?.includes('business_payment_methods')) {
        return actionSuccess({
          methods: [{
            id: 'cod-default',
            provider: 'cod',
            display_name: 'Cash on Delivery (COD)',
            description: 'Pay when your order is delivered',
            supports_cod: true,
            fee_percentage: 0,
            fee_fixed: 0,
          }],
        });
      }
      throw tableErr;
    }

    // If no methods configured, always offer COD as safe default
    if (result.rows.length === 0) {
      return actionSuccess({
        methods: [{
          id: 'cod-default',
          provider: 'cod',
          display_name: 'Cash on Delivery (COD)',
          description: 'Pay when your order is delivered',
          supports_cod: true,
          fee_percentage: 0,
          fee_fixed: 0,
        }],
      });
    }

    return actionSuccess({ methods: result.rows });
    
  } catch (error) {
    console.error('[getAvailablePaymentMethods] Error:', error);
    // Return COD fallback instead of hard failure so checkout never breaks
    return actionSuccess({
      methods: [{
        id: 'cod-default',
        provider: 'cod',
        display_name: 'Cash on Delivery (COD)',
        description: 'Pay when your order is delivered',
        supports_cod: true,
        fee_percentage: 0,
        fee_fixed: 0,
      }],
    });
  } finally {
    client.release();
  }
}

/**
 * Create Stripe Connect account for store owner
 */
export async function createStripeConnectAccount(businessId, businessData) {
  const client = await pool.connect();
  
  try {
    // Check if already connected
    const existingResult = await client.query(
      `SELECT stripe_account_id FROM stripe_connect_accounts WHERE business_id = $1::uuid`,
      [businessId]
    );
    
    if (existingResult.rows.length > 0) {
      return actionFailure('ALREADY_CONNECTED', 'Stripe account already connected');
    }
    
    // Create Stripe Connect account
    const stripe = getStripe();
    if (!stripe) return actionFailure('STRIPE_NOT_CONFIGURED', 'Stripe is not configured');
    const account = await stripe.accounts.create({
      type: 'express',
      country: businessData.country || 'PK',
      email: businessData.email,
      business_type: businessData.businessType || 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: businessData.businessName,
        url: businessData.website || undefined,
        mcc: businessData.mcc || '5732', // Retail store
      },
    });
    
    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/business/store-settings/payments?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/business/store-settings/payments?success=true`,
      type: 'account_onboarding',
    });
    
    // Store in database
    await client.query(
      `INSERT INTO stripe_connect_accounts (
        business_id, stripe_account_id, account_type, 
        business_type, business_profile, onboarding_url, onboarding_expires_at,
        default_currency, created_at
      ) VALUES ($1::uuid, $2, $3, $4, $5, $6, NOW() + INTERVAL '1 hour', $7, NOW())`,
      [
        businessId,
        account.id,
        'express',
        businessData.businessType || 'individual',
        JSON.stringify(businessData.businessProfile || {}),
        accountLink.url,
        businessData.defaultCurrency || 'PKR',
      ]
    );
    
    // Add as payment method
    await client.query(
      `INSERT INTO business_payment_methods (
        business_id, provider, display_name, is_active, is_test_mode,
        stripe_account_id, supports_cards, description, created_at
      ) VALUES ($1::uuid, 'stripe', 'Credit/Debit Card (Stripe)', true, $2, $3, true, 
       'Secure card payments processed by Stripe', NOW())
      ON CONFLICT (business_id, provider) DO UPDATE SET
        is_active = true, stripe_account_id = $3, updated_at = NOW()`,
      [businessId, process.env.NODE_ENV !== 'production', account.id]
    );
    
    return actionSuccess({
      accountId: account.id,
      onboardingUrl: accountLink.url,
      message: 'Stripe account created. Redirect to onboarding.',
    });
    
  } catch (error) {
    console.error('[createStripeConnectAccount] Error:', error);
    return actionFailure('STRIPE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Get Stripe onboarding URL
 */
export async function getStripeOnboardingUrl(businessId) {
  const client = await pool.connect();
  
  try {
    const stripe = getStripe();
    if (!stripe) return actionFailure('STRIPE_NOT_CONFIGURED', 'Stripe is not configured');

    const result = await client.query(
      `SELECT stripe_account_id FROM stripe_connect_accounts WHERE business_id = $1::uuid`,
      [businessId]
    );
    
    if (result.rows.length === 0) {
      return actionFailure('NOT_CONNECTED', 'No Stripe account found');
    }
    
    const { stripe_account_id } = result.rows[0];
    
    const accountLink = await stripe.accountLinks.create({
      account: stripe_account_id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/business/store-settings/payments?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/business/store-settings/payments?success=true`,
      type: 'account_onboarding',
    });
    
    return actionSuccess({ onboardingUrl: accountLink.url });
    
  } catch (error) {
    console.error('[getStripeOnboardingUrl] Error:', error);
    return actionFailure('STRIPE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Add COD payment method
 */
export async function addCODPaymentMethod(businessId, settings = {}) {
  const client = await pool.connect();
  
  try {
    await client.query(
      `INSERT INTO business_payment_methods (
        business_id, provider, display_name, supports_cod, is_active,
        description, fee_percentage, fee_fixed, created_at
      ) VALUES ($1::uuid, 'cod', $2, true, true, $3, $4, $5, NOW())
      ON CONFLICT (business_id, provider) DO UPDATE SET
        is_active = true, fee_percentage = $4, fee_fixed = $5, updated_at = NOW()`,
      [
        businessId,
        settings.displayName || 'Cash on Delivery (COD)',
        settings.description || 'Pay when you receive your order',
        settings.feePercentage || 0,
        settings.feeFixed || 0,
      ]
    );
    
    // Update settings
    await client.query(
      `INSERT INTO store_payment_settings (business_id, allow_cod, cod_instructions)
       VALUES ($1::uuid, true, $2)
       ON CONFLICT (business_id) DO UPDATE SET
        allow_cod = true, cod_instructions = $2, updated_at = NOW()`,
      [businessId, settings.instructions || 'Please keep exact change ready']
    );
    
    return actionSuccess({ message: 'COD payment method added' });
    
  } catch (error) {
    console.error('[addCODPaymentMethod] Error:', error);
    return actionFailure('DB_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Add local payment method (EasyPaisa, JazzCash)
 */
export async function addLocalPaymentMethod(businessId, provider, config) {
  const client = await pool.connect();
  
  try {
    const displayNames = {
      easypaisa: 'EasyPaisa',
      jazzcash: 'JazzCash',
      bank_transfer: 'Bank Transfer',
    };
    
    const descriptions = {
      easypaisa: 'Pay using your EasyPaisa wallet',
      jazzcash: 'Pay using your JazzCash wallet',
      bank_transfer: 'Pay via direct bank transfer',
    };
    
    await client.query(
      `INSERT INTO business_payment_methods (
        business_id, provider, display_name, supports_wallet, is_active,
        config, description, created_at
      ) VALUES ($1::uuid, $2, $3, true, true, $4, $5, NOW())
      ON CONFLICT (business_id, provider) DO UPDATE SET
        is_active = true, config = $4, updated_at = NOW()`,
      [
        businessId,
        provider,
        config.displayName || displayNames[provider] || provider,
        JSON.stringify(config),
        descriptions[provider] || '',
      ]
    );
    
    return actionSuccess({ message: `${displayNames[provider]} payment method added` });
    
  } catch (error) {
    console.error('[addLocalPaymentMethod] Error:', error);
    return actionFailure('DB_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Create payment intent for checkout
 */
/**
 * Update payment status for an order (e.g. COD collected on delivery)
 */
export async function updateOrderPaymentStatus(orderId, businessId, paymentStatus, notes = '') {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update order payment status
    const updateRes = await client.query(
      `UPDATE storefront_orders
         SET payment_status = $1, updated_at = NOW()
       WHERE id = $2 AND business_id = $3::uuid
       RETURNING id, order_number, total_amount, metadata`,
      [paymentStatus, orderId, businessId]
    );

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return actionFailure('ORDER_NOT_FOUND', 'Order not found');
    }

    const order = updateRes.rows[0];

    // Append to status history in metadata
    const metadata = order.metadata || {};
    const history = metadata.payment_history || [];
    history.push({
      status: paymentStatus,
      notes: notes || `Payment status updated to ${paymentStatus}`,
      created_at: new Date().toISOString(),
    });
    metadata.payment_history = history;
    await client.query(
      `UPDATE storefront_orders SET metadata = $1 WHERE id = $2`,
      [JSON.stringify(metadata), orderId]
    );

    // If payment is now 'paid', record in payments ledger
    if (paymentStatus === 'paid') {
      try {
        await client.query(
          `INSERT INTO payments (
             business_id, payment_type, reference_type,
             amount, payment_mode, payment_date, notes, status, domain_data, created_at, updated_at
           ) VALUES ($1, 'in', 'storefront_order', $2, 'cod', CURRENT_DATE, $3, 'active', $4, NOW(), NOW())`,
          [
            businessId,
            parseFloat(order.total_amount),
            notes || `COD collected for order ${order.order_number}`,
            JSON.stringify({ storefront_order_id: orderId, storefront_order_number: order.order_number }),
          ]
        );

        // Accounting Link: Record the Receipt (Cash/Bank & AR)
        // storefront_orders.id is integer — journal reference_id is UUID; omit reference or GL insert fails and aborts the tx.
        await client.query('SAVEPOINT acc_storefront_cod');
        try {
          await AccountingService.recordBusinessTransaction('payment', {
            businessId,
            referenceId: null,
            amount: parseFloat(order.total_amount),
            paymentType: 'receipt',
            paymentMode: 'cash',
            description: `Storefront Payment Receipt: ${order.order_number} (COD, order id ${orderId})`,
            userId: null,
          }, client);
          await client.query('RELEASE SAVEPOINT acc_storefront_cod');
        } catch (accErr) {
          await client.query('ROLLBACK TO SAVEPOINT acc_storefront_cod');
          console.warn('[updateOrderPaymentStatus] Accounting record failed (non-fatal):', accErr.message);
        }

      } catch (payErr) {
        console.warn('[updateOrderPaymentStatus] Could not insert payment record:', payErr.message);
      }
    }

    await client.query('COMMIT');
    return actionSuccess({ orderId, paymentStatus });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[updateOrderPaymentStatus] Error:', error);
    return actionFailure('UPDATE_FAILED', error.message);
  } finally {
    client.release();
  }
}

/**
 * Record a manual / out-of-system payment against a storefront order.
 * Use when the customer paid in cash, via bank transfer, EasyPaisa, JazzCash,
 * cheque, or any channel outside the online checkout flow.
 */
export async function recordManualPayment(orderId, businessId, paymentData) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch the order to validate it belongs to this business
    const orderRes = await client.query(
      `SELECT id, order_number, total_amount, payment_status, metadata
         FROM storefront_orders
        WHERE id = $1 AND business_id = $2::uuid`,
      [orderId, businessId]
    );
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return actionFailure('ORDER_NOT_FOUND', 'Order not found');
    }
    const order = orderRes.rows[0];

    const {
      amount,
      paymentMode,       // 'cash' | 'bank_transfer' | 'easypaisa' | 'jazzcash' | 'cheque' | 'other'
      referenceId = '',  // bank ref / transaction ID / cheque number
      notes = '',
      receivedAt,        // ISO date string, defaults to now
      markFullyPaid = true, // set payment_status = 'paid' if true
    } = paymentData;

    if (!amount || parseFloat(amount) <= 0) {
      await client.query('ROLLBACK');
      return actionFailure('INVALID_AMOUNT', 'Amount must be greater than zero');
    }

    const paymentDate = receivedAt
      ? new Date(receivedAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    // Record in payments ledger
    await client.query(
      `INSERT INTO payments (
         business_id, payment_type, reference_type,
         amount, payment_mode, payment_date, notes, status, domain_data,
         created_at, updated_at
       ) VALUES ($1, 'in', 'storefront_order', $2, $3, $4, $5, 'active', $6, NOW(), NOW())`,
      [
        businessId,
        parseFloat(amount),
        paymentMode || 'cash',
        paymentDate,
        [
          notes,
          referenceId ? `Ref: ${referenceId}` : '',
          `Order: ${order.order_number}`,
        ].filter(Boolean).join(' | '),
        JSON.stringify({
          storefront_order_id: orderId,
          storefront_order_number: order.order_number,
          reference_id: referenceId || null,
          recorded_manually: true,
        }),
      ]
    );

    // Accounting Link: Record the Receipt (Cash/Bank & AR)
    // storefront_orders.id is integer, not UUID — never pass it as journal reference_id.
    await client.query('SAVEPOINT acc_storefront_manual_payment');
    try {
      await AccountingService.recordBusinessTransaction('payment', {
        businessId,
        referenceId: null,
        amount: parseFloat(amount),
        paymentType: 'receipt',
        paymentMode: (paymentMode === 'cash_on_delivery' || paymentMode === 'cash') ? 'cash' : 'bank',
        description: `Storefront Manual Payment: ${order.order_number} (order id ${order.id})`,
        userId: null,
      }, client);
      await client.query('RELEASE SAVEPOINT acc_storefront_manual_payment');
    } catch (accErr) {
      await client.query('ROLLBACK TO SAVEPOINT acc_storefront_manual_payment');
      console.warn('[recordManualPayment] Accounting record failed (non-fatal):', accErr.message);
    }

    // Update order payment_status and append to metadata history
    const newPaymentStatus = markFullyPaid ? 'paid' : order.payment_status;
    const meta = order.metadata || {};
    const payHistory = meta.payment_history || [];
    payHistory.push({
      amount: parseFloat(amount),
      payment_mode: paymentMode || 'cash',
      reference_id: referenceId || null,
      notes: notes || null,
      status: newPaymentStatus,
      recorded_manually: true,
      recorded_at: new Date().toISOString(),
    });
    meta.payment_history = payHistory;

    await client.query(
      `UPDATE storefront_orders
          SET payment_status = $1, metadata = $2, updated_at = NOW()
        WHERE id = $3`,
      [newPaymentStatus, JSON.stringify(meta), orderId]
    );

    await client.query('COMMIT');

    return actionSuccess({
      orderId,
      amount: parseFloat(amount),
      paymentMode: paymentMode || 'cash',
      paymentStatus: newPaymentStatus,
      message: `Payment of ${amount} recorded via ${paymentMode || 'cash'}`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[recordManualPayment] Error:', error);
    return actionFailure('RECORD_FAILED', error.message);
  } finally {
    client.release();
  }
}

export async function createPaymentIntent(orderId, businessId, amount, currency = 'PKR') {
  const client = await pool.connect();
  
  try {
    const stripe = getStripe();
    if (!stripe) return actionFailure('STRIPE_NOT_CONFIGURED', 'Stripe is not configured');

    // Get Stripe account for business
    const stripeResult = await client.query(
      `SELECT stripe_account_id FROM stripe_connect_accounts 
       WHERE business_id = $1::uuid AND is_charges_enabled = true`,
      [businessId]
    );
    
    if (stripeResult.rows.length === 0) {
      return actionFailure('NO_PAYMENT_PROVIDER', 'No active payment provider found');
    }
    
    const { stripe_account_id } = stripeResult.rows[0];
    
    // Create payment intent with transfer to connected account
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents/paisa
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      application_fee_amount: Math.round(amount * 100 * 0.025), // 2.5% platform fee
      transfer_data: {
        destination: stripe_account_id,
      },
      metadata: {
        orderId: orderId,
        businessId: businessId,
      },
    });
    
    // Create transaction record
    await client.query(
      `INSERT INTO payment_transactions (
        order_id, business_id, provider, stripe_payment_intent_id,
        amount, currency, status, created_at
      ) VALUES ($1, $2::uuid, 'stripe', $3, $4, $5, 'pending', NOW())`,
      [orderId, businessId, paymentIntent.id, amount, currency]
    );
    
    return actionSuccess({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
    
  } catch (error) {
    console.error('[createPaymentIntent] Error:', error);
    return actionFailure('STRIPE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Toggle payment method status
 */
export async function togglePaymentMethod(businessId, methodId, isActive) {
  const client = await pool.connect();
  
  try {
    await client.query(
      `UPDATE business_payment_methods 
       SET is_active = $1, updated_at = NOW()
       WHERE id = $2::uuid AND business_id = $3::uuid`,
      [isActive, methodId, businessId]
    );
    
    return actionSuccess({ 
      message: `Payment method ${isActive ? 'enabled' : 'disabled'}` 
    });
    
  } catch (error) {
    console.error('[togglePaymentMethod] Error:', error);
    return actionFailure('DB_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Update payment settings
 */
export async function updatePaymentSettings(businessId, settings) {
  const client = await pool.connect();
  
  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    const allowedFields = [
      'auto_capture_payments', 'require_billing_address', 'allow_save_cards',
      'default_currency', 'allow_cod', 'allow_prepaid', 'require_cvv',
      'enable_easypaisa', 'enable_jazzcash', 'enable_bank_transfer',
      'payment_instructions', 'cod_instructions'
    ];
    
    for (const [key, value] of Object.entries(settings)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }
    
    if (fields.length === 0) {
      return actionFailure('NO_FIELDS', 'No valid fields to update');
    }
    
    fields.push(`updated_at = $${paramIndex}`);
    values.push(businessId);
    paramIndex++;
    
    await client.query(
      `INSERT INTO store_payment_settings (business_id, ${fields.join(', ').replace(/ = \$\d+/g, '')})
       VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')})
       ON CONFLICT (business_id) DO UPDATE SET
        ${fields.join(', ')}`,
      [businessId, ...values.slice(0, -1)]
    );
    
    return actionSuccess({ message: 'Payment settings updated' });
    
  } catch (error) {
    console.error('[updatePaymentSettings] Error:', error);
    return actionFailure('DB_ERROR', error.message);
  } finally {
    client.release();
  }
}
