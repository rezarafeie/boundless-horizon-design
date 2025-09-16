-- Fix infinite recursion in admin_users RLS policies
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Superadmins can manage admin users" ON admin_users;

-- Create safer RLS policies for admin_users that don't cause recursion
CREATE POLICY "Enable select for authenticated users based on user_id" 
ON admin_users FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Enable all for service role" 
ON admin_users FOR ALL 
USING (auth.role() = 'service_role');

-- Fix the free trial check function to be more robust
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
BEGIN
  three_days_ago := now() - interval '3 days';
  
  -- Create a consistent lock key from email and phone
  lock_key := abs(hashtext(p_email || '|' || p_phone));
  
  -- Try to acquire advisory lock with 5 second timeout
  IF NOT pg_try_advisory_lock(lock_key) THEN
    -- If we can't get the lock, deny the request to prevent race conditions
    RAISE LOG 'FREE_TRIAL_CHECK: Could not acquire lock for %, %, denying request', p_email, p_phone;
    RETURN false;
  END IF;
  
  BEGIN
    -- Count existing trials in last 3 days
    SELECT COUNT(*) INTO existing_count
    FROM test_users
    WHERE (
      email = p_email OR 
      phone_number = p_phone OR
      (p_device_fingerprint IS NOT NULL AND user_device_fingerprint = p_device_fingerprint)
    )
    AND created_at > three_days_ago;
    
    RAISE LOG 'FREE_TRIAL_CHECK: Found % existing trials for %, %', existing_count, p_email, p_phone;
    
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