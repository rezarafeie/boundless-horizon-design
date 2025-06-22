
-- Create user creation logs table
CREATE TABLE user_creation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  panel_id UUID REFERENCES panel_servers(id) ON DELETE SET NULL,
  edge_function_name TEXT NOT NULL,
  request_data JSONB NOT NULL DEFAULT '{}',
  response_data JSONB,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  panel_url TEXT,
  panel_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX idx_user_creation_logs_subscription_id ON user_creation_logs(subscription_id);
CREATE INDEX idx_user_creation_logs_created_at ON user_creation_logs(created_at DESC);
CREATE INDEX idx_user_creation_logs_success ON user_creation_logs(success);

-- Enable RLS (Row Level Security)
ALTER TABLE user_creation_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow admin access (you may need to adjust this based on your admin authentication setup)
CREATE POLICY "Allow admin access to user creation logs" ON user_creation_logs
FOR ALL USING (true);
