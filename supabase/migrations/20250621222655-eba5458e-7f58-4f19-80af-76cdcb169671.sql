
-- Add assigned_panel_id field to subscription_plans table
ALTER TABLE public.subscription_plans 
ADD COLUMN assigned_panel_id UUID REFERENCES public.panel_servers(id);

-- Add index for better performance on panel lookups
CREATE INDEX idx_subscription_plans_assigned_panel ON public.subscription_plans(assigned_panel_id);

-- Update the handle_updated_at trigger to work with the new column
-- (The trigger should already exist and work automatically)
