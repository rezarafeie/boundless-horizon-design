
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

  const mapServiceNameToProtocol = (serviceName: string): string => {
    const name = serviceName.toLowerCase();
    
    // Enhanced mapping based on your specific service names
    if (name.includes('direct')) return 'vless';
    if (name.includes('tunnel')) return 'vmess';
    if (name.includes('trojan')) return 'trojan';
    if (name.includes('shadow')) return 'shadowsocks';
    if (name === 'userinfo') return 'vless'; // UserInfo service
    
    // Country-specific mappings (default to vmess for tunnels, vless for direct)
    if (name.includes('romania') || name.includes('finland') || name.includes('austria') || 
        name.includes('germany') || name.includes('netherlands') || name.includes('turkey') || 
        name.includes('uk') || name.includes('us') || name.includes('poland')) {
      return name.includes('direct') ? 'vless' : 'vmess';
    }
    
    // Default fallback
    return 'vless';
  };

  const refreshPanelConfig = async () => {
    setIsRefreshing(true);
    console.log('=== PANEL REFRESH: Starting for panel:', panel.name, 'Type:', panel.type);

    try {
      // Use correct authentication endpoint based on panel type
      const authEndpoint = panel.type === 'marzneshin' 
        ? `${panel.panel_url}/api/admins/token`  // Marzneshin endpoint
        : `${panel.panel_url}/api/admin/token`;   // Marzban endpoint

      console.log('PANEL REFRESH: Using auth endpoint:', authEndpoint);

      // Authenticate
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

      let inbounds = {};
      let proxies = {};
      let enabledProtocols: string[] = [];
      let defaultInbounds: number[] = [];
      let totalConfigs = 0;

      if (panel.type === 'marzneshin') {
        console.log('PANEL REFRESH: Processing Marzneshin panel with FIXED service mapping');
        
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

        // Step 2: Get services list to map service IDs to names
        const servicesResponse = await fetch(`${panel.panel_url}/api/services`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!servicesResponse.ok) {
          throw new Error(`Failed to fetch services: ${servicesResponse.status} - ${servicesResponse.statusText}`);
        }

        const servicesData = await servicesResponse.json();
        console.log('PANEL REFRESH: Raw services API response:', JSON.stringify(servicesData, null, 2));

        // FIXED: Handle the actual API response structure
        let allServiceIds: number[] = [];
        let serviceNames: string[] = [];

        if (servicesData.service_ids && servicesData.service_names) {
          // Direct structure
          allServiceIds = servicesData.service_ids;
          serviceNames = servicesData.service_names;
        } else if (Array.isArray(servicesData)) {
          // Array of services
          allServiceIds = servicesData.map((service: any) => service.id || service.service_id);
          serviceNames = servicesData.map((service: any) => service.name || service.service_name);
        } else {
          console.error('PANEL REFRESH: Unexpected services API response structure:', servicesData);
          throw new Error('Unable to parse services API response. Expected service_ids and service_names arrays.');
        }
        
        console.log('PANEL REFRESH: Parsed services:', {
          total: allServiceIds.length,
          serviceIds: allServiceIds,
          serviceNames: serviceNames
        });

        // FIXED: Validate arrays have same length
        if (allServiceIds.length !== serviceNames.length) {
          console.error('PANEL REFRESH: Service IDs and names arrays length mismatch:', {
            serviceIdsLength: allServiceIds.length,
            serviceNamesLength: serviceNames.length
          });
          throw new Error(`Service IDs (${allServiceIds.length}) and names (${serviceNames.length}) arrays have different lengths.`);
        }

        // Step 3: Create service mapping
        const serviceMap: Record<number, string> = {};
        allServiceIds.forEach((id: number, index: number) => {
          if (serviceNames[index]) {
            serviceMap[id] = serviceNames[index];
          }
        });

        console.log('PANEL REFRESH: Created service mapping:', serviceMap);

        // Step 4: Process matched services
        const matchedServices = serviceIds.filter((id: number) => serviceMap[id]);
        
        if (matchedServices.length === 0) {
          console.error('PANEL REFRESH: No matching services found for user service_ids:', serviceIds);
          console.error('PANEL REFRESH: Available service mapping:', serviceMap);
          throw new Error(`No valid services found for service_ids: ${serviceIds.join(', ')}. Available services: ${Object.keys(serviceMap).join(', ')}`);
        }

        console.log('PANEL REFRESH: Successfully matched services:', 
          matchedServices.map(id => `${id}:${serviceMap[id]}`));

        // Step 5: Use service_ids as default inbounds and create enhanced protocol mapping
        defaultInbounds = matchedServices;
        
        // Group services by inferred protocol with enhanced mapping
        const protocolGroups: Record<string, number[]> = {};
        const protocolProxies: Record<string, any> = {};

        matchedServices.forEach((serviceId: number) => {
          const serviceName = serviceMap[serviceId] || 'unknown';
          const protocol = mapServiceNameToProtocol(serviceName);
          
          if (!protocolGroups[protocol]) {
            protocolGroups[protocol] = [];
            protocolProxies[protocol] = {};
          }
          
          protocolGroups[protocol].push(serviceId);
          protocolProxies[protocol][`service_${serviceId}`] = {
            id: serviceId,
            name: serviceName,
            tag: `service_${serviceId}`,
            protocol: protocol,
            location: serviceName.replace(/tunnel|direct/gi, '').replace(/([A-Z])/g, ' $1').trim()
          };
        });

        inbounds = protocolGroups;
        proxies = protocolProxies;
        enabledProtocols = Object.keys(protocolGroups);
        totalConfigs = matchedServices.length;

        console.log('PANEL REFRESH: FIXED Marzneshin service mapping completed:', {
          defaultInbounds,
          enabledProtocols,
          totalConfigs,
          protocolBreakdown: Object.entries(protocolGroups).map(([protocol, ids]) => ({
            protocol,
            count: ids.length,
            services: ids.map(id => serviceMap[id])
          }))
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
        console.log('PANEL REFRESH: Marzban config data received');

        inbounds = configData.inbounds || {};
        proxies = configData.proxies || {};
        enabledProtocols = Object.keys(proxies);
        
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
            last_refresh: new Date().toISOString(),
            workaround_used: panel.type === 'marzneshin' ? 'fixed_service_mapping_v2' : false,
            service_details: panel.type === 'marzneshin' ? {
              total_services: totalConfigs,
              protocol_breakdown: enabledProtocols.map(protocol => ({
                protocol,
                count: (inbounds as any)[protocol]?.length || 0
              }))
            } : undefined
          },
          enabled_protocols: enabledProtocols,
          default_inbounds: defaultInbounds
        })
        .eq('id', panel.id);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      // Log the refresh with enhanced details
      const { error: logError } = await supabase
        .from('panel_refresh_logs')
        .insert({
          panel_id: panel.id,
          refresh_result: true,
          configs_fetched: totalConfigs,
          response_data: { 
            inbounds, 
            proxies, 
            enabledProtocols, 
            defaultInbounds,
            workaround_used: panel.type === 'marzneshin' ? 'fixed_service_mapping_v2' : false,
            service_mapping: panel.type === 'marzneshin' ? 
              enabledProtocols.map(protocol => ({
                protocol,
                service_count: (inbounds as any)[protocol]?.length || 0
              })) : undefined
          }
        });

      if (logError) {
        console.error('Failed to log refresh:', logError);
      }

      console.log('PANEL REFRESH: Success for', panel.type);
      
      if (enabledProtocols.length === 0) {
        toast.error(`⚠️ No protocols enabled - panel cannot create users`);
      } else {
        const workaroundMsg = panel.type === 'marzneshin' ? ' (using FIXED service mapping v2)' : '';
        const protocolSummary = enabledProtocols.length > 1 ? 
          `${enabledProtocols.length} protocols (${enabledProtocols.join(', ')})` : 
          enabledProtocols[0];
        toast.success(`Panel config refreshed successfully${workaroundMsg}! Found ${totalConfigs} services across ${protocolSummary}.`);
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
                      <span>{log.configs_fetched || 0} services</span>
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
