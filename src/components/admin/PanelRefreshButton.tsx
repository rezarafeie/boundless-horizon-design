
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

interface MarzneshinInbound {
  id: number;
  tag: string;
  protocol: string;
  port: number;
  settings: any;
  stream_settings: any;
  sniffing: any;
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

      // Process based on panel type
      let inbounds = {};
      let proxies = {};
      let enabledProtocols: string[] = [];
      let defaultInbounds: number[] = [];
      let totalConfigs = 0;

      if (panel.type === 'marzneshin') {
        console.log('PANEL REFRESH: Processing Marzneshin panel with dynamic inbound resolution');
        
        // Step 1: Get reza user's service_ids
        const userResponse = await fetch(`${panel.panel_url}/api/users/reza`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!userResponse.ok) {
          throw new Error(`Failed to fetch reza user: ${userResponse.status} - ${userResponse.statusText}`);
        }

        const userData = await userResponse.json();
        const serviceIds = userData.service_ids || [];
        console.log('PANEL REFRESH: Reza user service_ids:', serviceIds);

        if (serviceIds.length === 0) {
          throw new Error('Reza user has no service_ids configured. Please configure the reza user in the panel with proper services.');
        }

        // Step 2: Fetch all inbounds
        const inboundsResponse = await fetch(`${panel.panel_url}/api/inbounds`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!inboundsResponse.ok) {
          throw new Error(`Failed to fetch inbounds: ${inboundsResponse.status} - ${inboundsResponse.statusText}`);
        }

        const inboundsData = await inboundsResponse.json();
        const allInbounds: MarzneshinInbound[] = inboundsData.items || inboundsData || [];
        console.log('PANEL REFRESH: Fetched inbounds:', allInbounds.length);

        // Step 3: Filter inbounds that match service_ids
        const matchedInbounds = allInbounds.filter(inbound => 
          serviceIds.includes(inbound.id)
        );

        console.log('PANEL REFRESH: Matched inbounds:', matchedInbounds.length, 'out of', allInbounds.length);

        if (matchedInbounds.length === 0) {
          throw new Error(`No inbounds found matching service_ids: ${serviceIds.join(', ')}. Please check panel inbound configuration.`);
        }

        // Step 4: Process matched inbounds
        defaultInbounds = matchedInbounds.map(inbound => inbound.id);
        
        // Group by protocol for legacy compatibility
        const protocolGroups: Record<string, number[]> = {};
        const protocolProxies: Record<string, any> = {};

        matchedInbounds.forEach(inbound => {
          const protocol = inbound.protocol || 'unknown';
          if (!protocolGroups[protocol]) {
            protocolGroups[protocol] = [];
            protocolProxies[protocol] = {};
          }
          protocolGroups[protocol].push(inbound.id);
          protocolProxies[protocol][inbound.tag] = inbound;
        });

        inbounds = protocolGroups;
        proxies = protocolProxies;
        enabledProtocols = Object.keys(protocolGroups);
        totalConfigs = matchedInbounds.length;

        console.log('PANEL REFRESH: Marzneshin processed data:', {
          defaultInbounds,
          enabledProtocols,
          totalConfigs,
          protocolGroups
        });

      } else {
        // For Marzban, use the original approach
        const configResponse = await fetch(`${panel.panel_url}/api/user/reza`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!configResponse.ok) {
          throw new Error(`Config fetch failed: ${configResponse.status} - ${configResponse.statusText}`);
        }

        const configData = await configResponse.json();
        console.log('PANEL REFRESH: Marzban config data received:', configData);

        inbounds = configData.inbounds || {};
        proxies = configData.proxies || {};
        enabledProtocols = Object.keys(proxies);
        
        // For Marzban, extract inbound IDs from the inbounds structure
        defaultInbounds = Object.entries(inbounds).flatMap(([protocol, tags]: [string, any]) => 
          Array.isArray(tags) ? tags.map((tag: string, index: number) => index) : []
        );
        
        totalConfigs = Object.values(inbounds as Record<string, any>).reduce((sum: number, protocols: any) => {
          const count = Array.isArray(protocols) ? protocols.length : 0;
          return sum + count;
        }, 0);
      }

      console.log('PANEL REFRESH: Final processed data:', {
        inbounds,
        proxies,
        enabledProtocols,
        defaultInbounds,
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
          default_inbounds: defaultInbounds
        })
        .eq('id', panel.id);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      // Log the refresh
      const { error: logError } = await supabase
        .from('panel_refresh_logs')
        .insert({
          panel_id: panel.id,
          refresh_result: true,
          configs_fetched: totalConfigs,
          response_data: { inbounds, proxies, enabledProtocols, defaultInbounds }
        });

      if (logError) {
        console.error('Failed to log refresh:', logError);
      }

      console.log('PANEL REFRESH: Success for', panel.type);
      
      if (enabledProtocols.length === 0) {
        toast.error(`⚠️ No protocols enabled - panel cannot create users`);
      } else {
        toast.success(`Panel config refreshed successfully! Found ${totalConfigs} configs across ${enabledProtocols.length} protocols.`);
      }
      
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
