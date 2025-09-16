-- Fix the can_create_free_trial function to handle race conditions better
-- Add row locking to prevent race conditions
CREATE OR REPLACE FUNCTION public.can_create_free_trial(p_email text, p_phone text, p_device_fingerprint text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  last_trial_date timestamp with time zone;
  three_days_ago timestamp with time zone;
  existing_count integer;
BEGIN
  three_days_ago := now() - interval '3 days';
  
  -- Log the function call
  RAISE NOTICE 'FREE_TRIAL_CHECK: Checking for email: %, phone: %, fingerprint: %', p_email, p_phone, p_device_fingerprint;
  RAISE NOTICE 'FREE_TRIAL_CHECK: Three days ago: %', three_days_ago;
  
  -- Use FOR UPDATE to lock rows and prevent race conditions
  -- This will block concurrent calls until the transaction completes
  SELECT COUNT(*) INTO existing_count
  FROM test_users
  WHERE (
    email = p_email OR 
    phone_number = p_phone OR
    (p_device_fingerprint IS NOT NULL AND user_device_fingerprint = p_device_fingerprint)
  )
  AND created_at > three_days_ago
  FOR UPDATE;
  
  RAISE NOTICE 'FREE_TRIAL_CHECK: Found % existing trials in last 3 days', existing_count;
  
  -- Check for existing trial in the last 3 days by email, phone, or device fingerprint
  SELECT created_at INTO last_trial_date
  FROM test_users
  WHERE (
    email = p_email OR 
    phone_number = p_phone OR
    (p_device_fingerprint IS NOT NULL AND user_device_fingerprint = p_device_fingerprint)
  )
  AND created_at > three_days_ago
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no trial found in last 3 days, user can create one
  IF last_trial_date IS NULL THEN
    RAISE NOTICE 'FREE_TRIAL_CHECK: No recent trial found, allowing creation';
    RETURN true;
  ELSE
    RAISE NOTICE 'FREE_TRIAL_CHECK: Recent trial found at %, blocking creation', last_trial_date;
    RETURN false;
  END IF;
END;
$function$;

-- Add simple unique constraint to prevent exact duplicates within an hour
-- This will catch race conditions where identical requests come in simultaneously  
CREATE UNIQUE INDEX IF NOT EXISTS idx_test_users_email_phone_hour 
ON test_users (email, phone_number, date_trunc('hour', created_at));

-- Add constraint for device fingerprints too
CREATE UNIQUE INDEX IF NOT EXISTS idx_test_users_fingerprint_hour 
ON test_users (user_device_fingerprint, date_trunc('hour', created_at))
WHERE user_device_fingerprint IS NOT NULL;