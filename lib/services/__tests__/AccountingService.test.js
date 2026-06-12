import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const hoisted = vi.hoisted(() => {
  const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
  };
  return {
    mockClient,
    poolConnect: vi.fn(async () => mockClient),
  };
});

vi.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    connect: hoisted.poolConnect,
  },
}));

import { AccountingService } from '../AccountingService';

function fakeTxClient() {
  return { query: vi.fn(), release: vi.fn() };
}

describe('AccountingService', () => {
  let createJournalSpy;
  let getGLSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.mockClient.query.mockReset();
    hoisted.mockClient.release.mockReset();

    createJournalSpy = vi.spyOn(AccountingService, 'createJournalEntry').mockResolvedValue({
      success: true,
      journalId: 'je-1',
      journalNumber: 'JE-000001',
    });
    getGLSpy = vi.spyOn(AccountingService, 'getGLAccountsByTypes').mockImplementation(async (businessId, types) => {
      const map = {};
      for (const t of types) {
        map[t] = { id: `${businessId}-${t}`, code: t };
      }
      return map;
    });
  });

  afterEach(() => {
    createJournalSpy.mockRestore();
    getGLSpy.mockRestore();
  });

  describe('recordBusinessTransaction', () => {
    it('builds a balanced sale journal (AR, revenue, tax)', async () => {
      const tx = fakeTxClient();
      const data = {
        businessId: 'biz-1',
        referenceId: 'inv-1',
        totalAmount: 117,
        netAmount: 100,
        taxAmount: 17,
      };

      await AccountingService.recordBusinessTransaction('sale', data, tx);

      expect(createJournalSpy).toHaveBeenCalledTimes(1);
      const arg = createJournalSpy.mock.calls[0][0];
      expect(arg.entries).toHaveLength(3);
      const dr = arg.entries.reduce((s, e) => s + Number(e.debit || 0), 0);
      const cr = arg.entries.reduce((s, e) => s + Number(e.credit || 0), 0);
      expect(dr).toBe(cr);
      expect(arg.entries[0].debit).toBe(117);
      expect(arg.entries[1].credit).toBe(100);
      expect(arg.entries[2].credit).toBe(17);
    });

    it('sale with zero tax omits tax line', async () => {
      const tx = fakeTxClient();
      await AccountingService.recordBusinessTransaction(
        'sale',
        {
          businessId: 'biz-1',
          referenceId: 'inv-2',
          totalAmount: 50,
          netAmount: 50,
          taxAmount: 0,
        },
        tx
      );
      const arg = createJournalSpy.mock.calls[0][0];
      expect(arg.entries).toHaveLength(2);
    });

    it('builds a purchase journal (inventory DR net, AP CR total)', async () => {
      const tx = fakeTxClient();
      await AccountingService.recordBusinessTransaction(
        'purchase',
        {
          businessId: 'biz-1',
          referenceId: 'po-1',
          totalAmount: 50,
          netAmount: 50,
          taxAmount: 0,
        },
        tx
      );
      const arg = createJournalSpy.mock.calls[0][0];
      expect(arg.entries).toHaveLength(2);
      const dr = arg.entries.reduce((s, e) => s + Number(e.debit || 0), 0);
      const cr = arg.entries.reduce((s, e) => s + Number(e.credit || 0), 0);
      expect(dr).toBe(cr);
      expect(dr).toBe(50);
    });

    it('maps stock-style adjustments to type adjustment', async () => {
      const tx = fakeTxClient();
      await expect(
        AccountingService.recordBusinessTransaction(
          'stock_adjustment',
          { businessId: 'biz-1', referenceId: 'adj-1', amount: 500 },
          tx
        )
      ).rejects.toThrow(/Untracked transaction type: stock_adjustment/);
      expect(createJournalSpy).not.toHaveBeenCalled();
    });

    it('adjustment (inventory gain) posts two lines', async () => {
      const tx = fakeTxClient();
      await AccountingService.recordBusinessTransaction(
        'adjustment',
        {
          businessId: 'biz-1',
          referenceId: 'adj-1',
          totalAmount: 500,
        },
        tx
      );
      const arg = createJournalSpy.mock.calls[0][0];
      expect(arg.referenceType).toBe('adjustment');
      expect(arg.entries).toHaveLength(2);
    });

    it('adjustment (inventory loss) reverses debit and credit', async () => {
      const tx = fakeTxClient();
      await AccountingService.recordBusinessTransaction(
        'adjustment',
        {
          businessId: 'biz-1',
          referenceId: 'adj-2',
          totalAmount: -300,
        },
        tx
      );
      const arg = createJournalSpy.mock.calls[0][0];
      expect(arg.entries).toHaveLength(2);
      expect(arg.entries[0].debit).toBe(300);
      expect(arg.entries[1].credit).toBe(300);
    });

    it('rejects unknown transaction types', async () => {
      const tx = fakeTxClient();
      await expect(
        AccountingService.recordBusinessTransaction('unknown_type', { businessId: 'biz-1' }, tx)
      ).rejects.toThrow(/Untracked transaction type: unknown_type/);
      expect(createJournalSpy).not.toHaveBeenCalled();
    });
  });

  describe('getAccountBalance', () => {
    it('returns numeric balance from gl_entries aggregate', async () => {
      hoisted.mockClient.query.mockResolvedValueOnce({ rows: [{ balance: '1234.5' }] });
      const bal = await AccountingService.getAccountBalance('biz-1', 'acc-1');
      expect(bal).toBe(1234.5);
      expect(hoisted.mockClient.release).toHaveBeenCalled();
    });
  });
});
