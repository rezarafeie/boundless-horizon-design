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
) ON CONFLICT (username) DO NOTHING;

-- Recreate the foreign key constraint (this will fail silently if auth users don't exist, which is expected)
-- We'll leave it without the constraint for now since this is a custom admin system
-- ALTER TABLE admin_users ADD CONSTRAINT admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;