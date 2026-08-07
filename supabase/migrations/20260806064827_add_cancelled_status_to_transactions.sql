/*
# Add 'cancelled' status to transactions

1. Modified Tables
- `transactions`
  - Updated the `status` CHECK constraint to also allow 'cancelled' alongside 'paid' and 'unpaid'.
  - This enables the "cancel order" feature for unpaid orders: instead of deleting the transaction row,
    the app sets status to 'cancelled' so the order is removed from the active unpaid list but the
    record is preserved for audit/history.

2. Security
- No RLS policy changes. Existing policies remain intact.

3. Notes
- The old constraint is dropped and replaced (idempotent via DROP IF EXISTS).
- Existing rows are unaffected — the new constraint is a superset of the old one.
*/

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_status_check') THEN
    ALTER TABLE transactions DROP CONSTRAINT transactions_status_check;
  END IF;
END $$;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_status_check CHECK (status IN ('paid', 'unpaid', 'cancelled'));