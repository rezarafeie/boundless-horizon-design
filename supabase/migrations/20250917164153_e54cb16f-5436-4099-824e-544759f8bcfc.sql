-- Add RLS policy to allow public access to view active panel servers for free trial functionality
CREATE POLICY "Public can view active panel servers for free trial" 
ON public.panel_servers 
FOR SELECT 
USING (is_active = true AND health_status = 'healthy');