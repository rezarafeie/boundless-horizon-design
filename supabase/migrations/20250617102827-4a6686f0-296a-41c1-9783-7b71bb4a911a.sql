
-- Drop existing RLS policies on subscriptions table
DROP POLICY IF EXISTS "Anyone can create subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions or anonymous subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions or anonymous subscriptions" ON public.subscriptions;

-- Create new RLS policies for subscriptions table that work with mobile number identification
-- Policy for inserting: Allow anyone to create subscriptions
CREATE POLICY "Allow anonymous and authenticated users to create subscriptions" 
  ON public.subscriptions 
  FOR INSERT 
  WITH CHECK (true);

-- Policy for selecting: Allow users to view subscriptions based on mobile number or user_id
CREATE POLICY "Users can view subscriptions by mobile or user_id" 
  ON public.subscriptions 
  FOR SELECT 
  USING (
    -- If user is authenticated, they can see their own subscriptions
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) 
    OR 
    -- Anonymous users can see subscriptions but we'll handle mobile filtering in the application layer
    (auth.uid() IS NULL)
    OR
    -- Authenticated users can also see anonymous subscriptions (for admin purposes)
    (auth.uid() IS NOT NULL AND user_id IS NULL)
  );

-- Policy for updating: Allow users to update their own subscriptions or anonymous ones
CREATE POLICY "Users can update subscriptions by mobile or user_id" 
  ON public.subscriptions 
  FOR UPDATE 
  USING (
    -- If user is authenticated, they can update their own subscriptions
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) 
    OR 
    -- Allow updates for anonymous subscriptions (needed for status updates from payment system)
    (user_id IS NULL)
  );

-- Policy for deleting: Only authenticated users can delete their own subscriptions
CREATE POLICY "Authenticated users can delete their own subscriptions" 
  ON public.subscriptions 
  FOR DELETE 
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
