
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Server, Users, Activity, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DebugLogger } from './DebugLogger';
import { useDebugLogger } from '@/hooks/useDebugLogger';

interface ActivePanelsReportProps {
  refreshTrigger: number;
}

interface PanelInfo {
  id: string;
  name: string;
  type: string;
  country_en: string;
  health_status: string;
  last_health_check: string | null;
  systemInfo?: any;
  error?: string;
}

export const ActivePanelsReport = ({ refreshTrigger }: ActivePanelsReportProps) => {
  const { toast } = useToast();
  const { logs, logApiCall, logInfo, logError, clearLogs } = useDebugLogger();
  const [loading, setLoading] = useState(false);
  const [panels, setPanels] = useState<PanelInfo[]>([]);

  const loadPanelData = async () => {
    setLoading(true);
    try {
      logInfo('Starting panel data load', { timestamp: new Date().toISOString() });

      // Fetch panels from database
      const panelsData = await logApiCall('Fetch panels from database', async () => {
        const { data, error } = await supabase
          .from('panel_servers')
          .select('*')
          .eq('is_active', true);
        
        if (error) {
          logError('Database query failed', error);
          throw error;
        }
        return data || [];
      });

      logInfo('Panels fetched from database', { count: panelsData.length, panels: panelsData });

      // Fetch system info for each panel
      const panelsWithInfo = await Promise.all(
        panelsData.map(async (panel) => {
          logInfo(`Processing panel: ${panel.name}`, { 
            panelId: panel.id, 
            type: panel.type,
            url: panel.panel_url,
            country: panel.country_en
          });
          
          try {
            let systemInfo;
            
            if (panel.type === 'marzban') {
              systemInfo = await logApiCall(`Get Marzban system info for ${panel.name}`, async () => {
                logInfo(`Calling marzban-get-system-info edge function`, { panelId: panel.id });
                
                const { data, error } = await supabase.functions.invoke('marzban-get-system-info', {
                  body: { panelId: panel.id }
                });
                
                if (error) {
                  logError(`Edge function invocation failed for ${panel.name}`, error);
                  throw error;
                }
                
                if (!data?.success) {
                  const errorMsg = data?.error || 'Failed to get system info';
                  logError(`Edge function returned error for ${panel.name}`, { error: errorMsg, data });
                  throw new Error(errorMsg);
                }
                
                logInfo(`System info received for ${panel.name}`, data.systemInfo);
                return data.systemInfo;
              });
            } else if (panel.type === 'marzneshin') {
              systemInfo = await logApiCall(`Get Marzneshin system info for ${panel.name}`, async () => {
                logInfo(`Calling marzneshin-get-system-info edge function`, { panelId: panel.id });
                
                const { data, error } = await supabase.functions.invoke('marzneshin-get-system-info', {
                  body: { panelId: panel.id }
                });
                
                if (error) {
                  logError(`Edge function invocation failed for ${panel.name}`, error);
                  throw error;
                }
                
                if (!data?.success) {
                  const errorMsg = data?.error || 'Failed to get system info';
                  logError(`Edge function returned error for ${panel.name}`, { error: errorMsg, data });
                  throw new Error(errorMsg);
                }
                
                logInfo(`System info received for ${panel.name}`, data.systemInfo);
                return data.systemInfo;
              });
            } else {
              logError(`Unknown panel type for ${panel.name}`, { type: panel.type });
              throw new Error(`Unknown panel type: ${panel.type}`);
            }
            
            logInfo(`System info loaded successfully for ${panel.name}`, systemInfo);
            
            return {
              ...panel,
              systemInfo
            };
          } catch (error: any) {
            logError(`Failed to load system info for ${panel.name}`, {
              error: error.message,
              stack: error.stack,
              panelId: panel.id,
              panelType: panel.type
            });
            
            return {
              ...panel,
              error: error.message
            };
          }
        })
      );

      setPanels(panelsWithInfo);
      logInfo('Panel data loading completed', { 
        totalPanels: panelsWithInfo.length,
        successfulPanels: panelsWithInfo.filter(p => !p.error).length,
        failedPanels: panelsWithInfo.filter(p => p.error).length
      });

    } catch (error: any) {
      logError('Failed to load panel data', {
        error: error.message,
        stack: error.stack,
        name: error.name
      });
      
      toast({
        title: "Error",
        description: "Failed to load panel data: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPanelData();
  }, [refreshTrigger]);

  const getStatusBadge = (status: string) => {
    const variants = {
      online: 'default',
      offline: 'destructive',
      unknown: 'secondary'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>;
  };

  const formatNumber = (num: number | undefined) => {
    return num ? num.toLocaleString() : '0';
  };

  return (
    <div className="space-y-4">
      <DebugLogger logs={logs} onClear={clearLogs} />
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Active Panels Report</h2>
        <Button onClick={loadPanelData} disabled={loading} size="sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading system information...</div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {panels.map((panel) => (
            <Card key={panel.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    {panel.name}
                  </CardTitle>
                  {getStatusBadge(panel.health_status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {panel.country_en} • {panel.type}
                </p>
              </CardHeader>
              
              <CardContent>
                {panel.error ? (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive font-medium">Error</p>
                    <p className="text-sm text-destructive/80">{panel.error}</p>
                  </div>
                ) : panel.systemInfo ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium">Total Users</p>
                          <p className="text-lg font-bold">{formatNumber(panel.systemInfo.total_user)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-green-600" />
                        <div>
                          <p className="text-sm font-medium">Online Users</p>
                          <p className="text-lg font-bold">{formatNumber(panel.systemInfo.online_users)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Active</p>
                        <p className="text-sm text-green-600">{formatNumber(panel.systemInfo.users_active)}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium">Expired</p>
                        <p className="text-sm text-yellow-600">{formatNumber(panel.systemInfo.users_expired)}</p>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4" />
                        <span className="text-sm font-medium">Bandwidth</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Incoming</p>
                          <p>{(panel.systemInfo.incoming_bandwidth / (1024*1024*1024)).toFixed(2)} GB</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Outgoing</p>
                          <p>{(panel.systemInfo.outgoing_bandwidth / (1024*1024*1024)).toFixed(2)} GB</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    No system information available
                  </div>
                )}
                
                {panel.last_health_check && (
                  <div className="mt-4 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      Last check: {new Date(panel.last_health_check).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          {panels.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No active panels found</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
