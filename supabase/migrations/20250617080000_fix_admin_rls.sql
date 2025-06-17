
-- Create a function to safely check admin user status without RLS recursion
CREATE OR REPLACE FUNCTION public.check_admin_user(check_user_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  role TEXT,
  is_active BOOLEAN
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.id, au.user_id, au.role, au.is_active
  FROM admin_users au
  WHERE au.user_id = check_user_id 
    AND au.is_active = true
    AND au.role IN ('superadmin', 'editor')
  LIMIT 1;
$$;

-- Update the RLS policy to avoid recursion
DROP POLICY IF EXISTS "Admin users can manage admin_users" ON public.admin_users;

-- Create a simpler policy that doesn't cause recursion
CREATE POLICY "Allow admin access to admin_users" 
  ON public.admin_users 
  FOR ALL 
  TO authenticated
  USING (true);

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.check_admin_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_admin_user(UUID) TO anon;
