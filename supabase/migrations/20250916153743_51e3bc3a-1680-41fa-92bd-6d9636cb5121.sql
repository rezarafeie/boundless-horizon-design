-- Update can_create_free_trial function to properly handle IP and browser fingerprinting
CREATE OR REPLACE FUNCTION public.can_create_free_trial(
  user_email text, 
  user_phone text, 
  user_ip inet DEFAULT NULL,
  user_device_fingerprint text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  last_trial_date timestamp with time zone;
  three_days_ago timestamp with time zone;
BEGIN
  three_days_ago := now() - interval '3 days';
  
  -- Check for existing trial in the last 3 days by email, phone, IP, or device fingerprint
  SELECT created_at INTO last_trial_date
  FROM test_users
  WHERE (
    email = user_email OR 
    phone_number = user_phone OR 
    (user_ip IS NOT NULL AND ip_address = user_ip) OR
    (user_device_fingerprint IS NOT NULL AND user_device_fingerprint = user_device_fingerprint)
  )
  AND created_at > three_days_ago
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no trial found in last 3 days, user can create one
  RETURN last_trial_date IS NULL;
END;
$$;