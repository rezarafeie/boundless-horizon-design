-- Check for existing free trial tracking and modify test_users table to add rate limiting

-- First, modify test_users table to track creation frequency
ALTER TABLE test_users ADD COLUMN IF NOT EXISTS user_ip_address inet;
ALTER TABLE test_users ADD COLUMN IF NOT EXISTS user_device_fingerprint text;

-- Create a function to check if user can create free trial (1 per 3 days)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;