/*
# Add app_settings table, table_number/status columns, and QR code support

## Overview
This migration adds:
1. A single-row `app_settings` table for cafe profile (name, address, phone, logo URL, QR code URL).
2. `table_number` and `status` columns on `transactions` to support table tracking and "pay later" (unpaid) orders.

## New Tables
- `app_settings` (single-tenant, no auth)
  - `id` int4 primary key, always 1 (singleton row)
  - `cafe_name` text, default 'Cafe Desa'
  - `address` text, nullable
  - `phone` text, nullable
  - `logo_url` text, nullable — URL to cafe logo image
  - `qr_code_url` text, nullable — URL to QRIS/payment QR code image
  - `updated_at` timestamptz, default now()

## Modified Tables
- `transactions`
  - Added `table_number` text, nullable — customer's table number/name
  - Added `status` text, not null, default 'paid' — 'paid' or 'unpaid' (for pay-later orders)

## Security
- RLS enabled on `app_settings` with full anon+authenticated CRUD (single-tenant, no auth app — data is intentionally shared).
- No changes to existing transaction policies (existing anon policies already allow full CRUD).

## Notes
1. The `app_settings` table is seeded with a default row (id=1, cafe_name='Cafe Desa').
2. `status` defaults to 'paid' so all existing transactions remain unaffected.
3. A CHECK constraint limits `status` to 'paid' or 'unpaid'.
4. No trigger used; updated_at is set by the app on update.
*/

-- App settings table (singleton)
CREATE TABLE IF NOT EXISTS app_settings (
  id int4 PRIMARY KEY DEFAULT 1,
  cafe_name text NOT NULL DEFAULT 'Cafe Desa',
  address text,
  phone text,
  logo_url text,
  qr_code_url text,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT app_settings_singleton CHECK (id = 1)
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settings" ON app_settings;
CREATE POLICY "anon_select_settings" ON app_settings FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_settings" ON app_settings;
CREATE POLICY "anon_insert_settings" ON app_settings FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_settings" ON app_settings;
CREATE POLICY "anon_update_settings" ON app_settings FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_settings" ON app_settings;
CREATE POLICY "anon_delete_settings" ON app_settings FOR DELETE
TO anon, authenticated USING (true);

-- Seed default row
INSERT INTO app_settings (id, cafe_name, address, phone)
VALUES (1, 'Cafe Desa', 'Jl. Desa Makmur No. 17', '0812-3456-7890')
ON CONFLICT (id) DO NOTHING;

-- Add table_number and status to transactions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'table_number') THEN
    ALTER TABLE transactions ADD COLUMN table_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'status') THEN
    ALTER TABLE transactions ADD COLUMN status text NOT NULL DEFAULT 'paid';
  END IF;
END $$;

-- Add check constraint for status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_status_check') THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_status_check CHECK (status IN ('paid', 'unpaid'));
  END IF;
END $$;
