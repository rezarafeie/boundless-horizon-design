
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Panel {
  id: string;
  name: string;
  panel_url: string;
  username: string;
  password: string;
  type: 'marzban' | 'marzneshin';
}

interface RefreshLog {
  id: string;
  refresh_result: boolean;
  configs_fetched: number | null;
  error_message: string | null;
  created_at: string;
}

interface PanelRefreshButtonProps {
  panel: Panel;
  onRefreshComplete: () => void;
}

export const PanelRefreshButton = ({ panel, onRefreshComplete }: PanelRefreshButtonProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [refreshLogs, setRefreshLogs] = useState<RefreshLog[]>([]);

  const fetchRefreshLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('panel_refresh_logs')
        .select('*')
        .eq('panel_id', panel.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching refresh logs:', error);
        return;
      }

      setRefreshLogs(data || []);
    } catch (error) {
      console.error('Failed to fetch refresh logs:', error);
    }
  };

  const refreshPanelConfig = async () => {
    setIsRefreshing(true);
    console.log('=== PANEL REFRESH: Starting for panel:', panel.name, 'Type:', panel.type);

    try {
      // FIXED: Use correct authentication endpoint based on panel type
      const authEndpoint = panel.type === 'marzneshin' 
        ? `${panel.panel_url}/api/admins/token`  // Correct Marzneshin endpoint
        : `${panel.panel_url}/api/admin/token`;   // Marzban endpoint

      console.log('PANEL REFRESH: Using auth endpoint:', authEndpoint);

      // Authenticate with the correct endpoint
      const authResponse = await fetch(authEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: panel.username,
          password: panel.password,
        }),
      });

      if (!authResponse.ok) {
        throw new Error(`Authentication failed: ${authResponse.status} - ${authResponse.statusText}`);
      }

      const authData = await authResponse.json();
      const token = authData.access_token;

      if (!token) {
        throw new Error('No access token received from panel');
      }

      console.log('PANEL REFRESH: Authentication successful for', panel.type);

      // FIXED: Get user config with correct endpoint for Marzneshin
      let configResponse;
      if (panel.type === 'marzneshin') {
        // FIXED: Use specific user endpoint to get reza user's configuration
        configResponse = await fetch(`${panel.panel_url}/api/users/reza`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } else {
        // For Marzban, use the original approach
        configResponse = await fetch(`${panel.panel_url}/api/user/reza`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }

      if (!configResponse.ok) {
        throw new Error(`Config fetch failed: ${configResponse.status} - ${configResponse.statusText}`);
      }

      const configData = await configResponse.json();
      console.log('PANEL REFRESH: Config data received for', panel.type, ':', configData);

      // Extract inbounds and proxies based on panel type
      let inbounds = {};
      let proxies = {};
      let enabledProtocols: string[] = [];

      if (panel.type === 'marzneshin') {
        // For Marzneshin, extract from the user configuration response
        inbounds = configData.inbounds || {};
        proxies = configData.proxies || {};
        enabledProtocols = Object.keys(proxies);
      } else {
        // For Marzban, use the original extraction logic
        inbounds = configData.inbounds || {};
        proxies = configData.proxies || {};
        enabledProtocols = Object.keys(proxies);
      }
      
      // Count total configs - ensure we get a number with proper type checking
      const totalConfigs = Object.values(inbounds as Record<string, any>).reduce((sum: number, protocols: any) => {
        const count = Array.isArray(protocols) ? protocols.length : 0;
        return sum + count;
      }, 0);

      console.log('PANEL REFRESH: Extracted data for', panel.type, ':', {
        inbounds,
        proxies,
        enabledProtocols,
        totalConfigs
      });

      // Update panel with new config data
      const { error: updateError } = await supabase
        .from('panel_servers')
        .update({
          panel_config_data: {
            inbounds,
            proxies,
            last_refresh: new Date().toISOString()
          },
          enabled_protocols: enabledProtocols,
          default_inbounds: Object.entries(inbounds).flatMap(([protocol, tags]: [string, any]) => 
            Array.isArray(tags) ? tags.map((tag: string) => ({ protocol, tag })) : []
          )
        })
        .eq('id', panel.id);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      // Log the refresh - ensure all types match
      const { error: logError } = await supabase
        .from('panel_refresh_logs')
        .insert({
          panel_id: panel.id,
          refresh_result: true,
          configs_fetched: totalConfigs,
          response_data: { inbounds, proxies, enabledProtocols }
        });

      if (logError) {
        console.error('Failed to log refresh:', logError);
      }

      console.log('PANEL REFRESH: Success for', panel.type);
      toast.success(`Panel config refreshed successfully! Found ${totalConfigs} configs across ${enabledProtocols.length} protocols.`);
      
      onRefreshComplete();
      await fetchRefreshLogs();

    } catch (error: any) {
      console.error('PANEL REFRESH: Error for', panel.type, ':', error);
      
      // Log the failed refresh
      const { error: logError } = await supabase
        .from('panel_refresh_logs')
        .insert({
          panel_id: panel.id,
          refresh_result: false,
          configs_fetched: 0,
          error_message: error.message
        });

      if (logError) {
        console.error('Failed to log refresh error:', logError);
      }

      toast.error(`Failed to refresh panel config: ${error.message}`);
      await fetchRefreshLogs();
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleLogs = async () => {
    if (!showLogs) {
      await fetchRefreshLogs();
    }
    setShowLogs(!showLogs);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          onClick={refreshPanelConfig}
          disabled={isRefreshing}
          size="sm"
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Panel Settings'}
        </Button>
        
        <Button
          onClick={toggleLogs}
          size="sm"
          variant="ghost"
        >
          {showLogs ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
      </div>

      {showLogs && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Refresh History</CardTitle>
            <CardDescription className="text-xs">Last 5 refresh attempts</CardDescription>
          </CardHeader>
          <CardContent>
            {refreshLogs.length === 0 ? (
              <p className="text-sm text-gray-500">No refresh history available</p>
            ) : (
              <div className="space-y-2">
                {refreshLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant={log.refresh_result ? 'default' : 'destructive'}>
                        {log.refresh_result ? 'Success' : 'Failed'}
                      </Badge>
                      <span>{log.configs_fetched || 0} configs</span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
