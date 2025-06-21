
-- Activate the Lite plan to make it visible and active
UPDATE subscription_plans 
SET is_active = true, is_visible = true 
WHERE plan_id = 'lite' OR LOWER(name_en) LIKE '%lite%' OR LOWER(name_fa) LIKE '%lite%';

-- Ensure we have the correct API types set
UPDATE subscription_plans 
SET api_type = 'marzban' 
WHERE plan_id = 'lite' OR LOWER(name_en) LIKE '%lite%';

UPDATE subscription_plans 
SET api_type = 'marzneshin' 
WHERE plan_id = 'pro' OR LOWER(name_en) LIKE '%pro%';
