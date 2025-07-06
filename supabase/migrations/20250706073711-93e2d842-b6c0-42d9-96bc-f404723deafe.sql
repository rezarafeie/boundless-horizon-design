-- Add new admin user 'mehran' with limited permissions
-- First, let's add a new role type for limited admin
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role_enum') THEN
        CREATE TYPE admin_role_enum AS ENUM ('superadmin', 'editor', 'limited_admin');
    END IF;
END$$;

-- Update the role column to use the enum if it doesn't already
ALTER TABLE admin_users 
ALTER COLUMN role TYPE admin_role_enum USING role::admin_role_enum;

-- Add username and password columns for authentication
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS username text UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash text,
ADD COLUMN IF NOT EXISTS allowed_sections jsonb DEFAULT '[]'::jsonb;

-- Update existing admin user with username and sections
UPDATE admin_users 
SET username = 'bnets', 
    password_hash = '$2b$10$RmVuZOhDzFKoKmQUGlYgGu8YvC/9LzBf9w2KGhGdFXwfkh3hvl0Lq', -- 'reza1234' hashed
    allowed_sections = '["dashboard", "users", "plans", "panels", "tests", "reports", "telegrambot", "webhook", "services", "discounts"]'::jsonb
WHERE user_id = 'a4148578-bcbd-4512-906e-4832f94bdb46';

-- Insert new limited admin user 'mehran'
INSERT INTO admin_users (
    user_id, 
    username, 
    password_hash, 
    role, 
    is_active, 
    allowed_sections
) VALUES (
    gen_random_uuid(),
    'mehran',
    '$2b$10$8X2Yj6wZvKoL8QmRjE5xfuXKvB7nJ1oF4rM9sL3pA6tN2qW5yU8eG', -- 'mehran1234' hashed
    'limited_admin',
    true,
    '["dashboard", "users", "services", "tests"]'::jsonb
) ON CONFLICT (username) DO NOTHING;

-- Add comment for clarity
COMMENT ON COLUMN admin_users.allowed_sections IS 'Array of section names that this admin user can access';
COMMENT ON COLUMN admin_users.username IS 'Unique username for admin login';
COMMENT ON COLUMN admin_users.password_hash IS 'Bcrypt hashed password for admin authentication';