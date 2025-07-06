-- Add new columns for enhanced admin authentication
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS username text,
ADD COLUMN IF NOT EXISTS password_hash text,
ADD COLUMN IF NOT EXISTS allowed_sections jsonb DEFAULT '[]'::jsonb;

-- Create unique constraint on username where not null
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_username_unique ON admin_users (username) WHERE username IS NOT NULL;

-- Update existing admin user with username and full permissions
UPDATE admin_users 
SET username = 'bnets', 
    password_hash = 'reza1234',
    allowed_sections = '["dashboard", "users", "plans", "panels", "tests", "reports", "telegrambot", "webhook", "services", "discounts"]'::jsonb
WHERE user_id = 'a4148578-bcbd-4512-906e-4832f94bdb46';

-- Add comments
COMMENT ON COLUMN admin_users.allowed_sections IS 'Array of admin section names this user can access';
COMMENT ON COLUMN admin_users.username IS 'Admin username for login';
COMMENT ON COLUMN admin_users.password_hash IS 'Admin password (stored as plaintext for simplicity)';