-- Add public SELECT policy for test_users to allow viewing without admin authentication
CREATE POLICY "Anyone can view test users" 
ON public.test_users 
FOR SELECT 
USING (true);