-- Fix the can_create_free_trial function with proper transaction handling
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
  lock_acquired boolean := false;
BEGIN
  three_days_ago := now() - interval '3 days';
  
  -- Log the function call
  RAISE NOTICE 'FREE_TRIAL_CHECK: Checking for email: %, phone: %, fingerprint: %', p_email, p_phone, p_device_fingerprint;
  RAISE NOTICE 'FREE_TRIAL_CHECK: Three days ago: %', three_days_ago;
  
  -- Try to acquire an advisory lock to prevent race conditions
  -- Use a hash of email+phone as lock key
  BEGIN
    SELECT pg_try_advisory_lock(hashtext(p_email || '|' || p_phone)) INTO lock_acquired;
    
    IF NOT lock_acquired THEN
      RAISE NOTICE 'FREE_TRIAL_CHECK: Could not acquire lock, another request in progress';
      RETURN false;
    END IF;
    
    -- Count existing trials
    SELECT COUNT(*) INTO existing_count
    FROM test_users
    WHERE (
      email = p_email OR 
      phone_number = p_phone OR
      (p_device_fingerprint IS NOT NULL AND user_device_fingerprint = p_device_fingerprint)
    )
    AND created_at > three_days_ago;
    
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
    
    -- Release the advisory lock
    PERFORM pg_advisory_unlock(hashtext(p_email || '|' || p_phone));
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Make sure to release the lock on any error
      IF lock_acquired THEN
        PERFORM pg_advisory_unlock(hashtext(p_email || '|' || p_phone));
      END IF;
      RAISE;
  END;
  
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