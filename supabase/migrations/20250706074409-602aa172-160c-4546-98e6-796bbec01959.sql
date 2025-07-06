-- Temporarily drop the foreign key constraint to add mehran user
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_user_id_fkey;

-- Insert mehran admin user with a unique user_id
INSERT INTO admin_users (
    user_id, 
    username, 
    password_hash, 
    role, 
    is_active, 
    allowed_sections
) VALUES (
    'b5259689-cde4-4523-a17f-5943f95cec47', -- Unique UUID for mehran
    'mehran',
    'mehran1234',
    'editor',
    true,
    '["dashboard", "users", "services", "tests"]'::jsonb
);

-- Create a proper unique constraint on username
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_username_key ON admin_users (username) WHERE username IS NOT NULL;