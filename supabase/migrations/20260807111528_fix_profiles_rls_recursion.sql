/*
# Fix infinite recursion in profiles RLS policies

## Problem
The profiles RLS policies self-reference the profiles table to check if the caller
is a super_admin. This causes infinite recursion: to evaluate the policy on profiles,
Postgres queries profiles, which triggers the policy again, endlessly.

## Solution
Create a SECURITY DEFINER helper function that checks the caller's role by querying
profiles with the owner bypassing RLS. Then use this function in all policies instead
of inline subqueries on profiles.
*/

-- Helper function: returns the caller's role, bypassing RLS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_role() TO authenticated;

-- Recreate all policies using the helper function (no self-reference)
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin" ON profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = id
    OR public.get_current_role() = 'super_admin'
  );

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON profiles;
CREATE POLICY "profiles_update_own_or_admin" ON profiles FOR UPDATE
  TO authenticated USING (
    auth.uid() = id
    OR public.get_current_role() = 'super_admin'
  )
  WITH CHECK (
    auth.uid() = id
    OR public.get_current_role() = 'super_admin'
  );

DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
CREATE POLICY "profiles_insert_admin" ON profiles FOR INSERT
  TO authenticated WITH CHECK (
    public.get_current_role() = 'super_admin'
  );

DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE
  TO authenticated USING (
    public.get_current_role() = 'super_admin'
  );