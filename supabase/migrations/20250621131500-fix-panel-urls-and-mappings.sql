
-- Update the panel URL for the marzneshin panel to use the new URL
UPDATE panel_servers 
SET panel_url = 'https://cp.rain.rest'
WHERE panel_url LIKE '%p.rain.%' AND type = 'marzneshin';

-- Ensure we have proper plan-panel mappings for both lite and pro plans
-- First, get the plan and panel IDs we need to work with
DO $$
DECLARE
    lite_plan_id UUID;
    pro_plan_id UUID;
    marzban_panel_id UUID;
    marzneshin_panel_id UUID;
BEGIN
    -- Get plan IDs
    SELECT id INTO lite_plan_id FROM subscription_plans WHERE plan_id = 'lite' OR LOWER(name_en) LIKE '%lite%' LIMIT 1;
    SELECT id INTO pro_plan_id FROM subscription_plans WHERE plan_id = 'pro' OR LOWER(name_en) LIKE '%pro%' LIMIT 1;
    
    -- Get panel IDs
    SELECT id INTO marzban_panel_id FROM panel_servers WHERE type = 'marzban' AND is_active = true LIMIT 1;
    SELECT id INTO marzneshin_panel_id FROM panel_servers WHERE type = 'marzneshin' AND is_active = true LIMIT 1;
    
    -- Clear existing mappings to avoid conflicts
    DELETE FROM plan_panel_mappings WHERE plan_id IN (lite_plan_id, pro_plan_id);
    
    -- Create mapping for Lite plan -> Marzban panel (if both exist)
    IF lite_plan_id IS NOT NULL AND marzban_panel_id IS NOT NULL THEN
        INSERT INTO plan_panel_mappings (plan_id, panel_id, is_primary, inbound_ids)
        VALUES (lite_plan_id, marzban_panel_id, true, '[]'::jsonb);
    END IF;
    
    -- Create mapping for Pro plan -> Marzneshin panel (if both exist)
    IF pro_plan_id IS NOT NULL AND marzneshin_panel_id IS NOT NULL THEN
        INSERT INTO plan_panel_mappings (plan_id, panel_id, is_primary, inbound_ids)
        VALUES (pro_plan_id, marzneshin_panel_id, true, '[]'::jsonb);
    END IF;
    
    RAISE NOTICE 'Updated panel mappings - Lite: %, Pro: %, Marzban: %, Marzneshin: %', 
        lite_plan_id, pro_plan_id, marzban_panel_id, marzneshin_panel_id;
END $$;

-- Ensure both plans are active and have correct API types
UPDATE subscription_plans 
SET api_type = 'marzban', is_active = true, is_visible = true 
WHERE plan_id = 'lite' OR LOWER(name_en) LIKE '%lite%';

UPDATE subscription_plans 
SET api_type = 'marzneshin', is_active = true, is_visible = true 
WHERE plan_id = 'pro' OR LOWER(name_en) LIKE '%pro%';

-- Update panel health status to online for active panels
UPDATE panel_servers 
SET health_status = 'online', last_health_check = NOW()
WHERE is_active = true;
