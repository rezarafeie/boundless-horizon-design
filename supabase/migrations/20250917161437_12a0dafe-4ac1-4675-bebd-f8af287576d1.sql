-- Improve the free trial check function with better locking and validation
CREATE OR REPLACE FUNCTION public.can_create_free_trial(
  p_email text, 
  p_phone text, 
  p_device_fingerprint text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_count integer := 0;
  three_days_ago timestamp with time zone;
  lock_key bigint;
  lock_acquired boolean := false;
BEGIN
  three_days_ago := now() - interval '3 days';
  
  -- Create a consistent lock key from email and phone
  lock_key := abs(hashtext(p_email || '|' || p_phone));
  
  -- Try to acquire advisory lock with timeout
  SELECT pg_try_advisory_lock(lock_key) INTO lock_acquired;
  
  IF NOT lock_acquired THEN
    -- If we can't get the lock, deny the request to prevent race conditions
    RAISE LOG 'FREE_TRIAL_CHECK: Could not acquire lock for %, %, denying request', p_email, p_phone;
    RETURN false;
  END IF;
  
  BEGIN
    -- Count existing trials in last 3 days with enhanced validation
    SELECT COUNT(*) INTO existing_count
    FROM test_users
    WHERE (
      email = p_email OR 
      phone_number = p_phone OR
      (p_device_fingerprint IS NOT NULL AND user_device_fingerprint = p_device_fingerprint)
    )
    AND created_at > three_days_ago
    AND status != 'expired'; -- Only count active trials
    
    RAISE LOG 'FREE_TRIAL_CHECK: Found % existing trials for %, %', existing_count, p_email, p_phone;
    
    -- Also check for pending trials with same credentials
    IF existing_count = 0 THEN
      -- Double-check by looking for very recent entries (last 5 minutes) to catch rapid duplicates
      SELECT COUNT(*) INTO existing_count
      FROM test_users
      WHERE (email = p_email OR phone_number = p_phone)
      AND created_at > (now() - interval '5 minutes');
      
      IF existing_count > 0 THEN
        RAISE LOG 'FREE_TRIAL_CHECK: Found recent trial within 5 minutes, blocking: %', existing_count;
      END IF;
    END IF;
    
    -- Release the lock
    PERFORM pg_advisory_unlock(lock_key);
    
    -- Return true only if no existing trials found
    RETURN existing_count = 0;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Make sure to release the lock on any error
      PERFORM pg_advisory_unlock(lock_key);
      RAISE LOG 'FREE_TRIAL_CHECK: Error occurred, denying request: %', SQLERRM;
      RETURN false;
  END;
END;
$$;