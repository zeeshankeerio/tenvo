import { describe, it, expect } from 'vitest';
import { parsePagination, buildPaginationMeta } from '../pagination';

/**
 * Pagination Utilities Tests
 * 
 * Tests pagination parameter parsing and metadata building including:
 * - Default values for all parameters
 * - Input validation and sanitization
 * - Boundary conditions (min/max values)
 * - Offset calculation
 * - Sort parameter handling
 * - Error handling for invalid inputs
 */

describe('Pagination Utilities', () => {
    describe('parsePagination', () => {
        describe('default values', () => {
            it('should return default values when no params provided', () => {
                const searchParams = new URLSearchParams();
                const result = parsePagination(searchParams);

                expect(result).toEqual({
                    page: 1,
                    limit: 50,
                    offset: 0,
                    sortBy: 'created_at',
                    sortOrder: 'DESC',
                });
            });

            it('should use default page when page param is missing', () => {
                const searchParams = new URLSearchParams('limit=25');
                const result = parsePagination(searchParams);

                expect(result.page).toBe(1);
                expect(result.offset).toBe(0);
            });

            it('should use default limit when limit param is missing', () => {
                const searchParams = new URLSearchParams('page=2');
                const result = parsePagination(searchParams);

                expect(result.limit).toBe(50);
            });

            it('should use default sortBy when sortBy param is missing', () => {
                const searchParams = new URLSearchParams('page=1');
                const result = parsePagination(searchParams);

                expect(result.sortBy).toBe('created_at');
            });

            it('should use default sortOrder when sortOrder param is missing', () => {
                const searchParams = new URLSearchParams('page=1');
                const result = parsePagination(searchParams);

                expect(result.sortOrder).toBe('DESC');
            });
        });

        describe('page parameter', () => {
            it('should parse valid page number', () => {
                const searchParams = new URLSearchParams('page=5');
                const result = parsePagination(searchParams);

                expect(result.page).toBe(5);
            });

            it('should enforce minimum page value of 1', () => {
                const searchParams = new URLSearchParams('page=0');
                const result = parsePagination(searchParams);

                expect(result.page).toBe(1);
            });

            it('should enforce minimum page value for negative numbers', () => {
                const searchParams = new URLSearchParams('page=-5');
                const result = parsePagination(searchParams);

                expect(result.page).toBe(1);
            });

            it('should default to 1 for invalid page values', () => {
                const searchParams = new URLSearchParams('page=invalid');
                const result = parsePagination(searchParams);

                expect(result.page).toBe(1);
            });

            it('should handle decimal page numbers by truncating', () => {
                const searchParams = new URLSearchParams('page=3.7');
                const result = parsePagination(searchParams);

                expect(result.page).toBe(3);
            });

            it('should handle large page numbers', () => {
                const searchParams = new URLSearchParams('page=999999');
                const result = parsePagination(searchParams);

                expect(result.page).toBe(999999);
            });
        });

        describe('limit parameter', () => {
            it('should parse valid limit number', () => {
                const searchParams = new URLSearchParams('limit=25');
                const result = parsePagination(searchParams);

                expect(result.limit).toBe(25);
            });

            it('should support pageSize as alias for limit', () => {
                const searchParams = new URLSearchParams('pageSize=30');
                const result = parsePagination(searchParams);

                expect(result.limit).toBe(30);
            });

            it('should prefer limit over pageSize when both provided', () => {
                const searchParams = new URLSearchParams('limit=25&pageSize=30');
                const result = parsePagination(searchParams);

                expect(result.limit).toBe(25);
            });

            it('should enforce minimum limit value of 1', () => {
                const searchParams = new URLSearchParams('limit=0');
                const result = parsePagination(searchParams);

                expect(result.limit).toBe(1);
            });

            it('should enforce minimum limit for negative numbers', () => {
                const searchParams = new URLSearchParams('limit=-10');
                const result = parsePagination(searchParams);

                expect(result.limit).toBe(1);
            });

            it('should enforce maximum limit value of 100', () => {
                const searchParams = new URLSearchParams('limit=200');
                const result = parsePagination(searchParams);

                expect(result.limit).toBe(100);
            });

            it('should enforce maximum limit for very large numbers', () => {
                const searchParams = new URLSearchParams('limit=999999');
                const result = parsePagination(searchParams);

                expect(result.limit).toBe(100);
            });

            it('should default to 1 for invalid limit values', () => {
                const searchParams = new URLSearchParams('limit=invalid');
                const result = parsePagination(searchParams);

                expect(result.limit).toBe(1);
            });

            it('should handle decimal limit numbers by truncating', () => {
                const searchParams = new URLSearchParams('limit=25.9');
                const result = parsePagination(searchParams);

                expect(result.limit).toBe(25);
            });

            it('should accept limit at maximum boundary', () => {
                const searchParams = new URLSearchParams('limit=100');
                const result = parsePagination(searchParams);

                expect(result.limit).toBe(100);
            });

            it('should accept limit at minimum boundary', () => {
                const searchParams = new URLSearchParams('limit=1');
                const result = parsePagination(searchParams);

                expect(result.limit).toBe(1);
            });
        });

        describe('offset calculation', () => {
            it('should calculate offset correctly for page 1', () => {
                const searchParams = new URLSearchParams('page=1&limit=25');
                const result = parsePagination(searchParams);

                expect(result.offset).toBe(0);
            });

            it('should calculate offset correctly for page 2', () => {
                const searchParams = new URLSearchParams('page=2&limit=25');
                const result = parsePagination(searchParams);

                expect(result.offset).toBe(25);
            });

            it('should calculate offset correctly for page 3', () => {
                const searchParams = new URLSearchParams('page=3&limit=50');
                const result = parsePagination(searchParams);

                expect(result.offset).toBe(100);
            });

            it('should calculate offset correctly for large page numbers', () => {
                const searchParams = new URLSearchParams('page=10&limit=20');
                const result = parsePagination(searchParams);

                expect(result.offset).toBe(180);
            });

            it('should calculate offset with default limit', () => {
                const searchParams = new URLSearchParams('page=3');
                const result = parsePagination(searchParams);

                expect(result.offset).toBe(100); // (3-1) * 50
            });

            it('should calculate offset with limit of 1', () => {
                const searchParams = new URLSearchParams('page=5&limit=1');
                const result = parsePagination(searchParams);

                expect(result.offset).toBe(4);
            });
        });

        describe('sortBy parameter', () => {
            it('should parse valid sortBy field', () => {
                const searchParams = new URLSearchParams('sortBy=amount');
                const result = parsePagination(searchParams);

                expect(result.sortBy).toBe('amount');
            });

            it('should allow underscores in sortBy field', () => {
                const searchParams = new URLSearchParams('sortBy=invoice_date');
                const result = parsePagination(searchParams);

                expect(result.sortBy).toBe('invoice_date');
            });

            it('should allow alphanumeric characters in sortBy field', () => {
                const searchParams = new URLSearchParams('sortBy=field123');
                const result = parsePagination(searchParams);

                expect(result.sortBy).toBe('field123');
            });

            it('should sanitize sortBy to prevent SQL injection', () => {
                const searchParams = new URLSearchParams('sortBy=amount; DROP TABLE users;');
                const result = parsePagination(searchParams);

                expect(result.sortBy).toBe('amountDROPTABLEusers');
                expect(result.sortBy).not.toContain(';');
                expect(result.sortBy).not.toContain(' ');
            });

            it('should remove special characters from sortBy', () => {
                const searchParams = new URLSearchParams('sortBy=amount-total');
                const result = parsePagination(searchParams);

                expect(result.sortBy).toBe('amounttotal');
                expect(result.sortBy).not.toContain('-');
            });

            it('should remove parentheses from sortBy', () => {
                const searchParams = new URLSearchParams('sortBy=COUNT(*)');
                const result = parsePagination(searchParams);

                expect(result.sortBy).toBe('COUNT');
                expect(result.sortBy).not.toContain('(');
                expect(result.sortBy).not.toContain(')');
                expect(result.sortBy).not.toContain('*');
            });

            it('should handle empty sortBy after sanitization', () => {
                const searchParams = new URLSearchParams('sortBy=---');
                const result = parsePagination(searchParams);

                expect(result.sortBy).toBe('');
            });
        });

        describe('sortOrder parameter', () => {
            it('should parse ASC sort order', () => {
                const searchParams = new URLSearchParams('sortOrder=ASC');
                const result = parsePagination(searchParams);

                expect(result.sortOrder).toBe('ASC');
            });

            it('should parse DESC sort order', () => {
                const searchParams = new URLSearchParams('sortOrder=DESC');
                const result = parsePagination(searchParams);

                expect(result.sortOrder).toBe('DESC');
            });

            it('should handle lowercase asc', () => {
                const searchParams = new URLSearchParams('sortOrder=asc');
                const result = parsePagination(searchParams);

                expect(result.sortOrder).toBe('ASC');
            });

            it('should handle lowercase desc', () => {
                const searchParams = new URLSearchParams('sortOrder=desc');
                const result = parsePagination(searchParams);

                expect(result.sortOrder).toBe('DESC');
            });

            it('should handle mixed case ASC', () => {
                const searchParams = new URLSearchParams('sortOrder=AsC');
                const result = parsePagination(searchParams);

                expect(result.sortOrder).toBe('ASC');
            });

            it('should default to DESC for invalid sort order', () => {
                const searchParams = new URLSearchParams('sortOrder=INVALID');
                const result = parsePagination(searchParams);

                expect(result.sortOrder).toBe('DESC');
            });

            it('should default to DESC for empty sort order', () => {
                const searchParams = new URLSearchParams('sortOrder=');
                const result = parsePagination(searchParams);

                expect(result.sortOrder).toBe('DESC');
            });

            it('should reject partial matches', () => {
                const searchParams = new URLSearchParams('sortOrder=ASCENDING');
                const result = parsePagination(searchParams);

                expect(result.sortOrder).toBe('DESC');
            });
        });

        describe('combined parameters', () => {
            it('should parse all parameters together', () => {
                const searchParams = new URLSearchParams(
                    'page=3&limit=25&sortBy=amount&sortOrder=ASC'
                );
                const result = parsePagination(searchParams);

                expect(result).toEqual({
                    page: 3,
                    limit: 25,
                    offset: 50,
                    sortBy: 'amount',
                    sortOrder: 'ASC',
                });
            });

            it('should handle URL with all parameters', () => {
                const url = new URL(
                    'https://api.example.com/invoices?page=2&limit=20&sortBy=invoice_date&sortOrder=DESC'
                );
                const result = parsePagination(url.searchParams);

                expect(result).toEqual({
                    page: 2,
                    limit: 20,
                    offset: 20,
                    sortBy: 'invoice_date',
                    sortOrder: 'DESC',
                });
            });

            it('should handle partial parameters with defaults', () => {
                const searchParams = new URLSearchParams('page=5&sortBy=status');
                const result = parsePagination(searchParams);

                expect(result).toEqual({
                    page: 5,
                    limit: 50,
                    offset: 200,
                    sortBy: 'status',
                    sortOrder: 'DESC',
                });
            });
        });

        describe('input validation', () => {
            it('should throw TypeError for null input', () => {
                expect(() => parsePagination(null)).toThrow(TypeError);
                expect(() => parsePagination(null)).toThrow(
                    'searchParams must be URLSearchParams or have a get() method'
                );
            });

            it('should throw TypeError for undefined input', () => {
                expect(() => parsePagination(undefined)).toThrow(TypeError);
            });

            it('should throw TypeError for object without get method', () => {
                expect(() => parsePagination({})).toThrow(TypeError);
            });

            it('should throw TypeError for string input', () => {
                expect(() => parsePagination('page=1')).toThrow(TypeError);
            });

            it('should throw TypeError for number input', () => {
                expect(() => parsePagination(123)).toThrow(TypeError);
            });

            it('should accept object with get method', () => {
                const mockParams = {
                    get: (key) => {
                        const params = { page: '2', limit: '25' };
                        return params[key] || null;
                    },
                };

                const result = parsePagination(mockParams);

                expect(result.page).toBe(2);
                expect(result.limit).toBe(25);
            });
        });

        describe('edge cases', () => {
            it('should handle empty URLSearchParams', () => {
                const searchParams = new URLSearchParams('');
                const result = parsePagination(searchParams);

                expect(result).toEqual({
                    page: 1,
                    limit: 50,
                    offset: 0,
                    sortBy: 'created_at',
                    sortOrder: 'DESC',
                });
            });

            it('should handle whitespace in parameters', () => {
                const searchParams = new URLSearchParams('page= 2 &limit= 25 ');
                const result = parsePagination(searchParams);

                expect(result.page).toBe(2);
                expect(result.limit).toBe(25);
            });

            it('should handle duplicate parameters (uses first)', () => {
                const searchParams = new URLSearchParams('page=2&page=3');
                const result = parsePagination(searchParams);

                expect(result.page).toBe(2);
            });

            it('should handle very large offset calculations', () => {
                const searchParams = new URLSearchParams('page=1000000&limit=100');
                const result = parsePagination(searchParams);

                expect(result.offset).toBe(99999900);
            });
        });
    });

    describe('buildPaginationMeta', () => {
        describe('basic functionality', () => {
            it('should build pagination metadata correctly', () => {
                const meta = buildPaginationMeta(2, 25, 100);

                expect(meta).toEqual({
                    page: 2,
                    pageSize: 25,
                    total: 100,
                    totalPages: 4,
                });
            });

            it('should calculate totalPages correctly for exact division', () => {
                const meta = buildPaginationMeta(1, 20, 100);

                expect(meta.totalPages).toBe(5);
            });

            it('should calculate totalPages correctly for partial last page', () => {
                const meta = buildPaginationMeta(3, 20, 55);

                expect(meta.totalPages).toBe(3);
            });

            it('should handle single page result', () => {
                const meta = buildPaginationMeta(1, 50, 25);

                expect(meta).toEqual({
                    page: 1,
                    pageSize: 50,
                    total: 25,
                    totalPages: 1,
                });
            });

            it('should handle empty result set', () => {
                const meta = buildPaginationMeta(1, 50, 0);

                expect(meta).toEqual({
                    page: 1,
                    pageSize: 50,
                    total: 0,
                    totalPages: 0,
                });
            });

            it('should handle single item', () => {
                const meta = buildPaginationMeta(1, 50, 1);

                expect(meta).toEqual({
                    page: 1,
                    pageSize: 50,
                    total: 1,
                    totalPages: 1,
                });
            });
        });

        describe('totalPages calculation', () => {
            it('should round up totalPages for partial pages', () => {
                const meta = buildPaginationMeta(1, 10, 95);

                expect(meta.totalPages).toBe(10);
            });

            it('should handle limit of 1', () => {
                const meta = buildPaginationMeta(5, 1, 100);

                expect(meta).toEqual({
                    page: 5,
                    pageSize: 1,
                    total: 100,
                    totalPages: 100,
                });
            });

            it('should handle large datasets', () => {
                const meta = buildPaginationMeta(1, 50, 10000);

                expect(meta.totalPages).toBe(200);
            });

            it('should handle very small limit', () => {
                const meta = buildPaginationMeta(1, 1, 5);

                expect(meta.totalPages).toBe(5);
            });

            it('should handle limit larger than total', () => {
                const meta = buildPaginationMeta(1, 100, 50);

                expect(meta.totalPages).toBe(1);
            });
        });

        describe('input validation', () => {
            it('should throw TypeError for invalid page (not a number)', () => {
                expect(() => buildPaginationMeta('1', 50, 100)).toThrow(TypeError);
                expect(() => buildPaginationMeta('1', 50, 100)).toThrow(
                    'page must be a number >= 1'
                );
            });

            it('should throw TypeError for page less than 1', () => {
                expect(() => buildPaginationMeta(0, 50, 100)).toThrow(TypeError);
            });

            it('should throw TypeError for negative page', () => {
                expect(() => buildPaginationMeta(-1, 50, 100)).toThrow(TypeError);
            });

            it('should throw TypeError for invalid limit (not a number)', () => {
                expect(() => buildPaginationMeta(1, '50', 100)).toThrow(TypeError);
                expect(() => buildPaginationMeta(1, '50', 100)).toThrow(
                    'limit must be a number >= 1'
                );
            });

            it('should throw TypeError for limit less than 1', () => {
                expect(() => buildPaginationMeta(1, 0, 100)).toThrow(TypeError);
            });

            it('should throw TypeError for negative limit', () => {
                expect(() => buildPaginationMeta(1, -10, 100)).toThrow(TypeError);
            });

            it('should throw TypeError for invalid total (not a number)', () => {
                expect(() => buildPaginationMeta(1, 50, '100')).toThrow(TypeError);
                expect(() => buildPaginationMeta(1, 50, '100')).toThrow(
                    'total must be a number >= 0'
                );
            });

            it('should throw TypeError for negative total', () => {
                expect(() => buildPaginationMeta(1, 50, -1)).toThrow(TypeError);
            });

            it('should throw TypeError for null page', () => {
                expect(() => buildPaginationMeta(null, 50, 100)).toThrow(TypeError);
            });

            it('should throw TypeError for undefined limit', () => {
                expect(() => buildPaginationMeta(1, undefined, 100)).toThrow(TypeError);
            });

            it('should throw TypeError for NaN total', () => {
                expect(() => buildPaginationMeta(1, 50, NaN)).toThrow(TypeError);
            });
        });

        describe('edge cases', () => {
            it('should handle decimal page numbers', () => {
                const meta = buildPaginationMeta(2.5, 25, 100);

                expect(meta.page).toBe(2.5);
            });

            it('should handle decimal limit', () => {
                const meta = buildPaginationMeta(1, 25.7, 100);

                expect(meta.pageSize).toBe(25.7);
            });

            it('should handle decimal total', () => {
                const meta = buildPaginationMeta(1, 25, 100.9);

                expect(meta.total).toBe(100.9);
            });

            it('should handle very large page numbers', () => {
                const meta = buildPaginationMeta(999999, 50, 50000000);

                expect(meta.page).toBe(999999);
                expect(meta.totalPages).toBe(1000000);
            });

            it('should handle maximum safe integer', () => {
                const meta = buildPaginationMeta(1, 1, Number.MAX_SAFE_INTEGER);

                expect(meta.total).toBe(Number.MAX_SAFE_INTEGER);
            });
        });

        describe('real-world scenarios', () => {
            it('should handle typical API pagination', () => {
                const meta = buildPaginationMeta(1, 20, 150);

                expect(meta).toEqual({
                    page: 1,
                    pageSize: 20,
                    total: 150,
                    totalPages: 8,
                });
            });

            it('should handle last page with partial results', () => {
                const meta = buildPaginationMeta(8, 20, 150);

                expect(meta).toEqual({
                    page: 8,
                    pageSize: 20,
                    total: 150,
                    totalPages: 8,
                });
            });

            it('should handle first page of large dataset', () => {
                const meta = buildPaginationMeta(1, 100, 10000);

                expect(meta).toEqual({
                    page: 1,
                    pageSize: 100,
                    total: 10000,
                    totalPages: 100,
                });
            });

            it('should handle middle page', () => {
                const meta = buildPaginationMeta(5, 25, 250);

                expect(meta).toEqual({
                    page: 5,
                    pageSize: 25,
                    total: 250,
                    totalPages: 10,
                });
            });
        });
    });

    describe('integration scenarios', () => {
        it('should work together for complete pagination flow', () => {
            const url = new URL('https://api.example.com/invoices?page=2&limit=25');
            const { page, limit, offset, sortBy, sortOrder } = parsePagination(
                url.searchParams
            );

            expect(page).toBe(2);
            expect(limit).toBe(25);
            expect(offset).toBe(25);

            const meta = buildPaginationMeta(page, limit, 100);

            expect(meta).toEqual({
                page: 2,
                pageSize: 25,
                total: 100,
                totalPages: 4,
            });
        });

        it('should handle default pagination flow', () => {
            const url = new URL('https://api.example.com/invoices');
            const { page, limit, offset } = parsePagination(url.searchParams);

            expect(page).toBe(1);
            expect(limit).toBe(50);
            expect(offset).toBe(0);

            const meta = buildPaginationMeta(page, limit, 200);

            expect(meta).toEqual({
                page: 1,
                pageSize: 50,
                total: 200,
                totalPages: 4,
            });
        });

        it('should handle custom sorting with pagination', () => {
            const url = new URL(
                'https://api.example.com/invoices?page=3&limit=20&sortBy=amount&sortOrder=ASC'
            );
            const { page, limit, offset, sortBy, sortOrder } = parsePagination(
                url.searchParams
            );

            expect(page).toBe(3);
            expect(limit).toBe(20);
            expect(offset).toBe(40);
            expect(sortBy).toBe('amount');
            expect(sortOrder).toBe('ASC');

            const meta = buildPaginationMeta(page, limit, 150);

            expect(meta.totalPages).toBe(8);
        });
    });
});
