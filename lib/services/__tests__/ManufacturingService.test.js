import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * ManufacturingService Tests
 * 
 * Tests the manufacturing service methods including production order management
 * and material reservation workflows.
 */

// Mock dependencies
vi.mock('@/lib/db', () => ({
    default: {
        connect: vi.fn(),
    },
}));

vi.mock('../InventoryService', () => ({
    InventoryService: {
        getAvailableStock: vi.fn(),
        reserveStock: vi.fn(),
        removeStock: vi.fn(),
        addStock: vi.fn(),
        releaseStock: vi.fn(),
    },
}));

vi.mock('../AccountingService', () => ({
    AccountingService: {
        recordBusinessTransaction: vi.fn(),
    },
}));

vi.mock('@/lib/actions/_shared/audit', () => ({
    auditWrite: vi.fn(),
}));

vi.mock('@/lib/actions/premium/manufacturing', () => ({
    getBOMsAction: vi.fn(),
    createBOMAction: vi.fn(),
    getProductionOrdersAction: vi.fn(),
    createProductionOrderAction: vi.fn(),
    updateProductionOrderStatusAction: vi.fn(),
}));

import { ManufacturingService } from '../ManufacturingService';
import { InventoryService } from '../InventoryService';
import { AccountingService } from '../AccountingService';
import { auditWrite } from '@/lib/actions/_shared/audit';
import pool from '@/lib/db';

describe('ManufacturingService', () => {
    let mockClient;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup mock database client
        mockClient = {
            query: vi.fn(),
            release: vi.fn(),
        };

        pool.connect.mockResolvedValue(mockClient);
    });

    describe('startProduction', () => {
        const orderId = 'order-123';
        const context = {
            businessId: 'biz-1',
            userId: 'user-1',
        };

        const mockProductionOrder = {
            id: orderId,
            business_id: 'biz-1',
            product_id: 'prod-1',
            product_name: 'Widget A',
            bom_id: 'bom-1',
            warehouse_id: 'wh-1',
            quantity: 10,
            quantity_to_produce: 10,
            status: 'planned',
        };

        const mockMaterials = [
            {
                material_id: 'mat-1',
                material_name: 'Steel',
                unit_quantity: 2,
                unit: 'kg',
                cost_price: 50,
            },
            {
                material_id: 'mat-2',
                material_name: 'Plastic',
                unit_quantity: 1,
                unit: 'kg',
                cost_price: 30,
            },
        ];

        beforeEach(() => {
            // Mock production order query
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({ rows: [mockProductionOrder] });
                }
                if (query.includes('FROM bom_materials')) {
                    return Promise.resolve({ rows: mockMaterials });
                }
                if (query.includes('UPDATE production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, status: 'in_progress', start_date: '2026-01-15' }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            // Mock inventory availability checks
            InventoryService.getAvailableStock.mockResolvedValue({
                success: true,
                availableStock: 100,
                totalStock: 100,
                reservedStock: 0,
            });

            // Mock inventory reservations
            InventoryService.reserveStock.mockImplementation((params) => {
                return Promise.resolve({
                    id: `res-${params.product_id}`,
                    product_id: params.product_id,
                    quantity: params.quantity,
                    warehouse_id: params.warehouse_id,
                    status: 'active',
                });
            });
        });

        it('should successfully start production with valid order', async () => {
            const result = await ManufacturingService.startProduction(orderId, context);

            expect(result.success).toBe(true);
            expect(result.productionOrder.status).toBe('in_progress');
            expect(result.reservations).toHaveLength(2);
            expect(result.message).toContain('Reserved 2 materials');

            // Verify transaction was committed
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should check availability for all materials', async () => {
            await ManufacturingService.startProduction(orderId, context);

            // Should check availability for both materials
            expect(InventoryService.getAvailableStock).toHaveBeenCalledTimes(2);
            expect(InventoryService.getAvailableStock).toHaveBeenCalledWith('mat-1', 'biz-1', 'wh-1');
            expect(InventoryService.getAvailableStock).toHaveBeenCalledWith('mat-2', 'biz-1', 'wh-1');
        });

        it('should reserve correct quantities based on BOM and production quantity', async () => {
            await ManufacturingService.startProduction(orderId, context);

            // Material 1: 2 kg per unit * 10 units = 20 kg
            expect(InventoryService.reserveStock).toHaveBeenCalledWith(
                expect.objectContaining({
                    business_id: 'biz-1',
                    product_id: 'mat-1',
                    quantity: 20,
                    warehouse_id: 'wh-1',
                }),
                expect.any(Object)
            );

            // Material 2: 1 kg per unit * 10 units = 10 kg
            expect(InventoryService.reserveStock).toHaveBeenCalledWith(
                expect.objectContaining({
                    business_id: 'biz-1',
                    product_id: 'mat-2',
                    quantity: 10,
                    warehouse_id: 'wh-1',
                }),
                expect.any(Object)
            );
        });

        it('should throw error if order status is not "planned"', async () => {
            // Reset and setup specific mock for this test
            mockClient.query.mockReset();
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, status: 'in_progress' }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            await expect(ManufacturingService.startProduction(orderId, context)).rejects.toThrow(
                "Cannot start production: order status is 'in_progress', expected 'planned'"
            );

            // Verify transaction was rolled back
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });

        it('should throw error if order not found', async () => {
            // Reset and setup specific mock for this test
            mockClient.query.mockReset();
            mockClient.query.mockImplementation(() => Promise.resolve({ rows: [] }));

            await expect(ManufacturingService.startProduction(orderId, context)).rejects.toThrow(
                'Production order not found'
            );

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });

        it('should throw error if warehouse_id is missing', async () => {
            // Reset and setup specific mock for this test
            mockClient.query.mockReset();
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, warehouse_id: null }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            await expect(ManufacturingService.startProduction(orderId, context)).rejects.toThrow(
                'Production order missing warehouse_id for raw material sourcing'
            );
        });

        it('should throw error if BOM is missing', async () => {
            // Reset and setup specific mock for this test
            mockClient.query.mockReset();
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, bom_id: null }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            await expect(ManufacturingService.startProduction(orderId, context)).rejects.toThrow(
                'Production order missing bom_id'
            );
        });

        it('should throw error if BOM has no materials', async () => {
            mockClient.query.mockImplementation((query) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({ rows: [mockProductionOrder] });
                }
                if (query.includes('FROM bom_materials')) {
                    return Promise.resolve({ rows: [] });
                }
                return Promise.resolve({ rows: [] });
            });

            await expect(ManufacturingService.startProduction(orderId, context)).rejects.toThrow(
                'BOM has no materials defined'
            );
        });

        it('should throw error if insufficient materials available', async () => {
            // Mock insufficient stock for first material
            InventoryService.getAvailableStock.mockImplementation((productId) => {
                if (productId === 'mat-1') {
                    return Promise.resolve({
                        success: true,
                        availableStock: 5, // Need 20, only have 5
                        totalStock: 5,
                        reservedStock: 0,
                    });
                }
                return Promise.resolve({
                    success: true,
                    availableStock: 100,
                    totalStock: 100,
                    reservedStock: 0,
                });
            });

            await expect(ManufacturingService.startProduction(orderId, context)).rejects.toThrow(
                /Insufficient raw materials in warehouse.*Steel.*need 20.*have 5.*short 15/
            );

            // Should not reserve any materials if availability check fails
            expect(InventoryService.reserveStock).not.toHaveBeenCalled();
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });

        it('should update production order with reservation details in domain_data', async () => {
            await ManufacturingService.startProduction(orderId, context);

            // Find the UPDATE query call
            const updateCall = mockClient.query.mock.calls.find((call) =>
                call[0].includes('UPDATE production_orders')
            );

            expect(updateCall).toBeDefined();
            const domainData = JSON.parse(updateCall[1][0]);

            expect(domainData).toHaveProperty('material_reservations');
            expect(domainData.material_reservations).toHaveLength(2);
            expect(domainData).toHaveProperty('started_by', 'user-1');
            expect(domainData).toHaveProperty('started_at');
        });

        it('should write audit trail after successful start', async () => {
            await ManufacturingService.startProduction(orderId, context);

            expect(auditWrite).toHaveBeenCalledWith(
                expect.objectContaining({
                    businessId: 'biz-1',
                    userId: 'user-1',
                    action: 'update',
                    entityType: 'production_order',
                    entityId: orderId,
                    description: expect.stringContaining('Started production order'),
                    metadata: expect.objectContaining({
                        status_change: 'planned -> in_progress',
                        materials_reserved: 2,
                        warehouse_id: 'wh-1',
                        quantity: 10,
                    }),
                })
            );
        });

        it('should handle transaction client parameter', async () => {
            const externalClient = {
                query: vi.fn().mockImplementation(mockClient.query),
                release: vi.fn(),
            };

            // Mock the queries for external client
            externalClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({ rows: [mockProductionOrder] });
                }
                if (query.includes('FROM bom_materials')) {
                    return Promise.resolve({ rows: mockMaterials });
                }
                if (query.includes('UPDATE production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, status: 'in_progress' }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            await ManufacturingService.startProduction(orderId, context, externalClient);

            // Should not create new connection
            expect(pool.connect).not.toHaveBeenCalled();

            // Should not manage transaction (BEGIN/COMMIT)
            expect(externalClient.query).not.toHaveBeenCalledWith('BEGIN');
            expect(externalClient.query).not.toHaveBeenCalledWith('COMMIT');

            // Should not release connection
            expect(externalClient.release).not.toHaveBeenCalled();
        });

        it('should rollback transaction on any error', async () => {
            // Mock reservation failure
            InventoryService.reserveStock.mockRejectedValueOnce(new Error('Reservation failed'));

            await expect(ManufacturingService.startProduction(orderId, context)).rejects.toThrow(
                'Reservation failed'
            );

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });
    });

    describe('completeProduction', () => {
        const orderId = 'order-123';
        const actualQuantity = 10;
        const context = {
            businessId: 'biz-1',
            userId: 'user-1',
        };

        const mockProductionOrder = {
            id: orderId,
            business_id: 'biz-1',
            product_id: 'prod-1',
            product_name: 'Widget A',
            product_cost_price: 100,
            bom_id: 'bom-1',
            warehouse_id: 'wh-1',
            output_warehouse_id: 'wh-2',
            quantity: 10,
            quantity_to_produce: 10,
            status: 'in_progress',
            batch_number: 'BATCH-001',
            domain_data: {
                material_reservations: [
                    { reservation_id: 'res-mat-1', material_id: 'mat-1', quantity: 20 },
                    { reservation_id: 'res-mat-2', material_id: 'mat-2', quantity: 10 },
                ],
            },
        };

        const mockMaterials = [
            {
                material_id: 'mat-1',
                material_name: 'Steel',
                unit_quantity: 2,
                unit: 'kg',
                cost_price: 50,
            },
            {
                material_id: 'mat-2',
                material_name: 'Plastic',
                unit_quantity: 1,
                unit: 'kg',
                cost_price: 30,
            },
        ];

        beforeEach(() => {
            // Mock production order query
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({ rows: [mockProductionOrder] });
                }
                if (query.includes('FROM bom_materials')) {
                    return Promise.resolve({ rows: mockMaterials });
                }
                if (query.includes('UPDATE production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, status: 'completed' }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            // Mock InventoryService methods
            InventoryService.removeStock = vi.fn().mockResolvedValue({
                success: true,
                movementId: 'move-123',
                costOfGoodsSold: 100,
            });

            InventoryService.addStock = vi.fn().mockResolvedValue({
                success: true,
                movementId: 'move-456',
                newStock: 50,
            });

            InventoryService.releaseStock = vi.fn().mockResolvedValue({
                success: true,
            });

            // Mock AccountingService
            AccountingService.recordBusinessTransaction = vi.fn().mockResolvedValue({
                success: true,
                journalId: 'journal-123',
            });
        });

        it('should successfully complete production with valid order', async () => {
            const result = await ManufacturingService.completeProduction(orderId, actualQuantity, context);

            expect(result.success).toBe(true);
            expect(result.productionOrder.status).toBe('completed');
            expect(result.production.quantityProduced).toBe(10);
            expect(result.production.plannedQuantity).toBe(10);
            expect(result.production.variance).toBe(0);
            expect(result.materialsConsumed).toHaveLength(2);
            expect(result.finishedGoods.quantity).toBe(10);

            // Verify transaction was committed
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should consume raw materials with correct quantities', async () => {
            await ManufacturingService.completeProduction(orderId, actualQuantity, context);

            // Material 1: 2 kg per unit * 10 units = 20 kg
            expect(InventoryService.removeStock).toHaveBeenCalledWith(
                expect.objectContaining({
                    business_id: 'biz-1',
                    product_id: 'mat-1',
                    warehouse_id: 'wh-1',
                    quantity: 20,
                    reference_type: 'production',
                    reference_id: orderId,
                }),
                'user-1',
                expect.any(Object)
            );

            // Material 2: 1 kg per unit * 10 units = 10 kg
            expect(InventoryService.removeStock).toHaveBeenCalledWith(
                expect.objectContaining({
                    business_id: 'biz-1',
                    product_id: 'mat-2',
                    warehouse_id: 'wh-1',
                    quantity: 10,
                    reference_type: 'production',
                    reference_id: orderId,
                }),
                'user-1',
                expect.any(Object)
            );
        });

        it('should produce finished goods in output warehouse', async () => {
            await ManufacturingService.completeProduction(orderId, actualQuantity, context);

            expect(InventoryService.addStock).toHaveBeenCalledWith(
                expect.objectContaining({
                    business_id: 'biz-1',
                    product_id: 'prod-1',
                    warehouse_id: 'wh-2',
                    quantity: 10,
                    batch_number: 'BATCH-001',
                    reference_type: 'production',
                    reference_id: orderId,
                }),
                'user-1',
                expect.any(Object)
            );
        });

        it('should calculate production costs correctly', async () => {
            const result = await ManufacturingService.completeProduction(orderId, actualQuantity, context);

            // Total cost: (2 * 10 * 50) + (1 * 10 * 30) = 1000 + 300 = 1300
            expect(result.production.totalCost).toBe(1300);

            // Unit cost: 1300 / 10 = 130
            expect(result.production.unitCost).toBe(130);

            // Verify cost is passed to addStock
            expect(InventoryService.addStock).toHaveBeenCalledWith(
                expect.objectContaining({
                    cost_price: 130,
                }),
                expect.any(String),
                expect.any(Object)
            );
        });

        it('should handle actual quantity different from planned quantity', async () => {
            const result = await ManufacturingService.completeProduction(orderId, 8, context);

            expect(result.production.quantityProduced).toBe(8);
            expect(result.production.plannedQuantity).toBe(10);
            expect(result.production.variance).toBe(-2);

            // Material consumption should be based on actual quantity (8 units)
            expect(InventoryService.removeStock).toHaveBeenCalledWith(
                expect.objectContaining({
                    product_id: 'mat-1',
                    quantity: 16, // 2 * 8
                }),
                expect.any(String),
                expect.any(Object)
            );

            expect(InventoryService.removeStock).toHaveBeenCalledWith(
                expect.objectContaining({
                    product_id: 'mat-2',
                    quantity: 8, // 1 * 8
                }),
                expect.any(String),
                expect.any(Object)
            );
        });

        it('should release material reservations', async () => {
            await ManufacturingService.completeProduction(orderId, actualQuantity, context);

            expect(InventoryService.releaseStock).toHaveBeenCalledTimes(2);
            expect(InventoryService.releaseStock).toHaveBeenCalledWith(
                expect.objectContaining({
                    business_id: 'biz-1',
                    reservation_id: 'res-mat-1',
                }),
                expect.any(Object)
            );
            expect(InventoryService.releaseStock).toHaveBeenCalledWith(
                expect.objectContaining({
                    business_id: 'biz-1',
                    reservation_id: 'res-mat-2',
                }),
                expect.any(Object)
            );
        });

        it('should continue if reservation release fails', async () => {
            // Mock one reservation release to fail
            InventoryService.releaseStock.mockRejectedValueOnce(new Error('Reservation already released'));

            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const result = await ManufacturingService.completeProduction(orderId, actualQuantity, context);

            // Should still succeed
            expect(result.success).toBe(true);
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Failed to release reservation'),
                expect.any(String)
            );

            consoleWarnSpy.mockRestore();
        });

        it('should create GL entries via AccountingService', async () => {
            await ManufacturingService.completeProduction(orderId, actualQuantity, context);

            expect(AccountingService.recordBusinessTransaction).toHaveBeenCalledWith(
                'production',
                expect.objectContaining({
                    businessId: 'biz-1',
                    referenceId: orderId,
                    totalAmount: 1300,
                    netAmount: 1300,
                    description: expect.stringContaining('Production completed'),
                    userId: 'user-1',
                }),
                expect.any(Object)
            );
        });

        it('should update production order with completion data in domain_data', async () => {
            await ManufacturingService.completeProduction(orderId, actualQuantity, context);

            // Find the UPDATE query call
            const updateCall = mockClient.query.mock.calls.find((call) =>
                call[0].includes('UPDATE production_orders') && call[0].includes("status = 'completed'")
            );

            expect(updateCall).toBeDefined();
            const domainData = JSON.parse(updateCall[1][0]);

            expect(domainData).toHaveProperty('completed_by', 'user-1');
            expect(domainData).toHaveProperty('completed_at');
            expect(domainData).toHaveProperty('actual_quantity', 10);
            expect(domainData).toHaveProperty('planned_quantity', 10);
            expect(domainData).toHaveProperty('variance', 0);
            expect(domainData).toHaveProperty('total_cost', 1300);
            expect(domainData).toHaveProperty('unit_cost', 130);
            expect(domainData).toHaveProperty('materials_consumed');
            expect(domainData.materials_consumed).toHaveLength(2);
        });

        it('should write audit trail after successful completion', async () => {
            await ManufacturingService.completeProduction(orderId, actualQuantity, context);

            expect(auditWrite).toHaveBeenCalledWith(
                expect.objectContaining({
                    businessId: 'biz-1',
                    userId: 'user-1',
                    action: 'update',
                    entityType: 'production_order',
                    entityId: orderId,
                    description: expect.stringContaining('Completed production order'),
                    metadata: expect.objectContaining({
                        status_change: 'in_progress -> completed',
                        actual_quantity: 10,
                        planned_quantity: 10,
                        variance: 0,
                        total_cost: 1300,
                        unit_cost: 130,
                        materials_consumed: 2,
                        input_warehouse_id: 'wh-1',
                        output_warehouse_id: 'wh-2',
                    }),
                })
            );
        });

        it('should throw error if order status is not "in_progress"', async () => {
            mockClient.query.mockReset();
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, status: 'planned' }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            await expect(
                ManufacturingService.completeProduction(orderId, actualQuantity, context)
            ).rejects.toThrow("Cannot complete production: order status is 'planned', expected 'in_progress'");

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });

        it('should throw error if order not found', async () => {
            mockClient.query.mockReset();
            mockClient.query.mockImplementation(() => Promise.resolve({ rows: [] }));

            await expect(
                ManufacturingService.completeProduction(orderId, actualQuantity, context)
            ).rejects.toThrow('Production order not found');

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });

        it('should throw error if warehouse_id is missing', async () => {
            mockClient.query.mockReset();
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, warehouse_id: null }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            await expect(
                ManufacturingService.completeProduction(orderId, actualQuantity, context)
            ).rejects.toThrow('Production order missing warehouse_id for raw material consumption');
        });

        it('should throw error if output_warehouse_id is missing', async () => {
            mockClient.query.mockReset();
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, output_warehouse_id: null }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            await expect(
                ManufacturingService.completeProduction(orderId, actualQuantity, context)
            ).rejects.toThrow('Production order missing output_warehouse_id for finished goods');
        });

        it('should throw error if BOM is missing', async () => {
            mockClient.query.mockReset();
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, bom_id: null }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            await expect(
                ManufacturingService.completeProduction(orderId, actualQuantity, context)
            ).rejects.toThrow('Production order missing bom_id');
        });

        it('should throw error if product_id is missing', async () => {
            mockClient.query.mockReset();
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, product_id: null }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            await expect(
                ManufacturingService.completeProduction(orderId, actualQuantity, context)
            ).rejects.toThrow('Production order missing product_id');
        });

        it('should throw error if BOM has no materials', async () => {
            mockClient.query.mockImplementation((query) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({ rows: [mockProductionOrder] });
                }
                if (query.includes('FROM bom_materials')) {
                    return Promise.resolve({ rows: [] });
                }
                return Promise.resolve({ rows: [] });
            });

            await expect(
                ManufacturingService.completeProduction(orderId, actualQuantity, context)
            ).rejects.toThrow('BOM has no materials defined');
        });

        it('should handle transaction client parameter', async () => {
            const externalClient = {
                query: vi.fn().mockImplementation(mockClient.query),
                release: vi.fn(),
            };

            externalClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({ rows: [mockProductionOrder] });
                }
                if (query.includes('FROM bom_materials')) {
                    return Promise.resolve({ rows: mockMaterials });
                }
                if (query.includes('UPDATE production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, status: 'completed' }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            await ManufacturingService.completeProduction(orderId, actualQuantity, context, externalClient);

            // Should not create new connection
            expect(pool.connect).not.toHaveBeenCalled();

            // Should not manage transaction (BEGIN/COMMIT)
            expect(externalClient.query).not.toHaveBeenCalledWith('BEGIN');
            expect(externalClient.query).not.toHaveBeenCalledWith('COMMIT');

            // Should not release connection
            expect(externalClient.release).not.toHaveBeenCalled();
        });

        it('should rollback transaction on material consumption error', async () => {
            InventoryService.removeStock.mockRejectedValueOnce(new Error('Insufficient stock'));

            await expect(
                ManufacturingService.completeProduction(orderId, actualQuantity, context)
            ).rejects.toThrow('Insufficient stock');

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should rollback transaction on finished goods production error', async () => {
            InventoryService.addStock.mockRejectedValueOnce(new Error('Warehouse not found'));

            await expect(
                ManufacturingService.completeProduction(orderId, actualQuantity, context)
            ).rejects.toThrow('Warehouse not found');

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should handle zero quantity production', async () => {
            const result = await ManufacturingService.completeProduction(orderId, 0, context);

            expect(result.production.quantityProduced).toBe(0);
            expect(result.production.totalCost).toBe(0);
            expect(result.production.unitCost).toBe(0);

            // Should still consume materials (0 quantity)
            expect(InventoryService.removeStock).toHaveBeenCalledWith(
                expect.objectContaining({
                    quantity: 0,
                }),
                expect.any(String),
                expect.any(Object)
            );
        });

        it('should handle production order without batch_number', async () => {
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, batch_number: null }],
                    });
                }
                if (query.includes('FROM bom_materials')) {
                    return Promise.resolve({ rows: mockMaterials });
                }
                if (query.includes('UPDATE production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, status: 'completed', batch_number: null }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            const result = await ManufacturingService.completeProduction(orderId, actualQuantity, context);

            expect(result.success).toBe(true);

            // Should use orderId in notes when batch_number is missing
            expect(InventoryService.removeStock).toHaveBeenCalledWith(
                expect.objectContaining({
                    notes: expect.stringContaining(orderId),
                }),
                expect.any(String),
                expect.any(Object)
            );
        });

        it('should handle production order without reservations in domain_data', async () => {
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, domain_data: {} }],
                    });
                }
                if (query.includes('FROM bom_materials')) {
                    return Promise.resolve({ rows: mockMaterials });
                }
                if (query.includes('UPDATE production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, status: 'completed' }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            const result = await ManufacturingService.completeProduction(orderId, actualQuantity, context);

            expect(result.success).toBe(true);

            // Should not attempt to release reservations
            expect(InventoryService.releaseStock).not.toHaveBeenCalled();
        });
    });

    describe('cancelProduction', () => {
        const orderId = 'order-123';
        const reason = 'Customer cancelled order';
        const context = {
            businessId: 'biz-1',
            userId: 'user-1',
        };

        const mockProductionOrder = {
            id: orderId,
            business_id: 'biz-1',
            product_id: 'prod-1',
            product_name: 'Widget A',
            bom_id: 'bom-1',
            warehouse_id: 'wh-1',
            quantity: 10,
            quantity_to_produce: 10,
            status: 'planned',
            batch_number: 'BATCH-001',
            domain_data: {
                material_reservations: [
                    {
                        reservation_id: 'res-mat-1',
                        material_id: 'mat-1',
                        material_name: 'Steel',
                        quantity: 20,
                    },
                    {
                        reservation_id: 'res-mat-2',
                        material_id: 'mat-2',
                        material_name: 'Plastic',
                        quantity: 10,
                    },
                ],
            },
        };

        beforeEach(() => {
            // Mock production order query
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({ rows: [mockProductionOrder] });
                }
                if (query.includes('UPDATE production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, status: 'cancelled' }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            // Mock InventoryService.releaseStock
            InventoryService.releaseStock = vi.fn().mockResolvedValue({
                success: true,
            });
        });

        it('should successfully cancel production with valid order', async () => {
            const result = await ManufacturingService.cancelProduction(orderId, reason, context);

            expect(result.success).toBe(true);
            expect(result.productionOrder.status).toBe('cancelled');
            expect(result.cancellation.reason).toBe(reason);
            expect(result.cancellation.previousStatus).toBe('planned');
            expect(result.cancellation.reservationsReleased).toBe(2);
            expect(result.message).toContain('Released 2 material reservations');

            // Verify transaction was committed
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should release all material reservations', async () => {
            await ManufacturingService.cancelProduction(orderId, reason, context);

            expect(InventoryService.releaseStock).toHaveBeenCalledTimes(2);
            expect(InventoryService.releaseStock).toHaveBeenCalledWith(
                expect.objectContaining({
                    business_id: 'biz-1',
                    reservation_id: 'res-mat-1',
                }),
                expect.any(Object)
            );
            expect(InventoryService.releaseStock).toHaveBeenCalledWith(
                expect.objectContaining({
                    business_id: 'biz-1',
                    reservation_id: 'res-mat-2',
                }),
                expect.any(Object)
            );
        });

        it('should update production order with cancellation details in domain_data', async () => {
            await ManufacturingService.cancelProduction(orderId, reason, context);

            // Find the UPDATE query call
            const updateCall = mockClient.query.mock.calls.find((call) =>
                call[0].includes('UPDATE production_orders') && call[0].includes("status = 'cancelled'")
            );

            expect(updateCall).toBeDefined();
            const domainData = JSON.parse(updateCall[1][0]);

            expect(domainData).toHaveProperty('cancelled_by', 'user-1');
            expect(domainData).toHaveProperty('cancelled_at');
            expect(domainData).toHaveProperty('cancellation_reason', reason);
            expect(domainData).toHaveProperty('previous_status', 'planned');
            expect(domainData).toHaveProperty('reservations_released');
            expect(domainData.reservations_released).toHaveLength(2);
        });

        it('should write audit trail after successful cancellation', async () => {
            await ManufacturingService.cancelProduction(orderId, reason, context);

            expect(auditWrite).toHaveBeenCalledWith(
                expect.objectContaining({
                    businessId: 'biz-1',
                    userId: 'user-1',
                    action: 'update',
                    entityType: 'production_order',
                    entityId: orderId,
                    description: expect.stringContaining('Cancelled production order'),
                    description: expect.stringContaining(reason),
                    metadata: expect.objectContaining({
                        status_change: 'planned -> cancelled',
                        cancellation_reason: reason,
                        reservations_released: 2,
                        reservations_failed: 0,
                        batch_number: 'BATCH-001',
                        quantity: 10,
                    }),
                })
            );
        });

        it('should throw error if order not found', async () => {
            mockClient.query.mockReset();
            mockClient.query.mockImplementation(() => Promise.resolve({ rows: [] }));

            await expect(ManufacturingService.cancelProduction(orderId, reason, context)).rejects.toThrow(
                'Production order not found'
            );

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });

        it('should throw error if order is already completed', async () => {
            mockClient.query.mockReset();
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, status: 'completed' }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            await expect(ManufacturingService.cancelProduction(orderId, reason, context)).rejects.toThrow(
                'Cannot cancel production: order is already completed'
            );

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });

        it('should throw error if order is already cancelled', async () => {
            mockClient.query.mockReset();
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, status: 'cancelled' }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            await expect(ManufacturingService.cancelProduction(orderId, reason, context)).rejects.toThrow(
                'Production order is already cancelled'
            );

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });

        it('should throw error if reason is missing', async () => {
            await expect(ManufacturingService.cancelProduction(orderId, '', context)).rejects.toThrow(
                'Cancellation reason is required'
            );

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });

        it('should throw error if reason is only whitespace', async () => {
            await expect(ManufacturingService.cancelProduction(orderId, '   ', context)).rejects.toThrow(
                'Cancellation reason is required'
            );

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });

        it('should continue if reservation release fails', async () => {
            // Mock one reservation release to fail
            InventoryService.releaseStock
                .mockResolvedValueOnce({ success: true })
                .mockRejectedValueOnce(new Error('Reservation already released'));

            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const result = await ManufacturingService.cancelProduction(orderId, reason, context);

            // Should still succeed
            expect(result.success).toBe(true);
            expect(result.cancellation.reservationsReleased).toBe(1);
            expect(result.cancellation.reservationsFailed).toBe(1);
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Failed to release reservation'),
                expect.any(String)
            );

            consoleWarnSpy.mockRestore();
        });

        it('should handle production order without reservations in domain_data', async () => {
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, domain_data: {} }],
                    });
                }
                if (query.includes('UPDATE production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, status: 'cancelled' }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            const result = await ManufacturingService.cancelProduction(orderId, reason, context);

            expect(result.success).toBe(true);
            expect(result.cancellation.reservationsReleased).toBe(0);

            // Should not attempt to release reservations
            expect(InventoryService.releaseStock).not.toHaveBeenCalled();
        });

        it('should handle production order with null domain_data', async () => {
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, domain_data: null }],
                    });
                }
                if (query.includes('UPDATE production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, status: 'cancelled' }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            const result = await ManufacturingService.cancelProduction(orderId, reason, context);

            expect(result.success).toBe(true);
            expect(result.cancellation.reservationsReleased).toBe(0);

            // Should not attempt to release reservations
            expect(InventoryService.releaseStock).not.toHaveBeenCalled();
        });

        it('should allow cancellation from in_progress status', async () => {
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, status: 'in_progress' }],
                    });
                }
                if (query.includes('UPDATE production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, status: 'cancelled' }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            const result = await ManufacturingService.cancelProduction(orderId, reason, context);

            expect(result.success).toBe(true);
            expect(result.cancellation.previousStatus).toBe('in_progress');
        });

        it('should handle transaction client parameter', async () => {
            const externalClient = {
                query: vi.fn().mockImplementation(mockClient.query),
                release: vi.fn(),
            };

            externalClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({ rows: [mockProductionOrder] });
                }
                if (query.includes('UPDATE production_orders')) {
                    return Promise.resolve({
                        rows: [{ ...mockProductionOrder, status: 'cancelled' }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            await ManufacturingService.cancelProduction(orderId, reason, context, externalClient);

            // Should not create new connection
            expect(pool.connect).not.toHaveBeenCalled();

            // Should not manage transaction (BEGIN/COMMIT)
            expect(externalClient.query).not.toHaveBeenCalledWith('BEGIN');
            expect(externalClient.query).not.toHaveBeenCalledWith('COMMIT');

            // Should not release connection
            expect(externalClient.release).not.toHaveBeenCalled();
        });

        it('should rollback transaction on any error', async () => {
            // Mock database error during update
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM production_orders')) {
                    return Promise.resolve({ rows: [mockProductionOrder] });
                }
                if (query.includes('UPDATE production_orders')) {
                    return Promise.reject(new Error('Database error'));
                }
                return Promise.resolve({ rows: [] });
            });

            await expect(ManufacturingService.cancelProduction(orderId, reason, context)).rejects.toThrow(
                'Database error'
            );

            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should trim whitespace from reason', async () => {
            const reasonWithWhitespace = '  Customer cancelled order  ';
            await ManufacturingService.cancelProduction(orderId, reasonWithWhitespace, context);

            // Find the UPDATE query call
            const updateCall = mockClient.query.mock.calls.find((call) =>
                call[0].includes('UPDATE production_orders') && call[0].includes("status = 'cancelled'")
            );

            expect(updateCall).toBeDefined();
            const domainData = JSON.parse(updateCall[1][0]);

            expect(domainData.cancellation_reason).toBe('Customer cancelled order');
        });

        it('should include released reservations details in result', async () => {
            const result = await ManufacturingService.cancelProduction(orderId, reason, context);

            expect(result.releasedReservations).toHaveLength(2);
            expect(result.releasedReservations[0]).toMatchObject({
                reservation_id: 'res-mat-1',
                material_id: 'mat-1',
                material_name: 'Steel',
                quantity: 20,
                released: true,
            });
            expect(result.releasedReservations[1]).toMatchObject({
                reservation_id: 'res-mat-2',
                material_id: 'mat-2',
                material_name: 'Plastic',
                quantity: 10,
                released: true,
            });
        });

        it('should include failed reservation details in result', async () => {
            // Mock one reservation release to fail
            InventoryService.releaseStock
                .mockResolvedValueOnce({ success: true })
                .mockRejectedValueOnce(new Error('Reservation expired'));

            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const result = await ManufacturingService.cancelProduction(orderId, reason, context);

            expect(result.releasedReservations).toHaveLength(2);
            expect(result.releasedReservations[0].released).toBe(true);
            expect(result.releasedReservations[1].released).toBe(false);
            expect(result.releasedReservations[1].error).toBe('Reservation expired');

            consoleWarnSpy.mockRestore();
        });
    });

    describe('explodeBOM', () => {
        const bomId = 'bom-123';
        const businessId = 'biz-1';
        const quantity = 10;

        const mockBOM = {
            id: bomId,
            product_id: 'prod-1',
            product_name: 'Widget A',
        };

        const mockMaterials = [
            {
                bom_material_id: 'bm-1',
                material_id: 'mat-1',
                material_name: 'Steel',
                sku: 'STL-001',
                unit_quantity: 2,
                unit: 'kg',
                cost_price: 50,
                available_stock: 100,
                product_unit: 'kg',
            },
            {
                bom_material_id: 'bm-2',
                material_id: 'mat-2',
                material_name: 'Plastic',
                sku: 'PLS-001',
                unit_quantity: 1,
                unit: 'kg',
                cost_price: 30,
                available_stock: 50,
                product_unit: 'kg',
            },
            {
                bom_material_id: 'bm-3',
                material_id: 'mat-3',
                material_name: 'Screws',
                sku: 'SCR-001',
                unit_quantity: 10,
                unit: 'pcs',
                cost_price: 0.5,
                available_stock: 500,
                product_unit: 'pcs',
            },
        ];

        beforeEach(() => {
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM boms')) {
                    return Promise.resolve({ rows: [mockBOM] });
                }
                if (query.includes('FROM bom_materials')) {
                    return Promise.resolve({ rows: mockMaterials });
                }
                return Promise.resolve({ rows: [] });
            });
        });

        it('should successfully explode BOM with valid inputs', async () => {
            const result = await ManufacturingService.explodeBOM(bomId, quantity, businessId);

            expect(result.success).toBe(true);
            expect(result.bom.id).toBe(bomId);
            expect(result.bom.product_name).toBe('Widget A');
            expect(result.productionQuantity).toBe(10);
            expect(result.materials).toHaveLength(3);
            expect(result.totalMaterials).toBe(3);
            expect(result.canProduce).toBe(true);
        });

        it('should scale material quantities correctly', async () => {
            const result = await ManufacturingService.explodeBOM(bomId, quantity, businessId);

            // Material 1: 2 kg per unit * 10 units = 20 kg
            expect(result.materials[0]).toMatchObject({
                material_id: 'mat-1',
                material_name: 'Steel',
                unit_quantity: 2,
                required_quantity: 20,
                unit: 'kg',
            });

            // Material 2: 1 kg per unit * 10 units = 10 kg
            expect(result.materials[1]).toMatchObject({
                material_id: 'mat-2',
                material_name: 'Plastic',
                unit_quantity: 1,
                required_quantity: 10,
                unit: 'kg',
            });

            // Material 3: 10 pcs per unit * 10 units = 100 pcs
            expect(result.materials[2]).toMatchObject({
                material_id: 'mat-3',
                material_name: 'Screws',
                unit_quantity: 10,
                required_quantity: 100,
                unit: 'pcs',
            });
        });

        it('should calculate material costs correctly', async () => {
            const result = await ManufacturingService.explodeBOM(bomId, quantity, businessId);

            // Material 1: 20 kg * $50 = $1000
            expect(result.materials[0].cost_price).toBe(50);
            expect(result.materials[0].total_cost).toBe(1000);

            // Material 2: 10 kg * $30 = $300
            expect(result.materials[1].cost_price).toBe(30);
            expect(result.materials[1].total_cost).toBe(300);

            // Material 3: 100 pcs * $0.5 = $50
            expect(result.materials[2].cost_price).toBe(0.5);
            expect(result.materials[2].total_cost).toBe(50);

            // Total: $1000 + $300 + $50 = $1350
            expect(result.totalEstimatedCost).toBe(1350);
        });

        it('should identify materials with sufficient stock', async () => {
            const result = await ManufacturingService.explodeBOM(bomId, quantity, businessId);

            // All materials have sufficient stock
            expect(result.materials[0].is_sufficient).toBe(true);
            expect(result.materials[0].shortage).toBe(0);

            expect(result.materials[1].is_sufficient).toBe(true);
            expect(result.materials[1].shortage).toBe(0);

            expect(result.materials[2].is_sufficient).toBe(true);
            expect(result.materials[2].shortage).toBe(0);

            expect(result.insufficientMaterials).toBe(0);
            expect(result.canProduce).toBe(true);
            expect(result.message).toBe('All materials are available for production');
        });

        it('should identify materials with insufficient stock', async () => {
            // Mock insufficient stock for some materials
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM boms')) {
                    return Promise.resolve({ rows: [mockBOM] });
                }
                if (query.includes('FROM bom_materials')) {
                    return Promise.resolve({
                        rows: [
                            { ...mockMaterials[0], available_stock: 15 }, // Need 20, have 15
                            { ...mockMaterials[1], available_stock: 5 }, // Need 10, have 5
                            mockMaterials[2], // Sufficient
                        ],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            const result = await ManufacturingService.explodeBOM(bomId, quantity, businessId);

            // Material 1: insufficient
            expect(result.materials[0].is_sufficient).toBe(false);
            expect(result.materials[0].shortage).toBe(5); // 20 - 15

            // Material 2: insufficient
            expect(result.materials[1].is_sufficient).toBe(false);
            expect(result.materials[1].shortage).toBe(5); // 10 - 5

            // Material 3: sufficient
            expect(result.materials[2].is_sufficient).toBe(true);
            expect(result.materials[2].shortage).toBe(0);

            expect(result.insufficientMaterials).toBe(2);
            expect(result.canProduce).toBe(false);
            expect(result.message).toBe('2 material(s) have insufficient stock');
        });

        it('should handle BOM with no materials', async () => {
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM boms')) {
                    return Promise.resolve({ rows: [mockBOM] });
                }
                if (query.includes('FROM bom_materials')) {
                    return Promise.resolve({ rows: [] });
                }
                return Promise.resolve({ rows: [] });
            });

            const result = await ManufacturingService.explodeBOM(bomId, quantity, businessId);

            expect(result.success).toBe(true);
            expect(result.materials).toHaveLength(0);
            expect(result.totalMaterials).toBe(0);
            expect(result.totalEstimatedCost).toBe(0);
            expect(result.message).toBe('BOM has no materials defined');
        });

        it('should handle materials with null cost_price', async () => {
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM boms')) {
                    return Promise.resolve({ rows: [mockBOM] });
                }
                if (query.includes('FROM bom_materials')) {
                    return Promise.resolve({
                        rows: [{ ...mockMaterials[0], cost_price: null }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            const result = await ManufacturingService.explodeBOM(bomId, quantity, businessId);

            expect(result.materials[0].cost_price).toBe(0);
            expect(result.materials[0].total_cost).toBe(0);
            expect(result.totalEstimatedCost).toBe(0);
        });

        it('should handle materials with null available_stock', async () => {
            mockClient.query.mockImplementation((query, params) => {
                if (query.includes('FROM boms')) {
                    return Promise.resolve({ rows: [mockBOM] });
                }
                if (query.includes('FROM bom_materials')) {
                    return Promise.resolve({
                        rows: [{ ...mockMaterials[0], available_stock: null }],
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            const result = await ManufacturingService.explodeBOM(bomId, quantity, businessId);

            expect(result.materials[0].available_stock).toBe(0);
            expect(result.materials[0].is_sufficient).toBe(false);
            expect(result.materials[0].shortage).toBe(20); // Need 20, have 0
        });

        it('should throw error if BOM ID is missing', async () => {
            await expect(ManufacturingService.explodeBOM(null, quantity, businessId)).rejects.toThrow(
                'BOM ID is required'
            );
        });

        it('should throw error if business ID is missing', async () => {
            await expect(ManufacturingService.explodeBOM(bomId, quantity, null)).rejects.toThrow(
                'Business ID is required'
            );
        });

        it('should throw error if quantity is zero', async () => {
            await expect(ManufacturingService.explodeBOM(bomId, 0, businessId)).rejects.toThrow(
                'Production quantity must be a positive number'
            );
        });

        it('should throw error if quantity is negative', async () => {
            await expect(ManufacturingService.explodeBOM(bomId, -5, businessId)).rejects.toThrow(
                'Production quantity must be a positive number'
            );
        });

        it('should throw error if quantity is not a number', async () => {
            await expect(ManufacturingService.explodeBOM(bomId, 'invalid', businessId)).rejects.toThrow(
                'Production quantity must be a positive number'
            );
        });

        it('should throw error if BOM not found', async () => {
            mockClient.query.mockImplementation(() => Promise.resolve({ rows: [] }));

            await expect(ManufacturingService.explodeBOM(bomId, quantity, businessId)).rejects.toThrow(
                'BOM not found'
            );
        });

        it('should include material details (name, SKU, unit, cost)', async () => {
            const result = await ManufacturingService.explodeBOM(bomId, quantity, businessId);

            expect(result.materials[0]).toMatchObject({
                material_id: 'mat-1',
                material_name: 'Steel',
                sku: 'STL-001',
                unit: 'kg',
                cost_price: 50,
            });

            expect(result.materials[1]).toMatchObject({
                material_id: 'mat-2',
                material_name: 'Plastic',
                sku: 'PLS-001',
                unit: 'kg',
                cost_price: 30,
            });
        });

        it('should handle fractional quantities correctly', async () => {
            const result = await ManufacturingService.explodeBOM(bomId, 2.5, businessId);

            // Material 1: 2 kg per unit * 2.5 units = 5 kg
            expect(result.materials[0].required_quantity).toBe(5);

            // Material 2: 1 kg per unit * 2.5 units = 2.5 kg
            expect(result.materials[1].required_quantity).toBe(2.5);

            // Material 3: 10 pcs per unit * 2.5 units = 25 pcs
            expect(result.materials[2].required_quantity).toBe(25);
        });

        it('should release database connection after completion', async () => {
            await ManufacturingService.explodeBOM(bomId, quantity, businessId);

            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should release database connection on error', async () => {
            mockClient.query.mockRejectedValueOnce(new Error('Database error'));

            await expect(ManufacturingService.explodeBOM(bomId, quantity, businessId)).rejects.toThrow(
                'Database error'
            );

            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should sort materials by name', async () => {
            const result = await ManufacturingService.explodeBOM(bomId, quantity, businessId);

            // Materials should be sorted alphabetically by name
            expect(result.materials[0].material_name).toBe('Steel');
            expect(result.materials[1].material_name).toBe('Plastic');
            expect(result.materials[2].material_name).toBe('Screws');
        });
    });
});
