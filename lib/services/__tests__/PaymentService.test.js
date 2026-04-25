import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentService } from '../PaymentService';

/**
 * PaymentService Tests
 * 
 * Tests payment allocation validation including:
 * - Task 3.2: Over-allocation prevention
 * - Task 3.3: Customer/vendor matching validation
 */

describe('PaymentService', () => {
    let mockClient;
    let mockQuery;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Create mock query function
        mockQuery = vi.fn();
        
        // Create mock client
        mockClient = {
            query: mockQuery,
            release: vi.fn(),
        };

        // Mock pool.connect to return our mock client
        vi.spyOn(PaymentService, 'getClient').mockResolvedValue(mockClient);
    });

    describe('allocatePayment', () => {
        const businessId = 'biz-123';
        const userId = 'user-456';
        const paymentId = 'pay-789';

        describe('Task 3.2: Over-allocation prevention', () => {
            it('should prevent over-allocation when sum of allocations exceeds payment amount', async () => {
                // Mock payment with amount 1000
                mockQuery
                    .mockResolvedValueOnce({
                        rows: [{
                            id: paymentId,
                            amount: 1000,
                            customer_id: 'cust-1',
                            vendor_id: null,
                            payment_type: 'receipt',
                        }]
                    })
                    // Mock existing allocations (500 already allocated)
                    .mockResolvedValueOnce({
                        rows: [{ allocated: 500 }]
                    });

                // Try to allocate 600 more (total would be 1100, exceeding 1000)
                const allocations = [
                    { invoice_id: 'inv-1', amount: 600 }
                ];

                await expect(
                    PaymentService.allocatePayment(
                        paymentId,
                        allocations,
                        { businessId, userId },
                        mockClient
                    )
                ).rejects.toThrow(/Over-allocation prevented/);
            });

            it('should allow allocation when sum equals payment amount', async () => {
                // Mock payment with amount 1000
                mockQuery
                    .mockResolvedValueOnce({
                        rows: [{
                            id: paymentId,
                            amount: 1000,
                            customer_id: 'cust-1',
                            vendor_id: null,
                            payment_type: 'receipt',
                        }]
                    })
                    // Mock no existing allocations
                    .mockResolvedValueOnce({
                        rows: [{ allocated: 0 }]
                    })
                    // Mock invoice validation
                    .mockResolvedValueOnce({
                        rows: [{ customer_id: 'cust-1' }]
                    })
                    // Mock allocation insert
                    .mockResolvedValueOnce({
                        rows: [{
                            id: 'alloc-1',
                            payment_id: paymentId,
                            invoice_id: 'inv-1',
                            amount: 1000
                        }]
                    })
                    // Mock paid amount calculation
                    .mockResolvedValueOnce({
                        rows: [{ paid: 1000 }]
                    })
                    // Mock invoice total
                    .mockResolvedValueOnce({
                        rows: [{ grand_total: 1000 }]
                    })
                    // Mock invoice update
                    .mockResolvedValueOnce({ rows: [] });

                const allocations = [
                    { invoice_id: 'inv-1', amount: 1000 }
                ];

                const result = await PaymentService.allocatePayment(
                    paymentId,
                    allocations,
                    { businessId, userId },
                    mockClient
                );

                expect(result.success).toBe(true);
                expect(result.totalAllocated).toBe(1000);
                expect(result.remainingAmount).toBe(0);
            });

            it('should allow partial allocation when sum is less than payment amount', async () => {
                // Mock payment with amount 1000
                mockQuery
                    .mockResolvedValueOnce({
                        rows: [{
                            id: paymentId,
                            amount: 1000,
                            customer_id: 'cust-1',
                            vendor_id: null,
                            payment_type: 'receipt',
                        }]
                    })
                    // Mock no existing allocations
                    .mockResolvedValueOnce({
                        rows: [{ allocated: 0 }]
                    })
                    // Mock invoice validation
                    .mockResolvedValueOnce({
                        rows: [{ customer_id: 'cust-1' }]
                    })
                    // Mock allocation insert
                    .mockResolvedValueOnce({
                        rows: [{
                            id: 'alloc-1',
                            payment_id: paymentId,
                            invoice_id: 'inv-1',
                            amount: 600
                        }]
                    })
                    // Mock paid amount calculation
                    .mockResolvedValueOnce({
                        rows: [{ paid: 600 }]
                    })
                    // Mock invoice total
                    .mockResolvedValueOnce({
                        rows: [{ grand_total: 1000 }]
                    })
                    // Mock invoice update
                    .mockResolvedValueOnce({ rows: [] });

                const allocations = [
                    { invoice_id: 'inv-1', amount: 600 }
                ];

                const result = await PaymentService.allocatePayment(
                    paymentId,
                    allocations,
                    { businessId, userId },
                    mockClient
                );

                expect(result.success).toBe(true);
                expect(result.totalAllocated).toBe(600);
                expect(result.remainingAmount).toBe(400);
            });

            it('should prevent over-allocation across multiple allocations', async () => {
                // Mock payment with amount 1000
                mockQuery
                    .mockResolvedValueOnce({
                        rows: [{
                            id: paymentId,
                            amount: 1000,
                            customer_id: 'cust-1',
                            vendor_id: null,
                            payment_type: 'receipt',
                        }]
                    })
                    // Mock no existing allocations
                    .mockResolvedValueOnce({
                        rows: [{ allocated: 0 }]
                    });

                // Try to allocate 600 + 500 = 1100 (exceeds 1000)
                const allocations = [
                    { invoice_id: 'inv-1', amount: 600 },
                    { invoice_id: 'inv-2', amount: 500 }
                ];

                await expect(
                    PaymentService.allocatePayment(
                        paymentId,
                        allocations,
                        { businessId, userId },
                        mockClient
                    )
                ).rejects.toThrow(/Over-allocation prevented/);
            });
        });

        describe('Task 3.3: Customer/vendor matching validation', () => {
            it('should prevent allocating to invoice from different customer', async () => {
                // Mock payment for customer 'cust-1'
                mockQuery
                    .mockResolvedValueOnce({
                        rows: [{
                            id: paymentId,
                            amount: 1000,
                            customer_id: 'cust-1',
                            vendor_id: null,
                            payment_type: 'receipt',
                        }]
                    })
                    // Mock no existing allocations
                    .mockResolvedValueOnce({
                        rows: [{ allocated: 0 }]
                    })
                    // Mock invoice belonging to different customer 'cust-2'
                    .mockResolvedValueOnce({
                        rows: [{ customer_id: 'cust-2' }]
                    });

                const allocations = [
                    { invoice_id: 'inv-1', amount: 500 }
                ];

                await expect(
                    PaymentService.allocatePayment(
                        paymentId,
                        allocations,
                        { businessId, userId },
                        mockClient
                    )
                ).rejects.toThrow(/Customer mismatch/);
            });

            it('should allow allocating to invoice from same customer', async () => {
                // Mock payment for customer 'cust-1'
                mockQuery
                    .mockResolvedValueOnce({
                        rows: [{
                            id: paymentId,
                            amount: 1000,
                            customer_id: 'cust-1',
                            vendor_id: null,
                            payment_type: 'receipt',
                        }]
                    })
                    // Mock no existing allocations
                    .mockResolvedValueOnce({
                        rows: [{ allocated: 0 }]
                    })
                    // Mock invoice belonging to same customer 'cust-1'
                    .mockResolvedValueOnce({
                        rows: [{ customer_id: 'cust-1' }]
                    })
                    // Mock allocation insert
                    .mockResolvedValueOnce({
                        rows: [{
                            id: 'alloc-1',
                            payment_id: paymentId,
                            invoice_id: 'inv-1',
                            amount: 500
                        }]
                    })
                    // Mock paid amount calculation
                    .mockResolvedValueOnce({
                        rows: [{ paid: 500 }]
                    })
                    // Mock invoice total
                    .mockResolvedValueOnce({
                        rows: [{ grand_total: 1000 }]
                    })
                    // Mock invoice update
                    .mockResolvedValueOnce({ rows: [] });

                const allocations = [
                    { invoice_id: 'inv-1', amount: 500 }
                ];

                const result = await PaymentService.allocatePayment(
                    paymentId,
                    allocations,
                    { businessId, userId },
                    mockClient
                );

                expect(result.success).toBe(true);
            });

            it('should prevent allocating to purchase from different vendor', async () => {
                // Mock payment for vendor 'vend-1'
                mockQuery
                    .mockResolvedValueOnce({
                        rows: [{
                            id: paymentId,
                            amount: 1000,
                            customer_id: null,
                            vendor_id: 'vend-1',
                            payment_type: 'payment',
                        }]
                    })
                    // Mock no existing allocations
                    .mockResolvedValueOnce({
                        rows: [{ allocated: 0 }]
                    })
                    // Mock purchase belonging to different vendor 'vend-2'
                    .mockResolvedValueOnce({
                        rows: [{ vendor_id: 'vend-2' }]
                    });

                const allocations = [
                    { purchase_id: 'pur-1', amount: 500 }
                ];

                await expect(
                    PaymentService.allocatePayment(
                        paymentId,
                        allocations,
                        { businessId, userId },
                        mockClient
                    )
                ).rejects.toThrow(/Vendor mismatch/);
            });

            it('should allow allocating to purchase from same vendor', async () => {
                // Mock payment for vendor 'vend-1'
                mockQuery
                    .mockResolvedValueOnce({
                        rows: [{
                            id: paymentId,
                            amount: 1000,
                            customer_id: null,
                            vendor_id: 'vend-1',
                            payment_type: 'payment',
                        }]
                    })
                    // Mock no existing allocations
                    .mockResolvedValueOnce({
                        rows: [{ allocated: 0 }]
                    })
                    // Mock purchase belonging to same vendor 'vend-1'
                    .mockResolvedValueOnce({
                        rows: [{ vendor_id: 'vend-1' }]
                    })
                    // Mock allocation insert
                    .mockResolvedValueOnce({
                        rows: [{
                            id: 'alloc-1',
                            payment_id: paymentId,
                            purchase_id: 'pur-1',
                            amount: 500
                        }]
                    })
                    // Mock paid amount calculation
                    .mockResolvedValueOnce({
                        rows: [{ paid: 500 }]
                    })
                    // Mock purchase total
                    .mockResolvedValueOnce({
                        rows: [{ total_amount: 1000 }]
                    })
                    // Mock purchase update
                    .mockResolvedValueOnce({ rows: [] });

                const allocations = [
                    { purchase_id: 'pur-1', amount: 500 }
                ];

                const result = await PaymentService.allocatePayment(
                    paymentId,
                    allocations,
                    { businessId, userId },
                    mockClient
                );

                expect(result.success).toBe(true);
            });

            it('should validate all allocations before creating any', async () => {
                // Mock payment for customer 'cust-1'
                mockQuery
                    .mockResolvedValueOnce({
                        rows: [{
                            id: paymentId,
                            amount: 1000,
                            customer_id: 'cust-1',
                            vendor_id: null,
                            payment_type: 'receipt',
                        }]
                    })
                    // Mock no existing allocations
                    .mockResolvedValueOnce({
                        rows: [{ allocated: 0 }]
                    })
                    // Mock first invoice (correct customer)
                    .mockResolvedValueOnce({
                        rows: [{ customer_id: 'cust-1' }]
                    })
                    // Mock second invoice (wrong customer)
                    .mockResolvedValueOnce({
                        rows: [{ customer_id: 'cust-2' }]
                    });

                const allocations = [
                    { invoice_id: 'inv-1', amount: 300 },
                    { invoice_id: 'inv-2', amount: 400 }  // This one has wrong customer
                ];

                await expect(
                    PaymentService.allocatePayment(
                        paymentId,
                        allocations,
                        { businessId, userId },
                        mockClient
                    )
                ).rejects.toThrow(/Customer mismatch/);

                // Verify no allocations were created (transaction should rollback)
                // The insert query should never be called
                const insertCalls = mockQuery.mock.calls.filter(
                    call => call[0].includes('INSERT INTO payment_allocations')
                );
                expect(insertCalls.length).toBe(0);
            });
        });

        describe('Edge cases', () => {
            it('should throw error if payment not found', async () => {
                mockQuery.mockResolvedValueOnce({
                    rows: []  // No payment found
                });

                const allocations = [
                    { invoice_id: 'inv-1', amount: 500 }
                ];

                await expect(
                    PaymentService.allocatePayment(
                        paymentId,
                        allocations,
                        { businessId, userId },
                        mockClient
                    )
                ).rejects.toThrow('Payment not found');
            });

            it('should throw error if invoice not found', async () => {
                mockQuery
                    .mockResolvedValueOnce({
                        rows: [{
                            id: paymentId,
                            amount: 1000,
                            customer_id: 'cust-1',
                            vendor_id: null,
                            payment_type: 'receipt',
                        }]
                    })
                    .mockResolvedValueOnce({
                        rows: [{ allocated: 0 }]
                    })
                    .mockResolvedValueOnce({
                        rows: []  // Invoice not found
                    });

                const allocations = [
                    { invoice_id: 'inv-999', amount: 500 }
                ];

                await expect(
                    PaymentService.allocatePayment(
                        paymentId,
                        allocations,
                        { businessId, userId },
                        mockClient
                    )
                ).rejects.toThrow(/Invoice .* not found/);
            });

            it('should throw error if purchase not found', async () => {
                mockQuery
                    .mockResolvedValueOnce({
                        rows: [{
                            id: paymentId,
                            amount: 1000,
                            customer_id: null,
                            vendor_id: 'vend-1',
                            payment_type: 'payment',
                        }]
                    })
                    .mockResolvedValueOnce({
                        rows: [{ allocated: 0 }]
                    })
                    .mockResolvedValueOnce({
                        rows: []  // Purchase not found
                    });

                const allocations = [
                    { purchase_id: 'pur-999', amount: 500 }
                ];

                await expect(
                    PaymentService.allocatePayment(
                        paymentId,
                        allocations,
                        { businessId, userId },
                        mockClient
                    )
                ).rejects.toThrow(/Purchase .* not found/);
            });

            it('should update invoice payment_status to paid when fully allocated', async () => {
                mockQuery
                    .mockResolvedValueOnce({
                        rows: [{
                            id: paymentId,
                            amount: 1000,
                            customer_id: 'cust-1',
                            vendor_id: null,
                            payment_type: 'receipt',
                        }]
                    })
                    .mockResolvedValueOnce({
                        rows: [{ allocated: 0 }]
                    })
                    .mockResolvedValueOnce({
                        rows: [{ customer_id: 'cust-1' }]
                    })
                    .mockResolvedValueOnce({
                        rows: [{
                            id: 'alloc-1',
                            payment_id: paymentId,
                            invoice_id: 'inv-1',
                            amount: 1000
                        }]
                    })
                    .mockResolvedValueOnce({
                        rows: [{ paid: 1000 }]  // Total paid equals invoice total
                    })
                    .mockResolvedValueOnce({
                        rows: [{ grand_total: 1000 }]
                    })
                    .mockResolvedValueOnce({ rows: [] });

                const allocations = [
                    { invoice_id: 'inv-1', amount: 1000 }
                ];

                await PaymentService.allocatePayment(
                    paymentId,
                    allocations,
                    { businessId, userId },
                    mockClient
                );

                // Verify the update query sets payment_status to 'paid'
                const updateCall = mockQuery.mock.calls.find(
                    call => call[0].includes('UPDATE invoices') && call[0].includes('payment_status')
                );
                expect(updateCall).toBeDefined();
                expect(updateCall[1][0]).toBe('paid');
            });

            it('should update invoice payment_status to partial when partially allocated', async () => {
                mockQuery
                    .mockResolvedValueOnce({
                        rows: [{
                            id: paymentId,
                            amount: 1000,
                            customer_id: 'cust-1',
                            vendor_id: null,
                            payment_type: 'receipt',
                        }]
                    })
                    .mockResolvedValueOnce({
                        rows: [{ allocated: 0 }]
                    })
                    .mockResolvedValueOnce({
                        rows: [{ customer_id: 'cust-1' }]
                    })
                    .mockResolvedValueOnce({
                        rows: [{
                            id: 'alloc-1',
                            payment_id: paymentId,
                            invoice_id: 'inv-1',
                            amount: 500
                        }]
                    })
                    .mockResolvedValueOnce({
                        rows: [{ paid: 500 }]  // Partial payment
                    })
                    .mockResolvedValueOnce({
                        rows: [{ grand_total: 1000 }]
                    })
                    .mockResolvedValueOnce({ rows: [] });

                const allocations = [
                    { invoice_id: 'inv-1', amount: 500 }
                ];

                await PaymentService.allocatePayment(
                    paymentId,
                    allocations,
                    { businessId, userId },
                    mockClient
                );

                // Verify the update query sets payment_status to 'partial'
                const updateCall = mockQuery.mock.calls.find(
                    call => call[0].includes('UPDATE invoices') && call[0].includes('payment_status')
                );
                expect(updateCall).toBeDefined();
                expect(updateCall[1][0]).toBe('partial');
            });
        });
    });
});
