
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Server, Users, Activity, HardDrive, Cpu } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PanelSystemInfo {
  version: string;
  mem_total: number;
  mem_used: number;
  cpu_cores: number;
  cpu_usage: number;
  total_user: number;
  online_users: number;
  users_active: number;
  users_on_hold: number;
  users_disabled: number;
  users_expired: number;
  users_limited: number;
  incoming_bandwidth: number;
  outgoing_bandwidth: number;
  incoming_bandwidth_speed: number;
  outgoing_bandwidth_speed: number;
}

interface PanelInfo {
  id: string;
  name: string;
  panel_url: string;
  type: string;
  country_en: string;
  health_status: string;
  systemInfo?: PanelSystemInfo;
  loading?: boolean;
  error?: string;
}

interface ActivePanelsReportProps {
  refreshTrigger: number;
}

export const ActivePanelsReport = ({ refreshTrigger }: ActivePanelsReportProps) => {
  const { toast } = useToast();
  const [panels, setPanels] = useState<PanelInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bps: number) => {
    if (bps === 0) return '0 bps';
    const k = 1000;
    const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps'];
    const i = Math.floor(Math.log(bps) / Math.log(k));
    return parseFloat((bps / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const loadPanels = async () => {
    setLoading(true);
    try {
      const { data: panelData, error } = await supabase
        .from('panel_servers')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      const panelsWithSystemInfo = panelData?.map(panel => ({
        id: panel.id,
        name: panel.name,
        panel_url: panel.panel_url,
        type: panel.type,
        country_en: panel.country_en,
        health_status: panel.health_status || 'unknown',
        loading: false,
        error: undefined
      })) || [];

      setPanels(panelsWithSystemInfo);

      // Load system info for each panel
      for (const panel of panelsWithSystemInfo) {
        loadPanelSystemInfo(panel.id);
      }

    } catch (error) {
      console.error('Error loading panels:', error);
      toast({
        title: "Error",
        description: "Failed to load panel information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPanelSystemInfo = async (panelId: string) => {
    setPanels(prev => prev.map(p => 
      p.id === panelId ? { ...p, loading: true, error: undefined } : p
    ));

    try {
      // Call the appropriate edge function based on panel type
      const panel = panels.find(p => p.id === panelId);
      if (!panel) return;

      let functionName = '';
      if (panel.type === 'marzban') {
        functionName = 'marzban-get-system-info';
      } else if (panel.type === 'marzneshin') {
        functionName = 'marzneshin-get-system-info';
      }

      if (!functionName) {
        throw new Error('Unsupported panel type');
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { panelId }
      });

      if (error) throw error;

      if (data.success) {
        setPanels(prev => prev.map(p => 
          p.id === panelId ? { 
            ...p, 
            systemInfo: data.systemInfo,
            loading: false,
            error: undefined
          } : p
        ));
      } else {
        throw new Error(data.error || 'Failed to get system info');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setPanels(prev => prev.map(p => 
        p.id === panelId ? { 
          ...p, 
          loading: false,
          error: errorMessage
        } : p
      ));
    }
  };

  useEffect(() => {
    loadPanels();
  }, [refreshTrigger]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Active Panels Report</h2>
        <Button onClick={loadPanels} disabled={loading} size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh All Panels
        </Button>
      </div>

      <div className="grid gap-6">
        {panels.map((panel) => (
          <Card key={panel.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  {panel.name}
                  <Badge className={getStatusColor(panel.health_status)}>
                    {panel.health_status}
                  </Badge>
                </div>
                <Button 
                  onClick={() => loadPanelSystemInfo(panel.id)}
                  disabled={panel.loading}
                  size="sm"
                  variant="outline"
                >
                  <RefreshCw className={`w-4 h-4 ${panel.loading ? 'animate-spin' : ''}`} />
                </Button>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {panel.type.toUpperCase()} • {panel.country_en} • {panel.panel_url}
              </p>
            </CardHeader>
            <CardContent>
              {panel.loading && (
                <div className="text-center py-4">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading system information...</p>
                </div>
              )}

              {panel.error && (
                <div className="text-center py-4">
                  <p className="text-sm text-red-600">{panel.error}</p>
                </div>
              )}

              {panel.systemInfo && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* System Info */}
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      System Info
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Version:</span>
                        <span className="font-mono">{panel.systemInfo.version}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Memory:</span>
                        <span className="font-mono">
                          {formatBytes(panel.systemInfo.mem_used)} / {formatBytes(panel.systemInfo.mem_total)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>CPU Cores:</span>
                        <span className="font-mono">{panel.systemInfo.cpu_cores}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CPU Usage:</span>
                        <span className="font-mono">{panel.systemInfo.cpu_usage}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Users */}
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Users
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Users:</span>
                        <span className="font-mono">{panel.systemInfo.total_user}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Online:</span>
                        <span className="font-mono text-green-600">{panel.systemInfo.online_users}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active:</span>
                        <span className="font-mono text-blue-600">{panel.systemInfo.users_active}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>On Hold:</span>
                        <span className="font-mono text-yellow-600">{panel.systemInfo.users_on_hold}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Disabled:</span>
                        <span className="font-mono text-red-600">{panel.systemInfo.users_disabled}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Expired:</span>
                        <span className="font-mono text-gray-600">{panel.systemInfo.users_expired}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Limited:</span>
                        <span className="font-mono text-orange-600">{panel.systemInfo.users_limited}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bandwidth */}
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Bandwidth
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Incoming:</span>
                        <span className="font-mono">{formatBytes(panel.systemInfo.incoming_bandwidth)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Outgoing:</span>
                        <span className="font-mono">{formatBytes(panel.systemInfo.outgoing_bandwidth)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>In Speed:</span>
                        <span className="font-mono">{formatSpeed(panel.systemInfo.incoming_bandwidth_speed)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Out Speed:</span>
                        <span className="font-mono">{formatSpeed(panel.systemInfo.outgoing_bandwidth_speed)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total:</span>
                        <span className="font-mono font-bold">
                          {formatBytes(panel.systemInfo.incoming_bandwidth + panel.systemInfo.outgoing_bandwidth)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {panels.length === 0 && !loading && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              No active panels found. Add panels in the Panels management section.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
