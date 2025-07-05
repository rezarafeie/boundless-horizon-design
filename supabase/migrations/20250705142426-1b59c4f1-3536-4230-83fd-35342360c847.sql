-- Restore missing webhook triggers and payload parameters for all webhook configs
-- This ensures all webhook configs have the required associated data

-- First, let's create triggers for webhook configs that don't have them
INSERT INTO webhook_triggers (webhook_config_id, trigger_name, is_enabled)
SELECT DISTINCT wc.id, trigger_name, true
FROM webhook_config wc
CROSS JOIN (
  VALUES 
    ('manual_payment_approval'),
    ('test_account_creation'),
    ('subscription_creation'), 
    ('stripe_payment_success'),
    ('zarinpal_payment_success'),
    ('subscription_update')
) AS triggers(trigger_name)
WHERE NOT EXISTS (
  SELECT 1 FROM webhook_triggers wt 
  WHERE wt.webhook_config_id = wc.id 
  AND wt.trigger_name = triggers.trigger_name
);

-- Create default payload parameters for webhook configs that don't have them
INSERT INTO webhook_payload_config (webhook_config_id, parameter_name, parameter_type, parameter_source, is_enabled)
SELECT DISTINCT wc.id, param_name, 'system', param_source, true
FROM webhook_config wc
CROSS JOIN (
  VALUES 
    ('webhook_type', 'webhook_type'),
    ('trigger_type', 'type'),
    ('timestamp', 'created_at'),
    ('subscription_id', 'subscription_id'),
    ('username', 'username'),
    ('mobile', 'mobile'),
    ('email', 'email'),
    ('amount', 'price_toman'),
    ('plan_name', 'plan_name'),
    ('panel_name', 'panel_name'),
    ('data_limit_gb', 'data_limit_gb'),
    ('duration_days', 'duration_days'),
    ('status', 'status')
) AS params(param_name, param_source)
WHERE NOT EXISTS (
  SELECT 1 FROM webhook_payload_config wpc 
  WHERE wpc.webhook_config_id = wc.id 
  AND wpc.parameter_name = params.param_name
);