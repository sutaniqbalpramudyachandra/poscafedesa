/*
# Warkop POS Schema (single-tenant, no auth)

1. New Tables
- `products`: katalog makanan/minuman warkop (id, name, category, price, image_url, is_active, created_at)
- `transactions`: header transaksi penjualan (id, invoice_no, payment_method, subtotal, total, amount_paid, change, created_at)
- `transaction_items`: detail item per transaksi (id, transaction_id FK, product_id, product_name, qty, price, subtotal)

2. Security
- Enable RLS on all tables.
- Allow anon + authenticated CRUD on all tables because the data is intentionally shared/public (single-tenant warkop POS, no sign-in screen).

3. Notes
- `products.is_active` allows soft-disabling a product without deleting it (preserves historical transaction items).
- `transaction_items.product_name` is denormalized so historical receipts remain correct even if a product is later renamed or removed.
- `transactions.invoice_no` uses a sequence-based format for human-readable receipts.
*/

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Lainnya',
  price integer NOT NULL CHECK (price >= 0),
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('Tunai','QRIS')),
  subtotal integer NOT NULL CHECK (subtotal >= 0),
  total integer NOT NULL CHECK (total >= 0),
  amount_paid integer NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  change integer NOT NULL DEFAULT 0 CHECK (change >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  qty integer NOT NULL CHECK (qty > 0),
  price integer NOT NULL CHECK (price >= 0),
  subtotal integer NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_product_id ON transaction_items(product_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_products" ON products;
CREATE POLICY "anon_select_products" ON products FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_products" ON products;
CREATE POLICY "anon_insert_products" ON products FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_products" ON products;
CREATE POLICY "anon_update_products" ON products FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_products" ON products;
CREATE POLICY "anon_delete_products" ON products FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
CREATE POLICY "anon_select_transactions" ON transactions FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
CREATE POLICY "anon_insert_transactions" ON transactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
CREATE POLICY "anon_update_transactions" ON transactions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;
CREATE POLICY "anon_delete_transactions" ON transactions FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_transaction_items" ON transaction_items;
CREATE POLICY "anon_select_transaction_items" ON transaction_items FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_transaction_items" ON transaction_items;
CREATE POLICY "anon_insert_transaction_items" ON transaction_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_transaction_items" ON transaction_items;
CREATE POLICY "anon_update_transaction_items" ON transaction_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_transaction_items" ON transaction_items;
CREATE POLICY "anon_delete_transaction_items" ON transaction_items FOR DELETE
  TO anon, authenticated USING (true);
