-- Add new columns for enhanced admin authentication
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS username text,
ADD COLUMN IF NOT EXISTS password_hash text,
ADD COLUMN IF NOT EXISTS allowed_sections jsonb DEFAULT '[]'::jsonb;

-- Create unique constraint on username
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_username_unique ON admin_users (username) WHERE username IS NOT NULL;

-- Update existing admin user with username and full permissions
UPDATE admin_users 
SET username = 'bnets', 
    password_hash = 'reza1234',
    allowed_sections = '["dashboard", "users", "plans", "panels", "tests", "reports", "telegrambot", "webhook", "services", "discounts"]'::jsonb
WHERE user_id = 'a4148578-bcbd-4512-906e-4832f94bdb46';

-- Create a second admin entry for mehran using the same user_id pattern but different UUID
INSERT INTO admin_users (
    id,
    user_id, 
    username, 
    password_hash, 
    role, 
    is_active, 
    allowed_sections
) VALUES (
    gen_random_uuid(),
    'b5259689-cde4-4523-a17f-5943f95cec47', -- Different UUID for mehran
    'mehran',
    'mehran1234',
    'editor',
    true,
    '["dashboard", "users", "services", "tests"]'::jsonb
);

-- Add comments
COMMENT ON COLUMN admin_users.allowed_sections IS 'Array of admin section names this user can access';
COMMENT ON COLUMN admin_users.username IS 'Admin username for login';
COMMENT ON COLUMN admin_users.password_hash IS 'Admin password (stored as plaintext for simplicity)';