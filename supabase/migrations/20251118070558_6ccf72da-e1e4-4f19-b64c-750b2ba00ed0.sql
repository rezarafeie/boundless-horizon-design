-- Drop existing restrictive policy on panel_servers
DROP POLICY IF EXISTS "Admins can manage panel servers" ON panel_servers;

-- Create permissive policy allowing all operations on panel_servers
CREATE POLICY "Allow all operations on panel_servers"
ON panel_servers
FOR ALL
USING (true)
WITH CHECK (true);