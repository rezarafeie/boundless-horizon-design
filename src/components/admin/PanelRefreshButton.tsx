
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
    console.log('=== PANEL REFRESH: Starting for panel:', panel.name);

    try {
      // First authenticate to get the token
      const authResponse = await fetch(`${panel.panel_url}/api/admin/token`, {
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
        throw new Error(`Authentication failed: ${authResponse.status}`);
      }

      const authData = await authResponse.json();
      const token = authData.access_token;

      if (!token) {
        throw new Error('No access token received from panel');
      }

      console.log('PANEL REFRESH: Authentication successful');

      // Get user config (using a test username to fetch panel structure)
      const configResponse = await fetch(`${panel.panel_url}/api/user/reza`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!configResponse.ok) {
        throw new Error(`Config fetch failed: ${configResponse.status}`);
      }

      const configData = await configResponse.json();
      console.log('PANEL REFRESH: Config data received:', configData);

      // Extract inbounds and proxies
      const inbounds = configData.inbounds || {};
      const proxies = configData.proxies || {};
      
      // Determine enabled protocols from the proxies structure
      const enabledProtocols = Object.keys(proxies);
      
      // Count total configs
      const totalConfigs = Object.values(inbounds).reduce((sum: number, protocols: any) => {
        return sum + (Array.isArray(protocols) ? protocols.length : 0);
      }, 0);

      console.log('PANEL REFRESH: Extracted data:', {
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

      // Log the refresh
      await supabase
        .from('panel_refresh_logs')
        .insert({
          panel_id: panel.id,
          refresh_result: true,
          configs_fetched: totalConfigs,
          response_data: { inbounds, proxies, enabledProtocols }
        });

      console.log('PANEL REFRESH: Success');
      toast.success(`Panel config refreshed successfully! Found ${totalConfigs} configs across ${enabledProtocols.length} protocols.`);
      
      onRefreshComplete();
      await fetchRefreshLogs();

    } catch (error: any) {
      console.error('PANEL REFRESH: Error:', error);
      
      // Log the failed refresh
      await supabase
        .from('panel_refresh_logs')
        .insert({
          panel_id: panel.id,
          refresh_result: false,
          configs_fetched: 0,
          error_message: error.message
        });

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
