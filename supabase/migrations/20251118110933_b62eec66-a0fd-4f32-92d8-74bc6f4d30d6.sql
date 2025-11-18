-- Fix foreign key constraints to allow plan deletion
-- Drop existing foreign keys and recreate with CASCADE

-- Fix plan_panel_mappings foreign key
ALTER TABLE plan_panel_mappings 
  DROP CONSTRAINT IF EXISTS plan_panel_mappings_plan_id_fkey,
  ADD CONSTRAINT plan_panel_mappings_plan_id_fkey 
    FOREIGN KEY (plan_id) 
    REFERENCES subscription_plans(id) 
    ON DELETE CASCADE;

-- Fix subscriptions foreign key  
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_id_fkey,
  ADD CONSTRAINT subscriptions_plan_id_fkey
    FOREIGN KEY (plan_id)
    REFERENCES subscription_plans(id)
    ON DELETE SET NULL;

-- Fix vpn_services foreign key
ALTER TABLE vpn_services
  DROP CONSTRAINT IF EXISTS vpn_services_plan_id_fkey,
  ADD CONSTRAINT vpn_services_plan_id_fkey
    FOREIGN KEY (plan_id)
    REFERENCES subscription_plans(id)
    ON DELETE SET NULL;