
-- Update both panels to be Marzban type
UPDATE panel_servers 
SET type = 'marzban'
WHERE type = 'marzneshin';

-- Update all subscription plans to use marzban API type
UPDATE subscription_plans 
SET api_type = 'marzban'
WHERE api_type = 'marzneshin';

-- Update plan panel mappings to ensure both plans use marzban panels
UPDATE plan_panel_mappings 
SET panel_id = (
  SELECT id FROM panel_servers 
  WHERE type = 'marzban' AND is_active = true 
  LIMIT 1
)
WHERE panel_id IN (
  SELECT id FROM panel_servers 
  WHERE type = 'marzneshin'
);

-- Ensure we have proper health status
UPDATE panel_servers 
SET health_status = 'online', last_health_check = NOW()
WHERE type = 'marzban' AND is_active = true;
