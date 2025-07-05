-- Add default webhook payload parameters for common webhook scenarios
INSERT INTO webhook_payload_config (webhook_config_id, parameter_name, parameter_type, parameter_source, is_enabled)
SELECT 
    wc.id,
    param.name,
    param.type,
    param.source,
    true
FROM webhook_config wc 
CROSS JOIN (
    VALUES 
    -- Basic webhook metadata
    ('webhook_type', 'string', 'webhook_type'),
    ('trigger_type', 'string', 'type'),
    ('timestamp', 'string', 'created_at'),
    
    -- Subscription data
    ('subscription_id', 'string', 'subscription_id'),
    ('username', 'string', 'username'),
    ('mobile', 'string', 'mobile'),
    ('email', 'string', 'email'),
    ('status', 'string', 'status'),
    ('data_limit_gb', 'number', 'data_limit_gb'),
    ('duration_days', 'number', 'duration_days'),
    ('price_toman', 'number', 'amount'),
    ('expire_at', 'string', 'expire_at'),
    ('subscription_url', 'string', 'subscription_url'),
    ('protocol', 'string', 'protocol'),
    
    -- Plan data
    ('plan_name', 'string', 'plan_name'),
    ('plan_id', 'string', 'plan_id'),
    
    -- Panel data  
    ('panel_name', 'string', 'panel_name'),
    ('panel_type', 'string', 'panel_type'),
    ('panel_url', 'string', 'panel_url'),
    ('panel_country', 'string', 'panel_country'),
    
    -- Payment data
    ('payment_method', 'string', 'payment_method'),
    ('receipt_url', 'string', 'receipt_url'),
    ('approve_link', 'string', 'approve_link'),
    ('reject_link', 'string', 'reject_link'),
    
    -- Test user data
    ('test_user_id', 'string', 'test_user_id'),
    ('phone_number', 'string', 'phone_number'),
    ('is_free_trial', 'boolean', 'is_free_trial')
) AS param(name, type, source)
WHERE wc.is_enabled = true
AND NOT EXISTS (
    SELECT 1 FROM webhook_payload_config wpc 
    WHERE wpc.webhook_config_id = wc.id 
    AND wpc.parameter_name = param.name
);