-- Update RLS policies for vpn_services to allow public creation
DROP POLICY IF EXISTS "Admins can manage VPN services" ON public.vpn_services;
DROP POLICY IF EXISTS "Public can view active VPN services" ON public.vpn_services;

-- Allow admins full access
CREATE POLICY "Admins can manage VPN services" 
ON public.vpn_services 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM admin_users au 
  WHERE au.user_id = auth.uid() AND au.is_active = true
));

-- Allow public to create services
CREATE POLICY "Public can create VPN services" 
ON public.vpn_services 
FOR INSERT 
WITH CHECK (true);

-- Allow public to view active services
CREATE POLICY "Public can view active VPN services" 
ON public.vpn_services 
FOR SELECT 
USING (status = 'active' OR EXISTS (
  SELECT 1 FROM admin_users au 
  WHERE au.user_id = auth.uid() AND au.is_active = true
));