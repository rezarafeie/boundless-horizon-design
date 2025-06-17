
-- Create admin_users table for secure admin authentication
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('superadmin', 'editor')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id)
);

-- Create subscription_plans table to make plans dynamic
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id TEXT NOT NULL UNIQUE, -- 'lite', 'pro', etc.
  name_en TEXT NOT NULL,
  name_fa TEXT NOT NULL,
  description_en TEXT,
  description_fa TEXT,
  price_per_gb INTEGER NOT NULL,
  api_type TEXT NOT NULL CHECK (api_type IN ('marzban', 'marzneshin')),
  default_data_limit_gb INTEGER NOT NULL DEFAULT 10,
  default_duration_days INTEGER NOT NULL DEFAULT 30,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create panel_servers table for dynamic panel management
CREATE TABLE public.panel_servers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('marzban', 'marzneshin')),
  panel_url TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  country_en TEXT NOT NULL,
  country_fa TEXT NOT NULL,
  default_inbounds JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_health_check TIMESTAMP WITH TIME ZONE,
  health_status TEXT DEFAULT 'unknown' CHECK (health_status IN ('online', 'offline', 'unknown')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create discount_codes table with usage tracking
CREATE TABLE public.discount_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value INTEGER NOT NULL,
  description TEXT,
  applicable_plans JSONB NOT NULL DEFAULT '["all"]'::jsonb,
  usage_limit_per_user INTEGER DEFAULT 1,
  total_usage_limit INTEGER,
  current_usage_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create plan_panel_mappings table to link plans with panels
CREATE TABLE public.plan_panel_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE CASCADE NOT NULL,
  panel_id UUID REFERENCES public.panel_servers(id) ON DELETE CASCADE NOT NULL,
  inbound_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create discount_usage_logs table for tracking usage
CREATE TABLE public.discount_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discount_code_id UUID REFERENCES public.discount_codes(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_mobile TEXT,
  discount_amount INTEGER NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin_audit_logs table for tracking admin actions
CREATE TABLE public.admin_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add updated_at trigger to tables
CREATE TRIGGER admin_users_updated_at 
  BEFORE UPDATE ON public.admin_users 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER subscription_plans_updated_at 
  BEFORE UPDATE ON public.subscription_plans 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER panel_servers_updated_at 
  BEFORE UPDATE ON public.panel_servers 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER discount_codes_updated_at 
  BEFORE UPDATE ON public.discount_codes 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panel_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_panel_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin access
CREATE POLICY "Admin users can manage admin_users" 
  ON public.admin_users 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.user_id = auth.uid() AND au.role = 'superadmin' AND au.is_active = true
  ));

CREATE POLICY "Admins can manage subscription plans" 
  ON public.subscription_plans 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.user_id = auth.uid() AND au.is_active = true
  ));

CREATE POLICY "Public can view active subscription plans" 
  ON public.subscription_plans 
  FOR SELECT 
  USING (is_active = true AND is_visible = true);

CREATE POLICY "Admins can manage panel servers" 
  ON public.panel_servers 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.user_id = auth.uid() AND au.is_active = true
  ));

CREATE POLICY "Admins can manage discount codes" 
  ON public.discount_codes 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.user_id = auth.uid() AND au.is_active = true
  ));

CREATE POLICY "Public can view active discount codes" 
  ON public.discount_codes 
  FOR SELECT 
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Admins can manage plan panel mappings" 
  ON public.plan_panel_mappings 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.user_id = auth.uid() AND au.is_active = true
  ));

CREATE POLICY "Admins can view discount usage logs" 
  ON public.discount_usage_logs 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.user_id = auth.uid() AND au.is_active = true
  ));

CREATE POLICY "System can insert discount usage logs" 
  ON public.discount_usage_logs 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Admins can view audit logs" 
  ON public.admin_audit_logs 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.user_id = auth.uid() AND au.role = 'superadmin' AND au.is_active = true
  ));

CREATE POLICY "System can insert audit logs" 
  ON public.admin_audit_logs 
  FOR INSERT 
  WITH CHECK (true);

-- Insert default subscription plans (migrating from hardcoded data)
INSERT INTO public.subscription_plans (plan_id, name_en, name_fa, description_en, description_fa, price_per_gb, api_type) VALUES
('lite', 'Boundless Network Lite', 'شبکه بدون مرز لایت', 'Basic connection with Germany, Finland, Netherlands - suitable for daily use', 'اتصال پایه با آلمان، فنلاند، هلند - مناسب برای کاربری روزمره', 3200, 'marzban'),
('pro', 'Boundless Network Pro', 'شبکه بدون مرز پرو', 'Premium with USA, UK, Germany, Finland, Netherlands - best performance', 'پریمیوم با آمریکا، انگلیس، آلمان، فنلاند، هلند - بهترین عملکرد', 4200, 'marzneshin');

-- Insert default discount codes (migrating from hardcoded data)
INSERT INTO public.discount_codes (code, discount_type, discount_value, description, applicable_plans) VALUES
('WELCOME10', 'percentage', 10, 'Welcome discount for new users', '["all"]'),
('SAVE20', 'percentage', 20, 'Limited time 20% discount', '["all"]'),
('STUDENT15', 'percentage', 15, 'Student discount', '["lite", "pro"]');
