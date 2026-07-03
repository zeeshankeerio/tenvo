# Tenvo Affiliate Program Design
## Revenue Share Model for Client Acquisition (2026)

### Program Overview
**Goal:** Enable partners to earn 10-20% commission on client subscriptions they bring to Tenvo
**Target:** Accountants, consultants, technology partners, agencies, influencers

---

## 1. COMMISSION STRUCTURE

### Tier-Based Commission Rates

| Partner Tier | Monthly Revenue Threshold | Commission Rate | Payout Terms |
|-------------|---------------------------|----------------|--------------|
| **Bronze** | PKR 0 - 100K | 10% | Net 30 |
| **Silver** | PKR 100K - 500K | 12% | Net 30 |
| **Gold** | PKR 500K - 1M | 15% | Net 15 |
| **Platinum** | PKR 1M+ | 20% | Net 15 |

### Commission Calculation Example

**Scenario:** Partner brings 100 clients, each paying PKR 10,000/month (Professional tier)

```
Monthly Client Payments: 100 × PKR 10,000 = PKR 1,000,000
Partner Commission (Platinum 20%): PKR 200,000/month
Annual Partner Revenue: PKR 2,400,000 (PKR 24 lakh)
```

**Scenario:** 100 clients on annual billing (15% discount)

```
Annual Client Payments: 100 × (PKR 10,000 × 12 × 0.85) = PKR 10,200,000
Partner Commission (20% on first year): PKR 2,040,000 (PKR 20.4 lakh one-time)
Recurring Commission: PKR 200,000/month on renewals
```

### Payout Rules

1. **Recurring Revenue Model:**
   - Partners earn commission **for the lifetime** of the subscription (as long as client remains active)
   - Commission applies to all renewals (monthly/annual)
   - If client upgrades tier, partner earns higher commission on new amount

2. **Advance Payment Handling:**
   - Annual payments: Commission paid **upfront** within Net 15/30 of payment receipt
   - Example: Client pays PKR 102,000 annually → Partner gets PKR 20,400 immediately

3. **Trial Period:**
   - No commission during 14-day trial
   - Commission starts when client converts to paid subscription

4. **Refund Protection:**
   - If client cancels within first 30 days, commission is **reversed**
   - After 30 days, commission is **non-refundable** even if client churns

---

## 2. TRACKING & ATTRIBUTION

### Database Schema Additions

```prisma
model affiliates {
  id                String              @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  user_id           String              @unique // Links to User table
  affiliate_code    String              @unique // e.g., "ACCT-AHMED-2026"
  tier              String              @default("bronze") // bronze, silver, gold, platinum
  commission_rate   Decimal             @default(0.10) @db.Decimal(5,4) // 0.1000 = 10%
  status            String              @default("active") // active, suspended, terminated
  payment_method    String?             // bank_transfer, jazzcash, easypaisa
  payment_details   Json?               // Bank account, mobile wallet details
  total_referrals   Int                 @default(0)
  total_revenue     Decimal             @default(0) @db.Decimal(12,2)
  total_commission  Decimal             @default(0) @db.Decimal(12,2)
  created_at        DateTime            @default(now()) @db.Timestamptz(6)
  updated_at        DateTime            @default(now()) @db.Timestamptz(6)
  
  referrals         affiliate_referrals[]
  payouts           affiliate_payouts[]
  
  @@map("affiliates")
}

model affiliate_referrals {
  id                String     @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  affiliate_id      String     @db.Uuid
  business_id       String     @db.Uuid
  referred_user_id  String     // User who registered via referral link
  status            String     @default("trial") // trial, active, churned
  plan_tier         String     // Tier they subscribed to
  subscription_id   String?    // Stripe subscription ID (if applicable)
  
  // Revenue tracking
  monthly_value     Decimal    @db.Decimal(10,2) // Current MRR from this referral
  lifetime_value    Decimal    @default(0) @db.Decimal(12,2) // Total revenue from this client
  
  // Commission tracking
  commission_rate   Decimal    @db.Decimal(5,4) // Rate at time of referral (locked)
  total_commission  Decimal    @default(0) @db.Decimal(12,2) // Total paid to affiliate
  
  // Attribution
  referral_source   String?    // utm_source, landing page, campaign
  referral_metadata Json?      // UTM params, campaign details
  
  converted_at      DateTime?  @db.Timestamptz(6) // When trial converted to paid
  created_at        DateTime   @default(now()) @db.Timestamptz(6)
  updated_at        DateTime   @default(now()) @db.Timestamptz(6)
  
  affiliate         affiliates @relation(fields: [affiliate_id], references: [id], onDelete: Cascade)
  business          businesses @relation(fields: [business_id], references: [id], onDelete: Cascade)
  
  @@index([affiliate_id])
  @@index([business_id])
  @@map("affiliate_referrals")
}

model affiliate_payouts {
  id                String     @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  affiliate_id      String     @db.Uuid
  period_start      DateTime   @db.Timestamptz(6)
  period_end        DateTime   @db.Timestamptz(6)
  
  // Payout details
  gross_amount      Decimal    @db.Decimal(12,2) // Total commission earned
  deductions        Decimal    @default(0) @db.Decimal(12,2) // Tax withholding, fees
  net_amount        Decimal    @db.Decimal(12,2) // Amount paid to affiliate
  
  payment_method    String     // bank_transfer, jazzcash, easypaisa
  payment_reference String?    // Transaction ID, reference number
  payment_status    String     @default("pending") // pending, processing, completed, failed
  
  // Metadata
  referral_count    Int        // Number of active referrals in period
  notes             String?
  
  paid_at           DateTime?  @db.Timestamptz(6)
  created_at        DateTime   @default(now()) @db.Timestamptz(6)
  
  affiliate         affiliates @relation(fields: [affiliate_id], references: [id], onDelete: Cascade)
  
  @@index([affiliate_id])
  @@index([period_start, period_end])
  @@map("affiliate_payouts")
}

model affiliate_commission_history {
  id                String     @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  affiliate_id      String     @db.Uuid
  referral_id       String     @db.Uuid
  business_id       String     @db.Uuid
  
  commission_type   String     // subscription_start, renewal, upgrade, manual_adjustment
  amount            Decimal    @db.Decimal(10,2)
  rate_applied      Decimal    @db.Decimal(5,4)
  
  payment_reference String?    // Links to subscription_history or manual payment
  payout_id         String?    @db.Uuid // Which payout batch included this
  
  created_at        DateTime   @default(now()) @db.Timestamptz(6)
  
  @@index([affiliate_id])
  @@index([referral_id])
  @@index([created_at])
  @@map("affiliate_commission_history")
}
```

### Attribution Tracking

**Referral URL Format:**
```
https://tenvo.app/register?ref=ACCT-AHMED-2026
https://tenvo.app/pricing?ref=ACCT-AHMED-2026
```

**UTM Parameter Support:**
```
?ref=ACCT-AHMED-2026&utm_source=linkedin&utm_medium=post&utm_campaign=2026-q1-launch
```

**Cookie-based Tracking:**
- Set `tenvo_referral` cookie with 90-day expiration on first visit
- Store `affiliate_code`, `utm_params`, `landing_page`
- On registration, link business to affiliate

**Multiple Touch Attribution:**
- **First-touch:** Credit to first referral link clicked
- **Last-touch:** Credit to last referral link before conversion (configurable)

---

## 3. AFFILIATE DASHBOARD & TOOLS

### Partner Portal Features

**Location:** `/affiliates/dashboard`

**Metrics Displayed:**
- Total referrals (trial, active, churned)
- Monthly Recurring Revenue (MRR) from referrals
- Total commission earned (all-time, this month)
- Next payout amount & date
- Conversion rate (clicks → signups → paid)

**Tools Provided:**
1. **Referral Link Generator**
   - Custom campaign URLs with UTM tracking
   - QR code generator for offline marketing
   
2. **Marketing Assets**
   - Logos, banners, social media graphics
   - Email templates for outreach
   - Video demos and case studies
   
3. **Performance Reports**
   - Referral funnel (clicks → signups → trials → paid)
   - Client retention rates
   - Revenue by client segment
   
4. **Payout Management**
   - Payment method setup (bank, JazzCash, EasyPaisa)
   - Payout history with downloadable invoices
   - Tax documents (if applicable)

---

## 4. COMMISSION CALCULATION ENGINE

### Automated Workflow

```javascript
// When client makes payment (Stripe or manual)
async function processAffiliateCommission({
  businessId,
  amount,
  paymentType, // 'subscription_start', 'renewal', 'upgrade'
  subscriptionId
}) {
  // 1. Find affiliate referral
  const referral = await db.affiliate_referrals.findFirst({
    where: { business_id: businessId, status: 'active' },
    include: { affiliate: true }
  });
  
  if (!referral) return; // No affiliate attribution
  
  // 2. Calculate commission
  const commissionRate = referral.commission_rate; // Locked at referral time
  const commissionAmount = amount * commissionRate;
  
  // 3. Record commission
  await db.affiliate_commission_history.create({
    data: {
      affiliate_id: referral.affiliate_id,
      referral_id: referral.id,
      business_id: businessId,
      commission_type: paymentType,
      amount: commissionAmount,
      rate_applied: commissionRate,
      payment_reference: subscriptionId
    }
  });
  
  // 4. Update totals
  await db.affiliate_referrals.update({
    where: { id: referral.id },
    data: {
      lifetime_value: { increment: amount },
      total_commission: { increment: commissionAmount }
    }
  });
  
  await db.affiliates.update({
    where: { id: referral.affiliate_id },
    data: {
      total_revenue: { increment: amount },
      total_commission: { increment: commissionAmount }
    }
  });
  
  // 5. If annual payment, trigger immediate payout (Platinum/Gold only)
  if (paymentType === 'subscription_start' && 
      referral.affiliate.tier in ['gold', 'platinum']) {
    await scheduleAffiliatePayout(referral.affiliate_id);
  }
}
```

### Payout Processing

**Monthly Payout Schedule:**
- **1st of month:** Calculate commissions for previous month
- **3rd of month:** Generate payout batches
- **5th-7th:** Process bank transfers
- **15th:** Net 15 partners receive funds
- **30th:** Net 30 partners receive funds

**Payout Methods:**
1. **Bank Transfer** (ACH/IBAN) - Preferred for large amounts
2. **JazzCash** - For PKR payouts in Pakistan
3. **EasyPaisa** - Alternative mobile wallet
4. **Stripe Connect** (future) - For international affiliates

---

## 5. PARTNER TIERS & BENEFITS

### Progression System

| Tier | Requirements | Benefits |
|------|-------------|----------|
| **Bronze** | 0-10 active clients | 10% commission, Net 30, monthly reports |
| **Silver** | 11-50 active clients | 12% commission, Net 30, bi-weekly reports, co-marketing support |
| **Gold** | 51-100 active clients | 15% commission, Net 15, priority support, quarterly business reviews |
| **Platinum** | 100+ active clients | 20% commission, Net 15, dedicated partner manager, white-label options |

### Special Incentives

**Launch Bonus (First 3 Months):**
- +5% commission boost for first 20 referrals
- Example: Bronze gets 15% instead of 10%

**Bulk Referral Bonuses:**
- 25 clients in one quarter: PKR 50,000 bonus
- 50 clients in one quarter: PKR 150,000 bonus
- 100 clients in one quarter: PKR 400,000 bonus

**Annual Growth Bonus:**
- If partner's referral base grows 50%+ YoY: Extra 1 month commission
- Example: Platinum with PKR 200K/month → PKR 200K bonus

---

## 6. FRAUD PREVENTION & COMPLIANCE

### Safeguards

1. **Self-Referral Prevention:**
   - Block registration if referral cookie matches logged-in user
   - Flag suspicious patterns (same IP, same payment method)

2. **Quality Standards:**
   - Minimum 30-day retention to earn commission
   - If 50%+ of referrals churn in first 60 days → affiliate suspended

3. **Audit Trail:**
   - All commission calculations logged
   - Platform admin can review and adjust payouts

4. **Terms & Conditions:**
   - No spamming, black-hat SEO, or misleading claims
   - Violation = immediate termination + commission forfeiture

### Tax & Legal

**Pakistan Context:**
- Affiliates receive **PKR payments as independent contractors**
- Tenvo issues **payment certificates** (not full tax invoices)
- Affiliates responsible for own tax filing
- Tenvo may withhold tax if required by FBR (TBD)

**International Affiliates:**
- Paid via Stripe Connect (future)
- 1099 forms for US affiliates (if applicable)

---

## 7. IMPLEMENTATION ROADMAP

### Phase 1: MVP (Q4 2026) - 3 months
- [ ] Database schema implementation
- [ ] Affiliate signup flow (`/affiliates/apply`)
- [ ] Referral link tracking (cookie-based)
- [ ] Basic dashboard (`/affiliates/dashboard`)
- [ ] Manual payout processing by admin

### Phase 2: Automation (Q1 2027) - 2 months
- [ ] Automated commission calculation on Stripe webhooks
- [ ] Automated commission for manual payments
- [ ] Monthly payout batch generation
- [ ] Email notifications (new referral, conversion, payout)
- [ ] Marketing asset library

### Phase 3: Scale (Q2 2027) - 2 months
- [ ] Stripe Connect integration for auto-payouts
- [ ] Advanced analytics (cohort analysis, LTV prediction)
- [ ] Affiliate API for third-party integrations
- [ ] White-label options for Platinum partners
- [ ] Referral competitions & leaderboards

---

## 8. MARKETING & RECRUITMENT

### Target Partner Segments

1. **Chartered Accountants (CA firms)**
   - Offer as value-add to bookkeeping clients
   - Position as modernization solution

2. **Technology Consultants**
   - System integrators, IT service providers
   - Resell as part of digital transformation projects

3. **Industry Associations**
   - Retail associations, restaurant groups
   - Bulk referral opportunities

4. **Business Coaches/Consultants**
   - Recommend to SME clients
   - Passive income stream

5. **Digital Marketing Agencies**
   - Bundle with website/e-commerce projects

### Recruitment Strategy

**Launch Campaign:**
- LinkedIn ads targeting CA/IT professionals
- Webinar: "Earn PKR 200K+/month Referring Businesses to Tenvo"
- Landing page: `/affiliates` with calculator showing earnings potential

**Onboarding Process:**
1. **Application:** `/affiliates/apply` (name, email, phone, business type)
2. **Approval:** Platform admin reviews (24-48 hours)
3. **Training:** Automated email course (product demo, sales tips)
4. **Activation:** Affiliate code assigned, dashboard access granted

**Support:**
- Dedicated email: affiliates@tenvo.app
- Monthly partner calls
- Slack community (Platinum tier)

---

## 9. SUCCESS METRICS

### KPIs to Track

- **Affiliate Acquisition:** New partners per month
- **Activation Rate:** % of affiliates who refer at least 1 client
- **Referral Conversion:** Trial → Paid conversion rate
- **Client Retention:** 6-month retention of referred clients
- **Average MRR per Affiliate:** Total MRR / Active affiliates
- **Payout Ratio:** Commission paid / Revenue from referrals
- **ROI:** Lifetime value of referred clients vs commission paid

### Financial Projections

**Year 1 (2027):**
- 100 active affiliates
- 500 referred clients (avg 5 per affiliate)
- Avg client MRR: PKR 5,000
- Total referral MRR: PKR 2,500,000
- Avg commission (12%): PKR 300,000/month
- Annual commission payout: PKR 3,600,000

**Year 3 (2029):**
- 500 active affiliates
- 5,000 referred clients
- Total referral MRR: PKR 30,000,000
- Avg commission (14%): PKR 4,200,000/month
- Annual commission payout: PKR 50,400,000

**Customer Acquisition Cost (CAC) Comparison:**
- Direct sales CAC: PKR 15,000-25,000 (ads, sales team)
- Affiliate CAC: PKR 0 upfront, 10-20% lifetime (performance-based)
- **Affiliate is more profitable** if client LTV > 10-20 months

---

## 10. PLATFORM ADMIN CONTROLS

### Admin Dashboard Features

**Location:** `/admin/affiliates`

**Capabilities:**
1. **Affiliate Management:**
   - Approve/reject applications
   - Change tier assignments
   - Suspend/terminate affiliates
   
2. **Commission Review:**
   - View pending payouts
   - Manually adjust commission amounts
   - Override calculations (with audit log)
   
3. **Payout Processing:**
   - Generate payout batches
   - Export payment files for bank
   - Mark payouts as completed
   
4. **Reporting:**
   - Affiliate performance rankings
   - Revenue attribution analysis
   - Fraud detection reports

**Server Actions:**
```javascript
// lib/actions/admin/affiliates.js
export async function approveAffiliateApplication(userId)
export async function calculateMonthlyPayouts(month, year)
export async function processAffiliatePayout(payoutId)
export async function adjustCommission(commissionId, newAmount, reason)
export async function terminateAffiliate(affiliateId, reason)
```

---

## 11. LEGAL AGREEMENTS

### Affiliate Agreement Template

**Key Clauses:**
1. **Commission Terms:** Rates, payout schedule, adjustments
2. **Attribution Rules:** Cookie duration, multi-touch policy
3. **Quality Standards:** Minimum retention, prohibited tactics
4. **Termination:** Grounds for suspension, final payout handling
5. **Non-circumvention:** Affiliate cannot directly contact clients to bypass platform
6. **Data Privacy:** GDPR/Pakistan data protection compliance
7. **Indemnification:** Affiliate liable for own marketing claims

**Document Location:** `/legal/affiliate-agreement.pdf`

---

## CONCLUSION

### Will This Work in 2026?

**YES, if you execute correctly:**

✅ **Market Timing:**
- SaaS affiliate programs proven (Shopify Partners, HubSpot, Zoho)
- Pakistan's digitalization is accelerating
- SMEs need trusted advisors (CAs, consultants) to recommend tools

✅ **Economics:**
- 10-20% commission is sustainable vs 20-30% CAC on ads
- Recurring revenue means affiliate is incentivized to ensure client success
- Lifetime value approach aligns partner incentives with Tenvo's growth

✅ **Competitive Advantage:**
- Zoho has partner program (but complex, slow payouts)
- Busy.in has resellers (but requires upfront purchase)
- Your model is **performance-based** = lower barrier to entry

⚠️ **Risks to Mitigate:**
1. **Low-quality referrals:** Enforce 30-day retention minimum
2. **Cash flow strain:** Start with Net 30, move to Net 15 only for top tiers
3. **Fraud:** Invest in tracking infrastructure early
4. **Support burden:** Affiliates will need training & ongoing help

### Recommended Launch Strategy

**Q4 2026:**
1. Build MVP (schema, tracking, manual payouts)
2. Recruit 10 pilot affiliates (CAs, consultants you know)
3. Offer 15% commission (vs standard 10%) for first 6 months
4. Gather feedback, iterate

**Q1 2027:**
5. Automate commission calculations
6. Public launch of affiliate program
7. Marketing campaign targeting 100 affiliates
8. Monthly partner webinars

**Q2 2027:**
9. Introduce tiered system (Bronze → Platinum)
10. Add bulk bonuses
11. Stripe Connect for international payouts
12. Target 50 active referring partners

### Bottom Line

Your example of **100 clients × PKR 10K = PKR 10 lakh revenue** → **PKR 2 lakh affiliate commission (20%)** is **realistic and profitable**:

- Client LTV at 2 years = PKR 240K
- Commission paid = PKR 48K (20% × 2 years)
- Net revenue = PKR 192K
- **ROI = 400%** (vs ~150-200% on paid ads)

**This model works because:**
1. You pay only for **successful conversions** (not clicks/impressions)
2. Affiliate has **skin in the game** (lifetime commission → better client support)
3. You **leverage networks** you can't reach with ads alone

**Start with manual MVP in Q4 2026, automate in Q1 2027, scale by Q2 2027.** 🚀
