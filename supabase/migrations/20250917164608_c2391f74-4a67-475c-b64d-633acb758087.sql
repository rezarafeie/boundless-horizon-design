-- Update the RLS policy to allow 'online' health status as well as 'healthy'
DROP POLICY IF EXISTS "Public can view active panel servers for free trial" ON public.panel_servers;

CREATE POLICY "Public can view active panel servers for free trial" 
ON public.panel_servers 
FOR SELECT 
USING (is_active = true AND health_status IN ('healthy', 'online'));