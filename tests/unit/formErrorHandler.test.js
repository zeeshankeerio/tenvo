/**
 * Unit tests: server action result → form error helpers (no browser).
 */
import { describe, it, expect } from 'vitest';
import {
  parseActionError,
  isValidationError,
  isUpgradeRequired,
  formatValidationErrors,
} from '@/lib/utils/formErrorHandler';

describe('formErrorHandler', () => {
  describe('parseActionError', () => {
    it('returns null for success results', () => {
      expect(parseActionError({ success: true })).toBeNull();
      expect(parseActionError(null)).toBeNull();
    });

    it('maps known codes to friendly messages', () => {
      const info = parseActionError({
        success: false,
        code: 'PLAN_UPGRADE_REQUIRED',
        error: 'ignored in favor of map',
      });
      expect(info?.type).toBe('upgrade');
      expect(info?.message).toContain('plan upgrade');
    });

    it('falls back to result.error for unknown codes', () => {
      const info = parseActionError({
        success: false,
        code: 'CUSTOM_XYZ',
        error: 'Something broke',
      });
      expect(info?.message).toBe('Something broke');
      expect(info?.code).toBe('CUSTOM_XYZ');
    });
  });

  describe('isValidationError', () => {
    it('detects VALIDATION_ERROR code', () => {
      expect(
        isValidationError({
          success: false,
          code: 'VALIDATION_ERROR',
          error: 'Bad input',
        })
      ).toBe(true);
      expect(isValidationError({ success: true })).toBe(false);
      expect(isValidationError({ success: false, code: 'OTHER' })).toBe(false);
    });
  });

  describe('isUpgradeRequired', () => {
    it('returns true for plan / limit codes', () => {
      expect(isUpgradeRequired({ success: false, code: 'LIMIT_REACHED' })).toBe(true);
      expect(isUpgradeRequired({ success: false, code: 'FEATURE_NOT_AVAILABLE' })).toBe(true);
      expect(isUpgradeRequired({ success: false, code: 'VALIDATION_ERROR' })).toBe(false);
    });
  });

  describe('formatValidationErrors', () => {
    it('returns flat details object as-is', () => {
      const details = { email: 'Invalid email' };
      expect(formatValidationErrors({ details })).toEqual(details);
    });

    it('maps Zod-style array to field keys', () => {
      const out = formatValidationErrors({
        details: [{ path: ['items', 0, 'quantity'], message: 'Too low' }],
      });
      expect(out['items.0.quantity']).toBe('Too low');
    });
  });
});
