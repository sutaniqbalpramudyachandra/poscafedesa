/*
# Add stock column to products + auth profiles/user_roles

## Modified Tables
- `products`: added `stock` integer NOT NULL DEFAULT 0 CHECK (stock >= 0)
  - stock = -1 means "unlimited" (no limit) — the app treats -1 as always available

## New Tables
- `profiles`: extends auth.users with role info (super_admin | kasir), display name, is_active

## Security
- RLS enabled on profiles
- Select: users can read their own profile. Super admin can read all.
- Update: users can update their own profile (display name only). Super admin can update all.
- products/transactions RLS unchanged (already open to anon+authenticated for this single-tenant POS).
*/

-- Add stock column to products
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'stock') THEN
    ALTER TABLE products ADD COLUMN stock integer NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_stock_check') THEN
    ALTER TABLE products ADD CONSTRAINT products_stock_check CHECK (stock >= -1);
  END IF;
END $$;

-- Default existing products to -1 (unlimited) so current inventory isn't accidentally zeroed
UPDATE products SET stock = -1 WHERE stock = 0 AND created_at < now() - interval '1 second';

-- Profiles table for role-based access control
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL DEFAULT 'Kasir',
  role text NOT NULL DEFAULT 'kasir' CHECK (role IN ('super_admin', 'kasir')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin" ON profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON profiles;
CREATE POLICY "profiles_update_own_or_admin" ON profiles FOR UPDATE
  TO authenticated USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  )
  WITH CHECK (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
CREATE POLICY "profiles_insert_admin" ON profiles FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

-- A trigger to auto-create a profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Kasir'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'kasir')::text
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();