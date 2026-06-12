import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromotionService } from '../PromotionService';
import { MarketingAgentService } from '../MarketingAgentService';
import { SupplierAutomationService } from '../SupplierAutomationService';

// Mock the DB pool
const { mockClient } = vi.hoisted(() => ({
    mockClient: {
        query: vi.fn(),
        release: vi.fn(),
    }
}));

vi.mock('@/lib/db', () => ({
    default: {
        connect: vi.fn().mockResolvedValue(mockClient),
    },
}));

// Mock Audit Service
vi.mock('../audit/auditService', () => ({
    recordAuditLog: vi.fn().mockResolvedValue(true),
}));

describe('2026 Vision Services', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockClient.query.mockReset();
    });

    describe('PromotionService', () => {
        const mockItems = [
            { product_id: 'prod-1', quantity: 2, unit_price: 100 }, // sub: 200
            { product_id: 'prod-2', quantity: 1, unit_price: 300 }  // sub: 300
        ];
        const subtotal = 500;

        it('should apply global percentage discounts', async () => {
            mockClient.query.mockResolvedValueOnce({
                rows: [
                    {
                        id: 'promo-1',
                        name: '10% OFF',
                        type: 'discount',
                        value: 10,
                        is_percentage: true,
                        min_order_amount: 0,
                        product_ids: []
                    }
                ]
            });

            const result = await PromotionService.calculateAppliedDiscounts('biz-1', mockItems, subtotal);
            expect(result.discount_amount).toBe(50); // 10% of 500
            expect(result.applied_promotions).toHaveLength(1);
        });

        it('should apply product-specific fixed discounts', async () => {
            mockClient.query.mockResolvedValueOnce({
                rows: [
                    {
                        id: 'promo-2',
                        name: 'Prod 1 Special',
                        type: 'discount',
                        value: 20,
                        is_percentage: false,
                        min_order_amount: 0,
                        product_ids: ['prod-1']
                    }
                ]
            });

            const result = await PromotionService.calculateAppliedDiscounts('biz-1', mockItems, subtotal);
            expect(result.discount_amount).toBe(20);
            expect(result.applied_promotions[0].name).toBe('Prod 1 Special');
        });

        it('should skip promotions that don\'t meet min_order_amount', async () => {
            mockClient.query.mockResolvedValueOnce({
                rows: [
                    {
                        id: 'promo-3',
                        name: 'Big Spend Bonus',
                        type: 'discount',
                        value: 100,
                        is_percentage: false,
                        min_order_amount: 1000,
                        product_ids: []
                    }
                ]
            });

            const result = await PromotionService.calculateAppliedDiscounts('biz-1', mockItems, subtotal);
            expect(result.discount_amount).toBe(0);
        });
    });

    describe('MarketingAgentService', () => {
        it('should create segments and refresh memberships', async () => {
            // Mock segment creation
            mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'seg-1' }] });
            const segmentId = await MarketingAgentService.createSegment('biz-1', 'High Value', { min_spend: 5000 });
            expect(segmentId).toBe('seg-1');

            // Mock refresh logic sequence:
            // 1. BEGIN
            // 2. Select segment
            // 3. Delete memberships
            // 4. Select customers
            // 5. Insert memberships (2x)
            // 6. COMMIT
            mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'seg-1', rules: { city: 'Karachi' } }] }); // Get segment
            mockClient.query.mockResolvedValueOnce({ rows: [] }); // Delete memberships
            mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'cust-1' }, { id: 'cust-2' }] }); // Find matching customers
            mockClient.query.mockResolvedValue({ rows: [] }); // Inserts and COMMIT

            const count = await MarketingAgentService.refreshSegment('biz-1', 'seg-1');
            expect(count).toBe(2);
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('city = $2'), ['biz-1', 'Karachi']);
        });
    });

    describe('SupplierAutomationService', () => {
        it('should convert a selected quote to a purchase order correctly', async () => {
            // Mock sequence for convertQuoteToPurchase:
            // 1. BEGIN
            // 2. SELECT quote
            // 3. INSERT PO
            // 4. INSERT item
            // 5. COMMIT
            mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
            mockClient.query.mockResolvedValueOnce({
                rows: [{
                    id: 'quote-1',
                    vendor_id: 'ven-1',
                    product_id: 'prod-1',
                    product_name: 'Raw Material A',
                    price: 45.50,
                    reorder_quantity: 100,
                    quote_number: 'Q-2026-001'
                }]
            });
            // assertEntityBelongsToBusiness: vendor, product, warehouse
            mockClient.query.mockResolvedValueOnce({ rows: [{ ok: 1 }] });
            mockClient.query.mockResolvedValueOnce({ rows: [{ ok: 1 }] });
            mockClient.query.mockResolvedValueOnce({ rows: [{ ok: 1 }] });
            mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'po-1' }] }); // INSERT PO
            mockClient.query.mockResolvedValue({ rows: [] }); // INSERT item and COMMIT

            const result = await SupplierAutomationService.convertQuoteToPurchase('biz-1', 'quote-1', 'wh-1');

            expect(result.purchaseId).toBe('po-1');
            expect(result.purchaseNumber).toContain('PO-');
            // Check PO total calculation: 45.50 * 100 = 4550
            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO purchases'),
                expect.arrayContaining([4550])
            );
        });
    });
});
