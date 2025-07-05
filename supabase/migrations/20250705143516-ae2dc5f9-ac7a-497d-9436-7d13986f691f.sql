-- Phase 1: Clean up duplicate webhook triggers and payload parameters
-- First, delete duplicate triggers (keep only the first one per webhook_config_id and trigger_name)
DELETE FROM webhook_triggers 
WHERE id NOT IN (
    SELECT DISTINCT ON (webhook_config_id, trigger_name) id
    FROM webhook_triggers 
    ORDER BY webhook_config_id, trigger_name, created_at ASC
);

-- Delete duplicate payload parameters (keep only the first one per webhook_config_id and parameter_name)
DELETE FROM webhook_payload_config 
WHERE id NOT IN (
    SELECT DISTINCT ON (webhook_config_id, parameter_name) id
    FROM webhook_payload_config 
    ORDER BY webhook_config_id, parameter_name, created_at ASC
);

-- Phase 2: Add comprehensive default webhook payload parameters
INSERT INTO webhook_payload_config (webhook_config_id, parameter_name, parameter_type, parameter_source, is_enabled)
SELECT 
    wc.id,
    param.name,
    'system',
    param.source,
    true
FROM webhook_config wc 
CROSS JOIN (
    VALUES 
    -- Basic webhook metadata
    ('webhook_type', 'webhook_type'),
    ('trigger_type', 'type'),
    ('timestamp', 'created_at'),
    
    -- Subscription data
    ('subscription_id', 'subscription_id'),
    ('username', 'username'),
    ('mobile', 'mobile'),
    ('email', 'email'),
    ('status', 'status'),
    ('data_limit_gb', 'data_limit_gb'),
    ('duration_days', 'duration_days'),
    ('price_toman', 'amount'),
    ('expire_at', 'expire_at'),
    ('subscription_url', 'subscription_url'),
    ('protocol', 'protocol'),
    
    -- Plan data
    ('plan_name', 'plan_name'),
    ('plan_id', 'plan_id'),
    
    -- Panel data  
    ('panel_name', 'panel_name'),
    ('panel_type', 'panel_type'),
    ('panel_url', 'panel_url'),
    ('panel_country', 'panel_country'),
    
    -- Payment data
    ('payment_method', 'payment_method'),
    ('receipt_url', 'receipt_url'),
    ('approve_link', 'approve_link'),
    ('reject_link', 'reject_link'),
    
    -- Test user data
    ('test_user_id', 'test_user_id'),
    ('phone_number', 'phone_number'),
    ('is_free_trial', 'is_free_trial')
) AS param(name, source)
WHERE wc.is_enabled = true
AND NOT EXISTS (
    SELECT 1 FROM webhook_payload_config wpc 
    WHERE wpc.webhook_config_id = wc.id 
    AND wpc.parameter_name = param.name
);