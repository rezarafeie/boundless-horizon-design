-- Fix storage RLS policies for manual payment receipts
-- Drop existing policies first
DROP POLICY IF EXISTS "Allow authenticated users to upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view their own receipts" ON storage.objects;

-- Allow anyone to upload receipts (for anonymous subscriptions)
CREATE POLICY "Anyone can upload payment receipts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'manual-payment-receipts'
);

-- Allow anyone to view payment receipts (for admin access)
CREATE POLICY "Anyone can view payment receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'manual-payment-receipts'
);

-- Add RLS policy for admin users to view test_users table
CREATE POLICY "Admins can view test users"
ON public.test_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users au 
    WHERE au.user_id = auth.uid() 
    AND au.is_active = true
  )
);