-- Fix critical security issues by enabling RLS on tables that need it

-- Enable RLS on admin_users (has policies but RLS was disabled)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on webhook_config
ALTER TABLE webhook_config ENABLE ROW LEVEL SECURITY;

-- Enable RLS on webhook_payload_config
ALTER TABLE webhook_payload_config ENABLE ROW LEVEL SECURITY;

-- Enable RLS on webhook_triggers
ALTER TABLE webhook_triggers ENABLE ROW LEVEL SECURITY;

-- Create basic admin-only policies for webhook tables
CREATE POLICY "Admins can manage webhook config" 
ON webhook_config FOR ALL 
USING (EXISTS (
  SELECT 1 FROM admin_users au 
  WHERE au.user_id = auth.uid() AND au.is_active = true
));

CREATE POLICY "Admins can manage webhook payload config" 
ON webhook_payload_config FOR ALL 
USING (EXISTS (
  SELECT 1 FROM admin_users au 
  WHERE au.user_id = auth.uid() AND au.is_active = true
));

CREATE POLICY "Admins can manage webhook triggers" 
ON webhook_triggers FOR ALL 
USING (EXISTS (
  SELECT 1 FROM admin_users au 
  WHERE au.user_id = auth.uid() AND au.is_active = true
));

-- Create admin users policies
CREATE POLICY "Admins can view admin users" 
ON admin_users FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM admin_users au 
  WHERE au.user_id = auth.uid() AND au.is_active = true
));

CREATE POLICY "Superadmins can manage admin users" 
ON admin_users FOR ALL 
USING (EXISTS (
  SELECT 1 FROM admin_users au 
  WHERE au.user_id = auth.uid() AND au.role = 'superadmin' AND au.is_active = true
));

-- Fix function search paths for security
CREATE OR REPLACE FUNCTION can_create_free_trial(
  user_email text,
  user_phone text,
  user_ip inet DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
  last_trial_date timestamp with time zone;
  three_days_ago timestamp with time zone;
BEGIN
  three_days_ago := now() - interval '3 days';
  
  -- Check for existing trial in the last 3 days by email, phone, or IP
  SELECT created_at INTO last_trial_date
  FROM test_users
  WHERE (
    email = user_email OR 
    phone_number = user_phone OR 
    (user_ip IS NOT NULL AND ip_address = user_ip)
  )
  AND created_at > three_days_ago
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no trial found in last 3 days, user can create one
  RETURN last_trial_date IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;