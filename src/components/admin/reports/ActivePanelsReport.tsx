import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Server, Users, Activity, Database, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '../DateRangeSelector';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ActivePanelsReportProps {
  refreshTrigger: number;
  dateRange: DateRange;
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
  isNotImplemented?: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const ActivePanelsReport = ({ refreshTrigger, dateRange }: ActivePanelsReportProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [panels, setPanels] = useState<PanelInfo[]>([]);

  const loadPanelData = async () => {
    setLoading(true);
    try {
      // Fetch panels from database
      const { data: panelsData, error } = await supabase
        .from('panel_servers')
        .select('*')
        .eq('is_active', true);
      
      if (error) {
        throw error;
      }

      // Fetch system info for each panel with date filtering
      const panelsWithInfo: PanelInfo[] = await Promise.all(
        (panelsData || []).map(async (panel): Promise<PanelInfo> => {
          try {
            let systemInfo;
            
            if (panel.type === 'marzban') {
              const { data, error } = await supabase.functions.invoke('marzban-get-system-info', {
                body: { 
                  panelId: panel.id,
                  dateFrom: dateRange.from.toISOString(),
                  dateTo: dateRange.to.toISOString()
                }
              });
              
              if (error) {
                throw error;
              }
              
              if (!data?.success) {
                const errorMsg = data?.error || 'Failed to get system info';
                throw new Error(errorMsg);
              }
              
              systemInfo = data.systemInfo;
            } else if (panel.type === 'marzneshin') {
              const { data, error } = await supabase.functions.invoke('marzneshin-get-system-info', {
                body: { 
                  panelId: panel.id,
                  dateFrom: dateRange.from.toISOString(),
                  dateTo: dateRange.to.toISOString()
                }
              });
              
              if (error) {
                throw error;
              }
              
              if (!data?.success) {
                const errorMsg = data?.error || 'Failed to get system info';
                throw new Error(errorMsg);
              }
              
              systemInfo = data.systemInfo;
            } else {
              throw new Error(`Unknown panel type: ${panel.type}`);
            }
            
            return {
              id: panel.id,
              name: panel.name,
              type: panel.type,
              country_en: panel.country_en,
              health_status: panel.health_status,
              last_health_check: panel.last_health_check,
              systemInfo
            };
          } catch (error: any) {
            return {
              id: panel.id,
              name: panel.name,
              type: panel.type,
              country_en: panel.country_en,
              health_status: panel.health_status,
              last_health_check: panel.last_health_check,
              error: error.message,
              isNotImplemented: error.message === 'API_NOT_IMPLEMENTED'
            };
          }
        })
      );

      setPanels(panelsWithInfo);

    } catch (error: any) {
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
  }, [refreshTrigger, dateRange]);

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Active Panels Report</h2>
          <p className="text-sm text-muted-foreground">
            Data from {dateRange.preset === 'custom' 
              ? `${dateRange.from.toLocaleDateString()} to ${dateRange.to.toLocaleDateString()}`
              : dateRange.preset.toUpperCase()
            }
          </p>
        </div>
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
                  <div className={`p-4 border rounded-lg ${
                    panel.isNotImplemented 
                      ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' 
                      : 'bg-destructive/10 border-destructive/20'
                  }`}>
                    <p className={`text-sm font-medium ${
                      panel.isNotImplemented ? 'text-yellow-700 dark:text-yellow-300' : 'text-destructive'
                    }`}>
                      {panel.isNotImplemented ? 'Integration Pending' : 'Error'}
                    </p>
                    <p className={`text-sm ${
                      panel.isNotImplemented ? 'text-yellow-600 dark:text-yellow-400' : 'text-destructive/80'
                    }`}>
                      {panel.isNotImplemented ? 'Marzneshin API integration is coming soon' : panel.error}
                    </p>
                  </div>
                 ) : panel.systemInfo ? (
                   <div className="space-y-4">
                     {/* System Version */}
                     {panel.systemInfo.version && (
                       <div className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                         Version: {panel.systemInfo.version}
                       </div>
                     )}

                     {/* System Resources */}
                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                         <p className="text-sm font-medium flex items-center gap-2">
                           <Database className="w-4 h-4 text-blue-600" />
                           Memory
                         </p>
                         <p className="text-sm">
                           {panel.systemInfo.mem_used ? 
                             `${(panel.systemInfo.mem_used / (1024*1024*1024)).toFixed(1)} GB` : '0 GB'
                           } / {panel.systemInfo.mem_total ? 
                             `${(panel.systemInfo.mem_total / (1024*1024*1024)).toFixed(1)} GB` : '0 GB'
                           }
                         </p>
                         {panel.systemInfo.mem_total > 0 && (
                           <div className="w-full bg-muted h-2 rounded">
                             <div 
                               className="bg-blue-600 h-2 rounded transition-all duration-300"
                               style={{ width: `${(panel.systemInfo.mem_used / panel.systemInfo.mem_total) * 100}%` }}
                             />
                           </div>
                         )}
                       </div>
                       
                       <div className="space-y-1">
                         <p className="text-sm font-medium flex items-center gap-2">
                           <Activity className="w-4 h-4 text-green-600" />
                           CPU
                         </p>
                         <p className="text-sm">
                           {panel.systemInfo.cpu_usage || 0}% ({panel.systemInfo.cpu_cores || 0} cores)
                         </p>
                         <div className="w-full bg-muted h-2 rounded">
                           <div 
                             className="bg-green-600 h-2 rounded transition-all duration-300"
                             style={{ width: `${panel.systemInfo.cpu_usage || 0}%` }}
                           />
                         </div>
                       </div>
                     </div>

                      {/* User Statistics */}
                      <div className="pt-3 border-t">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="w-4 h-4" />
                          <span className="text-sm font-medium">User Statistics</span>
                        </div>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                              {formatNumber(panel.systemInfo.total_user || panel.systemInfo.total)}
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">Total</p>
                          </div>
                          
                          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <p className="text-lg font-bold text-green-700 dark:text-green-300">
                              {formatNumber(panel.systemInfo.online_users || panel.systemInfo.online)}
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400">Online</p>
                          </div>
                          
                          <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                              {formatNumber(panel.systemInfo.active_users || panel.systemInfo.active)}
                            </p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">Active</p>
                          </div>
                          
                          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
                              {formatNumber(panel.systemInfo.on_hold_users || panel.systemInfo.on_hold)}
                            </p>
                            <p className="text-xs text-yellow-600 dark:text-yellow-400">On Hold</p>
                          </div>
                          
                          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <p className="text-lg font-bold text-red-700 dark:text-red-300">
                              {formatNumber(panel.systemInfo.disabled_users || 0)}
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400">Disabled</p>
                          </div>
                          
                          <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <p className="text-lg font-bold text-orange-700 dark:text-orange-300">
                              {formatNumber(panel.systemInfo.expired_users || panel.systemInfo.expired)}
                            </p>
                            <p className="text-xs text-orange-600 dark:text-orange-400">Expired</p>
                          </div>
                          
                          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                              {formatNumber(panel.systemInfo.limited_users || panel.systemInfo.limited)}
                            </p>
                            <p className="text-xs text-purple-600 dark:text-purple-400">Limited</p>
                          </div>
                        </div>
                      </div>

                      {/* User Status Chart */}
                      {(panel.systemInfo.total_user || panel.systemInfo.total) > 0 && (
                        <div className="pt-3 border-t">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4" />
                            <span className="text-sm font-medium">User Distribution</span>
                          </div>
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={[
                                    { name: 'Online', value: panel.systemInfo.online_users || panel.systemInfo.online, color: COLORS[0] },
                                    { name: 'Active', value: panel.systemInfo.active_users || panel.systemInfo.active, color: COLORS[1] },
                                    { name: 'On Hold', value: panel.systemInfo.on_hold_users || panel.systemInfo.on_hold, color: COLORS[2] },
                                    { name: 'Disabled', value: panel.systemInfo.disabled_users || 0, color: COLORS[3] },
                                    { name: 'Expired', value: panel.systemInfo.expired_users || panel.systemInfo.expired, color: COLORS[4] },
                                    { name: 'Limited', value: panel.systemInfo.limited_users || panel.systemInfo.limited, color: '#FF6B6B' }
                                  ].filter(item => item.value > 0)}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, value }) => `${name}: ${value}`}
                                  outerRadius={60}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {[
                                    { name: 'Online', value: panel.systemInfo.online_users || panel.systemInfo.online, color: COLORS[0] },
                                    { name: 'Active', value: panel.systemInfo.active_users || panel.systemInfo.active, color: COLORS[1] },
                                    { name: 'On Hold', value: panel.systemInfo.on_hold_users || panel.systemInfo.on_hold, color: COLORS[2] },
                                    { name: 'Disabled', value: panel.systemInfo.disabled_users || 0, color: COLORS[3] },
                                    { name: 'Expired', value: panel.systemInfo.expired_users || panel.systemInfo.expired, color: COLORS[4] },
                                    { name: 'Limited', value: panel.systemInfo.limited_users || panel.systemInfo.limited, color: '#FF6B6B' }
                                  ].filter(item => item.value > 0).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                     {/* Bandwidth */}
                     <div className="pt-3 border-t">
                       <div className="flex items-center gap-2 mb-3">
                         <TrendingUp className="w-4 h-4" />
                         <span className="text-sm font-medium">Bandwidth Usage</span>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                         <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                           <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
                             {(panel.systemInfo.incoming_bandwidth / (1024*1024*1024)).toFixed(2)} GB
                           </p>
                           <p className="text-xs text-indigo-600 dark:text-indigo-400">Incoming</p>
                         </div>
                         <div className="text-center p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                           <p className="text-lg font-bold text-cyan-700 dark:text-cyan-300">
                             {(panel.systemInfo.outgoing_bandwidth / (1024*1024*1024)).toFixed(2)} GB
                           </p>
                           <p className="text-xs text-cyan-600 dark:text-cyan-400">Outgoing</p>
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
