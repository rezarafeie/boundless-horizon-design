-- Add 'test' trigger for webhook testing
INSERT INTO webhook_triggers (webhook_config_id, trigger_name, is_enabled)
SELECT 
    wc.id,
    'test',
    true
FROM webhook_config wc 
WHERE wc.is_enabled = true
AND NOT EXISTS (
    SELECT 1 FROM webhook_triggers wt 
    WHERE wt.webhook_config_id = wc.id 
    AND wt.trigger_name = 'test'
);