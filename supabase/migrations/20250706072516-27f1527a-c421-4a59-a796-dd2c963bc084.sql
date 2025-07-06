-- Phase 1: Add is_primary field to webhook_config table
ALTER TABLE webhook_config 
ADD COLUMN is_primary boolean NOT NULL DEFAULT false;

-- Create unique constraint to ensure only one primary webhook config
CREATE UNIQUE INDEX webhook_config_primary_unique 
ON webhook_config (is_primary) 
WHERE is_primary = true;

-- Set the most recent webhook config as primary (Make.com URL)
UPDATE webhook_config 
SET is_primary = true 
WHERE id = (
  SELECT id 
  FROM webhook_config 
  WHERE is_enabled = true 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- Add comment for clarity
COMMENT ON COLUMN webhook_config.is_primary IS 'Only one webhook config can be primary at a time. The primary config is used for all webhook notifications.';