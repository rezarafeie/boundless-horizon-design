
-- Make the manual-payment-receipts bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'manual-payment-receipts';

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can upload payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view payment receipts" ON storage.objects;

-- Create new policies for public access
CREATE POLICY "Allow public upload to manual payment receipts"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'manual-payment-receipts');

CREATE POLICY "Allow public read of manual payment receipts"
ON storage.objects
FOR SELECT
USING (bucket_id = 'manual-payment-receipts');

-- Allow public delete for admin cleanup
CREATE POLICY "Allow public delete of manual payment receipts"
ON storage.objects
FOR DELETE
USING (bucket_id = 'manual-payment-receipts');
