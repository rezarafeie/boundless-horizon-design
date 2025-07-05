-- Fix the stuck subscription and ensure webhook notifications always have valid tokens
UPDATE subscriptions 
SET admin_decision_token = gen_random_uuid()::text,
    status = 'pending',
    admin_decision = 'pending'
WHERE id = '4dab46c5-06cf-4ba8-8ec2-fbb8217d9859' 
  AND admin_decision_token IS NULL;

-- Create a function to ensure subscriptions always have tokens when needed
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

-- Create trigger to auto-generate tokens
DROP TRIGGER IF EXISTS trigger_ensure_admin_decision_token ON subscriptions;
CREATE TRIGGER trigger_ensure_admin_decision_token
  BEFORE INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION ensure_admin_decision_token();