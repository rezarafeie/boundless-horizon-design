
-- Create storage bucket for receipt images
INSERT INTO storage.buckets (id, name, public)
VALUES ('manual-payment-receipts', 'manual-payment-receipts', false);

-- Create storage policies for receipt uploads
CREATE POLICY "Allow authenticated users to upload receipts" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'manual-payment-receipts' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow service role to read receipts" ON storage.objects
FOR SELECT USING (bucket_id = 'manual-payment-receipts');

-- Add fields to subscriptions table for manual payment tracking
ALTER TABLE public.subscriptions 
ADD COLUMN receipt_image_url TEXT,
ADD COLUMN admin_decision TEXT CHECK (admin_decision IN ('pending', 'approved', 'rejected')),
ADD COLUMN admin_decided_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN admin_decision_token TEXT UNIQUE;

-- Update existing manual payment subscriptions to have pending status
UPDATE public.subscriptions 
SET admin_decision = 'pending' 
WHERE status = 'pending_manual_verification' AND admin_decision IS NULL;
