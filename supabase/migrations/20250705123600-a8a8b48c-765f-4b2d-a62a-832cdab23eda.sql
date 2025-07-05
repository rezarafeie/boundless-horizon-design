-- Create VPN services table for predefined service packages
CREATE TABLE public.vpn_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  data_limit_gb INTEGER NOT NULL,
  price_toman INTEGER NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vpn_services ENABLE ROW LEVEL SECURITY;

-- Create policies for admin-only access
CREATE POLICY "Admins can manage VPN services" 
ON public.vpn_services 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM admin_users au 
  WHERE au.user_id = auth.uid() AND au.is_active = true
));

-- Create policy for public to view active services
CREATE POLICY "Public can view active VPN services" 
ON public.vpn_services 
FOR SELECT 
USING (status = 'active');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_vpn_services_updated_at
BEFORE UPDATE ON public.vpn_services
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add index for better performance
CREATE INDEX idx_vpn_services_plan_id ON public.vpn_services(plan_id);
CREATE INDEX idx_vpn_services_status ON public.vpn_services(status);