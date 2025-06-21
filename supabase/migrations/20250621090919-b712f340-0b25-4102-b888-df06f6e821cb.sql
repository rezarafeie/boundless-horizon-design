
-- Add enabled_protocols column to panel_servers table
ALTER TABLE public.panel_servers 
ADD COLUMN enabled_protocols jsonb NOT NULL DEFAULT '["vless", "vmess", "trojan", "shadowsocks"]'::jsonb;

-- Add panel_config_data column to store fetched configuration data
ALTER TABLE public.panel_servers 
ADD COLUMN panel_config_data jsonb DEFAULT '{}'::jsonb;

-- Create table for panel refresh logs
CREATE TABLE public.panel_refresh_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  panel_id UUID NOT NULL REFERENCES public.panel_servers(id) ON DELETE CASCADE,
  refresh_result BOOLEAN NOT NULL,
  configs_fetched INTEGER DEFAULT 0,
  error_message TEXT,
  response_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_panel_refresh_logs_panel_id_created_at ON public.panel_refresh_logs(panel_id, created_at DESC);

-- Add RLS policy for admin access
ALTER TABLE public.panel_refresh_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage panel refresh logs" 
  ON public.panel_refresh_logs 
  FOR ALL 
  USING (true);
