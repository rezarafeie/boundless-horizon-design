
-- Create storage bucket for manual payment receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('manual-payment-receipts', 'manual-payment-receipts', false);

-- Allow authenticated users to upload receipts
CREATE POLICY "Allow authenticated users to upload receipts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'manual-payment-receipts' 
  AND auth.role() = 'authenticated'
);

-- Allow users to view their own receipts
CREATE POLICY "Allow users to view their own receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'manual-payment-receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
