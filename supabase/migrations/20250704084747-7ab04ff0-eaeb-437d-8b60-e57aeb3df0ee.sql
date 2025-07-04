-- Create test_users table to store test account information
CREATE TABLE test_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  panel_id UUID REFERENCES panel_servers(id) ON DELETE SET NULL,
  panel_name TEXT NOT NULL,
  subscription_url TEXT,
  expire_date TIMESTAMP WITH TIME ZONE NOT NULL,
  data_limit_bytes BIGINT NOT NULL DEFAULT 1073741824, -- 1GB default
  ip_address INET,
  device_info JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'deleted')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_test_users_email ON test_users(email);
CREATE INDEX idx_test_users_phone_number ON test_users(phone_number);
CREATE INDEX idx_test_users_status ON test_users(status);
CREATE INDEX idx_test_users_created_at ON test_users(created_at DESC);
CREATE INDEX idx_test_users_expire_date ON test_users(expire_date);

-- Enable Row Level Security
ALTER TABLE test_users ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can manage test users" ON test_users
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM admin_users au 
    WHERE au.user_id = auth.uid() AND au.is_active = true
  )
);

-- Create policy for public to insert test users (for the free trial form)
CREATE POLICY "Public can create test users" ON test_users
FOR INSERT WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_test_users_updated_at
BEFORE UPDATE ON test_users
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();