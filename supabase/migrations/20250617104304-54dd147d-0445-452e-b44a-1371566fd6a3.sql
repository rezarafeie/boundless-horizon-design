
-- Add protocol column to subscriptions table
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS protocol text;

-- Verify the table structure and add any missing columns that might be expected by the form
-- Add default values for better compatibility
ALTER TABLE public.subscriptions ALTER COLUMN protocol SET DEFAULT 'vmess';

-- Add an index on mobile for better performance when filtering by mobile number
CREATE INDEX IF NOT EXISTS idx_subscriptions_mobile ON public.subscriptions(mobile);

-- Add an index on status for admin queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- Update the table comment to reflect the protocol addition
COMMENT ON COLUMN public.subscriptions.protocol IS 'VPN protocol type (vmess, vless, trojan, etc.)';
