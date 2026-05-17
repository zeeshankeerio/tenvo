'use server';

import pool from '@/lib/db';
import { withGuard } from '@/lib/rbac/serverGuard';

async function checkAuth(businessId, client = null, permission = 'finance.exchange_rates') {
    const { session } = await withGuard(businessId, { permission, client });
    return session;
}

/**
 * Set an exchange rate for a currency pair
 */
export async function setExchangeRateAction(data) {
    const client = await pool.connect();
    try {
        await checkAuth(data.businessId, client, 'finance.exchange_rates');

        const result = await client.query(`
            INSERT INTO exchange_rates (
                business_id, from_currency, to_currency, rate, effective_date, source
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (business_id, from_currency, to_currency, effective_date)
            DO UPDATE SET rate = $4, source = $6, updated_at = NOW()
            RETURNING *
        `, [
            data.businessId,
            data.fromCurrency || 'PKR',
            data.toCurrency,
            data.rate,
            data.effectiveDate || new Date(),
            data.source || 'manual'
        ]);

        return { success: true, rate: result.rows[0] };
    } catch (error) {
        console.error('Set exchange rate error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Get exchange rate history for a currency pair
 */
export async function getExchangeRatesAction(businessId, fromCurrency = 'PKR', toCurrency = null) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'finance.exchange_rates');

        let query = `
            SELECT * FROM exchange_rates
            WHERE business_id = $1 AND from_currency = $2
        `;
        const params = [businessId, fromCurrency];

        if (toCurrency) {
            query += ` AND to_currency = $3`;
            params.push(toCurrency);
        }

        query += ` ORDER BY effective_date DESC LIMIT 100`;

        const result = await client.query(query, params);
        return { success: true, rates: result.rows };
    } catch (error) {
        console.error('Get exchange rates error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Get the latest rate for a currency pair
 */
export async function getLatestRateAction(businessId, fromCurrency, toCurrency) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'finance.exchange_rates');

        const result = await client.query(`
            SELECT * FROM exchange_rates
            WHERE business_id = $1 AND from_currency = $2 AND to_currency = $3
            ORDER BY effective_date DESC
            LIMIT 1
        `, [businessId, fromCurrency, toCurrency]);

        if (result.rows.length === 0) {
            return { success: true, rate: null, message: 'No rate found for this pair' };
        }

        return { success: true, rate: result.rows[0] };
    } catch (error) {
        console.error('Get latest rate error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Convert an amount between currencies using latest available rate
 */
export async function convertCurrencyAction(businessId, amount, fromCurrency, toCurrency) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'finance.exchange_rates');

        if (fromCurrency === toCurrency) {
            return { success: true, originalAmount: amount, convertedAmount: amount, rate: 1 };
        }

        // Try direct rate first
        let result = await client.query(`
            SELECT rate FROM exchange_rates
            WHERE business_id = $1 AND from_currency = $2 AND to_currency = $3
            ORDER BY effective_date DESC LIMIT 1
        `, [businessId, fromCurrency, toCurrency]);

        if (result.rows.length > 0) {
            const rate = parseFloat(result.rows[0].rate);
            return {
                success: true,
                originalAmount: amount,
                convertedAmount: Math.round(amount * rate * 100) / 100,
                rate,
            };
        }

        // Try inverse rate
        result = await client.query(`
            SELECT rate FROM exchange_rates
            WHERE business_id = $1 AND from_currency = $2 AND to_currency = $3
            ORDER BY effective_date DESC LIMIT 1
        `, [businessId, toCurrency, fromCurrency]);

        if (result.rows.length > 0) {
            const inverseRate = 1 / parseFloat(result.rows[0].rate);
            return {
                success: true,
                originalAmount: amount,
                convertedAmount: Math.round(amount * inverseRate * 100) / 100,
                rate: inverseRate,
            };
        }

        return { success: false, error: `No exchange rate found for ${fromCurrency} -> ${toCurrency}` };
    } catch (error) {
        console.error('Convert currency error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}
