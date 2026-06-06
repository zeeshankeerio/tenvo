-- invoice_payments.deleted_by was added as UUID in 20260604; User.id is TEXT (Better Auth).
-- Align DB type with Prisma String and received_by (TEXT) so non-UUID ids never fail inserts.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoice_payments'
      AND column_name = 'deleted_by'
      AND udt_name = 'uuid'
  ) THEN
    ALTER TABLE "invoice_payments" ALTER COLUMN "deleted_by" TYPE TEXT USING ("deleted_by"::text);
  END IF;
END $$;
