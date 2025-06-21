
-- Add available_countries column to subscription_plans table
ALTER TABLE public.subscription_plans 
ADD COLUMN available_countries JSONB DEFAULT '[]'::jsonb;

-- Create an index for better performance when querying countries
CREATE INDEX idx_subscription_plans_countries ON public.subscription_plans USING GIN (available_countries);

-- Update existing plans with some sample countries
-- Update Lite plan with basic countries
UPDATE public.subscription_plans 
SET available_countries = '[
  {"code": "DE", "name": "Germany", "flag": "🇩🇪"},
  {"code": "FI", "name": "Finland", "flag": "🇫🇮"},
  {"code": "NL", "name": "Netherlands", "flag": "🇳🇱"}
]'::jsonb
WHERE plan_id = 'lite' OR LOWER(name_en) LIKE '%lite%';

-- Update Pro plan with more countries
UPDATE public.subscription_plans 
SET available_countries = '[
  {"code": "US", "name": "United States", "flag": "🇺🇸"},
  {"code": "GB", "name": "United Kingdom", "flag": "🇬🇧"},
  {"code": "DE", "name": "Germany", "flag": "🇩🇪"},
  {"code": "FI", "name": "Finland", "flag": "🇫🇮"},
  {"code": "NL", "name": "Netherlands", "flag": "🇳🇱"}
]'::jsonb
WHERE plan_id = 'pro' OR LOWER(name_en) LIKE '%pro%';
