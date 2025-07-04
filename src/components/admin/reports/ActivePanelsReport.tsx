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
                // Handle "not implemented" as special case
                if (data?.error === 'not_implemented') {
                  throw new Error('API_NOT_IMPLEMENTED');
                }
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
                     {/* Basic Stats */}
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
                           <p className="text-sm font-medium">Active Users</p>
                           <p className="text-lg font-bold">{formatNumber(panel.systemInfo.users_active)}</p>
                         </div>
                       </div>
                     </div>

                     {/* Marzneshin-specific User Status Chart */}
                     {panel.type === 'marzneshin' && panel.systemInfo.total_user > 0 && (
                       <div className="pt-3 border-t">
                         <div className="flex items-center gap-2 mb-2">
                           <Users className="w-4 h-4" />
                           <span className="text-sm font-medium">User Status Overview</span>
                         </div>
                         <div className="h-48">
                           <ResponsiveContainer width="100%" height="100%">
                             <PieChart>
                               <Pie
                                 data={[
                                   { name: 'Active', value: panel.systemInfo.users_active, color: COLORS[0] },
                                   { name: 'Expired', value: panel.systemInfo.users_expired, color: COLORS[1] },
                                   { name: 'On Hold', value: panel.systemInfo.users_on_hold || 0, color: COLORS[2] },
                                   { name: 'Limited', value: panel.systemInfo.users_disabled || 0, color: COLORS[3] },
                                   { name: 'Online', value: panel.systemInfo.users_online || 0, color: COLORS[4] }
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
                                   { name: 'Active', value: panel.systemInfo.users_active, color: COLORS[0] },
                                   { name: 'Expired', value: panel.systemInfo.users_expired, color: COLORS[1] },
                                   { name: 'On Hold', value: panel.systemInfo.users_on_hold || 0, color: COLORS[2] },
                                   { name: 'Limited', value: panel.systemInfo.users_disabled || 0, color: COLORS[3] },
                                   { name: 'Online', value: panel.systemInfo.users_online || 0, color: COLORS[4] }
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

                     {/* Marzneshin Traffic Chart */}
                     {panel.type === 'marzneshin' && panel.systemInfo.traffic_data && Array.isArray(panel.systemInfo.traffic_data) && panel.systemInfo.traffic_data.length > 0 && (
                       <div className="pt-3 border-t">
                         <div className="flex items-center gap-2 mb-2">
                           <TrendingUp className="w-4 h-4" />
                           <span className="text-sm font-medium">Traffic Usage (Last 7 Days)</span>
                         </div>
                         <div className="h-48">
                           <ResponsiveContainer width="100%" height="100%">
                             <LineChart data={panel.systemInfo.traffic_data.map((point: any) => ({
                               timestamp: new Date(point.timestamp).toLocaleDateString(),
                               traffic: ((point.incoming || 0) + (point.outgoing || 0)) / (1024*1024*1024) // Convert to GB
                             }))}>
                               <CartesianGrid strokeDasharray="3 3" />
                               <XAxis dataKey="timestamp" />
                               <YAxis label={{ value: 'GB', angle: -90, position: 'insideLeft' }} />
                               <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} GB`, 'Traffic']} />
                               <Line type="monotone" dataKey="traffic" stroke="#8884d8" strokeWidth={2} />
                             </LineChart>
                           </ResponsiveContainer>
                         </div>
                       </div>
                     )}
                     
                     {/* Traditional grid for non-Marzneshin or fallback */}
                     {panel.type !== 'marzneshin' && (
                       <>
                         <div className="grid grid-cols-2 gap-4">
                           <div>
                             <p className="text-sm font-medium">Expired</p>
                             <p className="text-sm text-yellow-600">{formatNumber(panel.systemInfo.users_expired)}</p>
                           </div>
                           <div>
                             <p className="text-sm font-medium">Disabled</p>
                             <p className="text-sm text-red-600">{formatNumber(panel.systemInfo.users_disabled || 0)}</p>
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
                       </>
                     )}
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
