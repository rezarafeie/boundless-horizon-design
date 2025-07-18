-- Add default webhook payload parameters for common webhook scenarios
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