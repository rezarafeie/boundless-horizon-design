-- Remove RLS policies from webhook tables to allow public access
DROP POLICY IF EXISTS "Admins can manage webhook config" ON webhook_config;
DROP POLICY IF EXISTS "Admins can manage webhook triggers" ON webhook_triggers;
DROP POLICY IF EXISTS "Admins can manage webhook payload config" ON webhook_payload_config;
DROP POLICY IF EXISTS "Admins can view webhook logs" ON webhook_logs;

-- Disable RLS on webhook tables
ALTER TABLE webhook_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_triggers DISABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_payload_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs DISABLE ROW LEVEL SECURITY;

-- Ensure test trigger exists for webhook testing
INSERT INTO webhook_config (webhook_url, method, headers, is_enabled) 
VALUES ('https://rafeie.app.n8n.cloud/webhook-test/bnetswewbmailnewusernotification', 'POST', '{}', true)
ON CONFLICT DO NOTHING;

-- Get the webhook config ID for the default config
DO $$
DECLARE
    config_id uuid;
BEGIN
    SELECT id INTO config_id FROM webhook_config LIMIT 1;
    
    -- Insert test trigger if it doesn't exist
    INSERT INTO webhook_triggers (webhook_config_id, trigger_name, is_enabled)
    VALUES (config_id, 'test', true)
    ON CONFLICT DO NOTHING;
    
    -- Insert manual payment trigger if it doesn't exist
    INSERT INTO webhook_triggers (webhook_config_id, trigger_name, is_enabled)
    VALUES (config_id, 'manual_payment_approval', true)
    ON CONFLICT DO NOTHING;
    
    -- Insert test account creation trigger if it doesn't exist
    INSERT INTO webhook_triggers (webhook_config_id, trigger_name, is_enabled)
    VALUES (config_id, 'test_account_creation', true)
    ON CONFLICT DO NOTHING;
END $$;