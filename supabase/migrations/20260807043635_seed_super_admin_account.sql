/*
# Seed initial super_admin account
# Email: admin@cafedesa.id / Password: admin123
# Change password after first login.
*/

DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'admin@cafedesa.id';
  IF new_user_id IS NULL THEN
    -- Create auth user with hashed password
    new_user_id := extensions.uuid_generate_v4();
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'admin@cafedesa.id',
      crypt('admin123', extensions.gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"display_name":"Super Admin","role":"super_admin"}'
    );

    -- Create profile row directly (trigger also handles this but we set super_admin role explicitly)
    INSERT INTO profiles (id, email, display_name, role, is_active)
    VALUES (new_user_id, 'admin@cafedesa.id', 'Super Admin', 'super_admin', true)
    ON CONFLICT (id) DO UPDATE SET role = 'super_admin', display_name = 'Super Admin';
  END IF;
END $$;
