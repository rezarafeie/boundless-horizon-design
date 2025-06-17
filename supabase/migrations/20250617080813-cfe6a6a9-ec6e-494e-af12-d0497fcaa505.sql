
-- First, let's create an auth user programmatically
-- This will create a user with email 'admin@boundless.network' and password 'BoundlessAdmin2024!'
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
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@boundless.network',
  crypt('BoundlessAdmin2024!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Now create the admin user record linking to the auth user we just created
INSERT INTO public.admin_users (user_id, role, is_active)
SELECT 
  u.id,
  'superadmin',
  true
FROM auth.users u 
WHERE u.email = 'admin@boundless.network'
LIMIT 1;
