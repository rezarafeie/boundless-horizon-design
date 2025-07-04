-- Create admin auth user for proper RLS integration
-- This allows the admin authentication to work with Supabase's auth system

-- First check if the admin user already exists in auth.users
DO $$
BEGIN
  -- Insert admin user into auth.users if not exists
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    'a4148578-bcbd-4512-906e-4832f94bdb46',
    'authenticated',
    'authenticated',
    'admin@boundless.network',
    crypt('admin_temp_password_12345', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "admin"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Update the existing admin_users record to ensure it's properly configured
  UPDATE admin_users 
  SET 
    role = 'superadmin',
    is_active = true,
    updated_at = NOW()
  WHERE user_id = 'a4148578-bcbd-4512-906e-4832f94bdb46';
  
END $$;