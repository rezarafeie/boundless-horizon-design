-- Add new admin user 'mehran' with limited permissions
-- First, add new columns for authentication
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS username text,
ADD COLUMN IF NOT EXISTS password_hash text,
ADD COLUMN IF NOT EXISTS allowed_sections jsonb DEFAULT '[]'::jsonb;

-- Create unique constraint on username
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_username_unique ON admin_users (username);

-- Update existing admin user with username and sections
UPDATE admin_users 
SET username = 'bnets', 
    password_hash = 'reza1234', -- We'll use plaintext for now, will hash in the application
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
    'mehran1234', -- We'll use plaintext for now, will hash in the application
    'editor', -- Using existing role for now
    true,
    '["dashboard", "users", "services", "tests"]'::jsonb
) ON CONFLICT (username) DO NOTHING;

-- Add comments for clarity
COMMENT ON COLUMN admin_users.allowed_sections IS 'Array of section names that this admin user can access';
COMMENT ON COLUMN admin_users.username IS 'Unique username for admin login';
COMMENT ON COLUMN admin_users.password_hash IS 'Password for admin authentication (will be hashed in application)';