-- Fix missing admin_decision_token for pending subscriptions
UPDATE subscriptions 
SET admin_decision_token = gen_random_uuid()::text
WHERE status = 'pending' 
  AND admin_decision = 'pending' 
  AND admin_decision_token IS NULL;

-- Ensure the trigger function is working properly
CREATE OR REPLACE FUNCTION ensure_admin_decision_token()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate token if missing when status is pending and requires admin decision
  IF NEW.status = 'pending' 
     AND NEW.admin_decision = 'pending' 
     AND NEW.admin_decision_token IS NULL THEN
    NEW.admin_decision_token = gen_random_uuid()::text;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger to ensure it's active
DROP TRIGGER IF EXISTS trigger_ensure_admin_decision_token ON subscriptions;
CREATE TRIGGER trigger_ensure_admin_decision_token
  BEFORE INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION ensure_admin_decision_token();