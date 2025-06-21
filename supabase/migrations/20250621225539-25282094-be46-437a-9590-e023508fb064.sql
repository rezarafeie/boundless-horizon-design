
-- Add plan_id column to subscriptions table to establish relationship with subscription_plans
ALTER TABLE public.subscriptions 
ADD COLUMN plan_id UUID REFERENCES public.subscription_plans(id);

-- Create an index on the new foreign key for better query performance
CREATE INDEX idx_subscriptions_plan_id ON public.subscriptions(plan_id);

-- Update existing subscriptions to have a plan_id (assign to first available plan)
-- This ensures existing data works with the new relationship
UPDATE public.subscriptions 
SET plan_id = (
  SELECT id 
  FROM public.subscription_plans 
  WHERE is_active = true 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE plan_id IS NULL;
