
-- Make user_id nullable in subscriptions table to allow anonymous users
ALTER TABLE public.subscriptions ALTER COLUMN user_id DROP NOT NULL;

-- Update RLS policies to allow anonymous users
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can create their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.subscriptions;

-- New policies that work for both authenticated and anonymous users
CREATE POLICY "Anyone can create subscriptions" 
  ON public.subscriptions 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can view their own subscriptions or anonymous subscriptions" 
  ON public.subscriptions 
  FOR SELECT 
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own subscriptions or anonymous subscriptions" 
  ON public.subscriptions 
  FOR UPDATE 
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Update payment logs policy to work with anonymous subscriptions
DROP POLICY IF EXISTS "Users can view logs for their subscriptions" ON public.payment_logs;

CREATE POLICY "Users can view logs for their subscriptions or anonymous subscriptions" 
  ON public.payment_logs 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions 
      WHERE subscriptions.id = payment_logs.subscription_id 
      AND (subscriptions.user_id = auth.uid() OR subscriptions.user_id IS NULL)
    )
  );
