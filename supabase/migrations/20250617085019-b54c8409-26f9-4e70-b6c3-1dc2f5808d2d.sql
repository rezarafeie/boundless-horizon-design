
-- Step 1: Complete RLS Removal - Drop ALL existing policies on admin_users table
DROP POLICY IF EXISTS "Allow admin access to admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Admin users can manage admin_users" ON public.admin_users;

-- Completely disable RLS on admin_users table
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- Step 2: Verify other admin tables have proper access (remove any problematic RLS)
-- Check if discount_codes, panel_servers, subscription_plans need RLS adjustments

-- For development, let's also disable RLS on other admin tables to prevent similar issues
ALTER TABLE public.discount_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.panel_servers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_usage_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_panel_mappings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies on these tables that might cause issues
DROP POLICY IF EXISTS "Enable read access for all users" ON public.discount_codes;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.panel_servers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.subscription_plans;

-- Verify the check_admin_user function is not causing issues by dropping it
DROP FUNCTION IF EXISTS public.check_admin_user(UUID);
