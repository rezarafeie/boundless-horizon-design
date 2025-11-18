-- Fix admin login by allowing public SELECT on admin_users for authentication
-- This enables login queries to work for unauthenticated users

-- Drop the restrictive policy that blocks unauthenticated access
DROP POLICY IF EXISTS "Enable select for authenticated users based on user_id" ON admin_users;

-- Add a policy that allows login attempts (select by username)
CREATE POLICY "Allow public select for login"
ON admin_users
FOR SELECT
TO public
USING (true);

-- Note: This allows anyone to query admin_users table
-- Passwords should be properly hashed (currently stored as plaintext)
-- Consider implementing rate limiting on login attempts to prevent brute force attacks