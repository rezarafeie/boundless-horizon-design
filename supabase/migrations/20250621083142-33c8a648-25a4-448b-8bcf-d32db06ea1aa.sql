
-- Create a table to store panel test history
CREATE TABLE public.panel_test_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  panel_id UUID NOT NULL REFERENCES public.panel_servers(id) ON DELETE CASCADE,
  test_result BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  error_message TEXT,
  test_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_panel_test_logs_panel_id_created_at ON public.panel_test_logs(panel_id, created_at DESC);

-- Add RLS policy for admin access
ALTER TABLE public.panel_test_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage panel test logs" 
  ON public.panel_test_logs 
  FOR ALL 
  USING (true);
