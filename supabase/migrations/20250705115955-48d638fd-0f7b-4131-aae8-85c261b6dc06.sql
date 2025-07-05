-- Phase 1 & 2: Clean up duplicate webhook configurations and triggers

-- Remove the older webhook configuration (keep the newer one)
DELETE FROM webhook_config 
WHERE id = 'e63507d7-79d0-4a13-b568-4bbecf6eb45c' 
AND created_at < '2025-07-05 11:00:00';

-- Remove duplicate triggers (the duplicate referencing the deleted config will be cascaded)
-- But first, let's ensure we have the right triggers for the remaining config
DELETE FROM webhook_triggers 
WHERE webhook_config_id = 'e63507d7-79d0-4a13-b568-4bbecf6eb45c';

-- Add proper triggers for the remaining webhook config
INSERT INTO webhook_triggers (webhook_config_id, trigger_name, is_enabled)
SELECT 
    wc.id,
    unnest(ARRAY['test_account_creation', 'subscription_creation', 'manual_payment_approval', 'stripe_payment_success', 'zarinpal_payment_success']),
    true
FROM webhook_config wc 
WHERE wc.is_enabled = true
AND NOT EXISTS (
    SELECT 1 FROM webhook_triggers wt 
    WHERE wt.webhook_config_id = wc.id
);

-- Add constraint to prevent duplicate triggers per config
ALTER TABLE webhook_triggers 
ADD CONSTRAINT unique_trigger_per_config 
UNIQUE (webhook_config_id, trigger_name);