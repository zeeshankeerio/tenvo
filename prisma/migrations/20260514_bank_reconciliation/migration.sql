-- =============================================================================
-- Migration: Bank Reconciliation Tables
-- Created: Phase 1B Finance Core
-- Description: Idempotent migration for bank reconciliation sessions and
--              statement lines. Uses CREATE TABLE IF NOT EXISTS so it is safe
--              to run multiple times.
-- =============================================================================

-- 1. Bank Reconciliation Sessions
--    One session per bank account per statement date.
-- =============================================================================
CREATE TABLE IF NOT EXISTS bank_reconciliation_sessions (
    id                          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id                 UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    account_id                  UUID        NOT NULL REFERENCES gl_accounts(id) ON DELETE RESTRICT,
    statement_date              DATE        NOT NULL,
    statement_closing_balance   NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status                      TEXT        NOT NULL DEFAULT 'in_progress'
                                    CHECK (status IN ('in_progress', 'completed')),
    completed_at                TIMESTAMPTZ,
    created_by                  TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_recon_sessions_business_id
    ON bank_reconciliation_sessions (business_id);

CREATE INDEX IF NOT EXISTS idx_bank_recon_sessions_account_date
    ON bank_reconciliation_sessions (account_id, statement_date);

-- Prevent duplicate sessions for the same account + statement date
CREATE UNIQUE INDEX IF NOT EXISTS uidx_bank_recon_sessions_unique
    ON bank_reconciliation_sessions (business_id, account_id, statement_date);

-- =============================================================================
-- 2. Bank Statement Lines
--    Individual transactions from the bank statement, linked to a session.
-- =============================================================================
CREATE TABLE IF NOT EXISTS bank_statement_lines (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      UUID        NOT NULL REFERENCES bank_reconciliation_sessions(id) ON DELETE CASCADE,
    statement_date  DATE        NOT NULL,
    description     TEXT,
    debit           NUMERIC(15, 2) NOT NULL DEFAULT 0,
    credit          NUMERIC(15, 2) NOT NULL DEFAULT 0,
    matched         BOOLEAN     NOT NULL DEFAULT false,
    gl_entry_id     UUID        REFERENCES gl_entries(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT positive_debit  CHECK (debit  >= 0),
    CONSTRAINT positive_credit CHECK (credit >= 0)
);

CREATE INDEX IF NOT EXISTS idx_bank_stmt_lines_session_id
    ON bank_statement_lines (session_id);

CREATE INDEX IF NOT EXISTS idx_bank_stmt_lines_matched
    ON bank_statement_lines (session_id, matched);

CREATE INDEX IF NOT EXISTS idx_bank_stmt_lines_gl_entry
    ON bank_statement_lines (gl_entry_id)
    WHERE gl_entry_id IS NOT NULL;

-- =============================================================================
-- 3. updated_at trigger for bank_reconciliation_sessions
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_bank_recon_sessions_updated_at'
    ) THEN
        CREATE TRIGGER set_bank_recon_sessions_updated_at
            BEFORE UPDATE ON bank_reconciliation_sessions
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
EXCEPTION
    WHEN undefined_function THEN
        -- update_updated_at_column() may not exist in all environments; skip silently
        NULL;
END;
$$;
