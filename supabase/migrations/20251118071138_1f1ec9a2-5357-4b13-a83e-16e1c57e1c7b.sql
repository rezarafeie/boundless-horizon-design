-- Drop all restrictive admin policies and create permissive ones

-- Subscription Plans
DROP POLICY IF EXISTS "Admins can manage subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Public can view active subscription plans" ON subscription_plans;
CREATE POLICY "Allow all operations on subscription_plans"
ON subscription_plans
FOR ALL
USING (true)
WITH CHECK (true);

-- Discount Codes
DROP POLICY IF EXISTS "Admins can manage discount codes" ON discount_codes;
DROP POLICY IF EXISTS "Public can view active discount codes" ON discount_codes;
CREATE POLICY "Allow all operations on discount_codes"
ON discount_codes
FOR ALL
USING (true)
WITH CHECK (true);

-- Subscriptions (Orders)
DROP POLICY IF EXISTS "Allow anonymous and authenticated users to create subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Authenticated users can delete their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can update subscriptions by mobile or user_id" ON subscriptions;
DROP POLICY IF EXISTS "Users can view subscriptions by mobile or user_id" ON subscriptions;
CREATE POLICY "Allow all operations on subscriptions"
ON subscriptions
FOR ALL
USING (true)
WITH CHECK (true);

-- Test Users
DROP POLICY IF EXISTS "Admins can manage test users" ON test_users;
DROP POLICY IF EXISTS "Admins can view test users" ON test_users;
DROP POLICY IF EXISTS "Anyone can view test users" ON test_users;
DROP POLICY IF EXISTS "Public can create test users" ON test_users;
CREATE POLICY "Allow all operations on test_users"
ON test_users
FOR ALL
USING (true)
WITH CHECK (true);

-- VPN Services
DROP POLICY IF EXISTS "Admins can manage VPN services" ON vpn_services;
DROP POLICY IF EXISTS "Public can view active VPN services" ON vpn_services;
CREATE POLICY "Allow all operations on vpn_services"
ON vpn_services
FOR ALL
USING (true)
WITH CHECK (true);

-- Webhook Config
DROP POLICY IF EXISTS "Admins can manage webhook config" ON webhook_config;
CREATE POLICY "Allow all operations on webhook_config"
ON webhook_config
FOR ALL
USING (true)
WITH CHECK (true);

-- Webhook Payload Config
DROP POLICY IF EXISTS "Admins can manage webhook payload config" ON webhook_payload_config;
CREATE POLICY "Allow all operations on webhook_payload_config"
ON webhook_payload_config
FOR ALL
USING (true)
WITH CHECK (true);

-- Webhook Triggers
DROP POLICY IF EXISTS "Admins can manage webhook triggers" ON webhook_triggers;
CREATE POLICY "Allow all operations on webhook_triggers"
ON webhook_triggers
FOR ALL
USING (true)
WITH CHECK (true);

-- Plan Panel Mappings
DROP POLICY IF EXISTS "Admins can manage plan panel mappings" ON plan_panel_mappings;
CREATE POLICY "Allow all operations on plan_panel_mappings"
ON plan_panel_mappings
FOR ALL
USING (true)
WITH CHECK (true);

-- Admin Users (already has public select, add full access)
DROP POLICY IF EXISTS "Allow public select for login" ON admin_users;
DROP POLICY IF EXISTS "Enable all for service role" ON admin_users;
CREATE POLICY "Allow all operations on admin_users"
ON admin_users
FOR ALL
USING (true)
WITH CHECK (true);

-- Discount Usage Logs
DROP POLICY IF EXISTS "Admins can view discount usage logs" ON discount_usage_logs;
DROP POLICY IF EXISTS "System can insert discount usage logs" ON discount_usage_logs;
CREATE POLICY "Allow all operations on discount_usage_logs"
ON discount_usage_logs
FOR ALL
USING (true)
WITH CHECK (true);

-- Panel Test Logs
DROP POLICY IF EXISTS "Admin can manage panel test logs" ON panel_test_logs;
CREATE POLICY "Allow all operations on panel_test_logs"
ON panel_test_logs
FOR ALL
USING (true)
WITH CHECK (true);

-- Panel Refresh Logs
DROP POLICY IF EXISTS "Admin can manage panel refresh logs" ON panel_refresh_logs;
CREATE POLICY "Allow all operations on panel_refresh_logs"
ON panel_refresh_logs
FOR ALL
USING (true)
WITH CHECK (true);

-- User Creation Logs
DROP POLICY IF EXISTS "Allow admin access to user creation logs" ON user_creation_logs;
CREATE POLICY "Allow all operations on user_creation_logs"
ON user_creation_logs
FOR ALL
USING (true)
WITH CHECK (true);

-- Admin Audit Logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON admin_audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON admin_audit_logs;
CREATE POLICY "Allow all operations on admin_audit_logs"
ON admin_audit_logs
FOR ALL
USING (true)
WITH CHECK (true);

-- Email Notifications (add policy if none exists)
CREATE POLICY "Allow all operations on email_notifications"
ON email_notifications
FOR ALL
USING (true)
WITH CHECK (true);

-- Webhook Logs
DROP POLICY IF EXISTS "System can insert webhook logs" ON webhook_logs;
CREATE POLICY "Allow all operations on webhook_logs"
ON webhook_logs
FOR ALL
USING (true)
WITH CHECK (true);

-- Payment Logs
DROP POLICY IF EXISTS "Users can view logs for their subscriptions or anonymous subscr" ON payment_logs;
CREATE POLICY "Allow all operations on payment_logs"
ON payment_logs
FOR ALL
USING (true)
WITH CHECK (true);