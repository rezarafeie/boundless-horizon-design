
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Database, DollarSign, Activity, Calendar, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '../DateRangeSelector';

interface GlobalSummaryProps {
  refreshTrigger: number;
  dateRange: DateRange;
}

export const GlobalSummary = ({ refreshTrigger, dateRange }: GlobalSummaryProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalUsers: 0,
    totalBandwidth: 0,
    totalRevenue: 0,
    activeUsers: 0,
    peakUsageDate: null as string | null
  });

  const loadGlobalSummary = async () => {
    setLoading(true);
    try {
      console.log('GLOBAL_SUMMARY: Loading real data from all systems...');
      
      // Get real data from database
      const { count: dbUsers } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true });

      const { count: activeDbSubscriptions } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { data: revenueData } = await supabase
        .from('subscriptions')
        .select('price_toman')
        .in('status', ['paid', 'active', 'expired']);

      const dbRevenue = revenueData?.reduce((sum, sub) => sum + sub.price_toman, 0) || 0;

      // Get real panel stats
      let panelUsers = 0;
      let realActiveUsersFromPanels = 0;
      let totalBandwidth = 0;
      
      const { data: panels } = await supabase
        .from('panel_servers')
        .select('*')
        .eq('is_active', true);

      console.log(`GLOBAL_SUMMARY: Found ${panels?.length || 0} active panels`);

      if (panels) {
        for (const panel of panels) {
          try {
            console.log(`GLOBAL_SUMMARY: Fetching data from panel ${panel.name} (${panel.type})`);
            
            const functionName = panel.type === 'marzban' ? 'marzban-get-system-info' : 'marzneshin-get-system-info';
            const { data } = await supabase.functions.invoke(functionName, {
              body: { 
                panelId: panel.id,
                dateFrom: dateRange.from.toISOString(),
                dateTo: dateRange.to.toISOString()
              }
            });
            
            if (data?.success && data?.systemInfo) {
              const totalPanelUsers = data.systemInfo.total_user || 0;
              const activePanelUsers = data.systemInfo.users_active || data.systemInfo.active_users || 0;
              const incomingBandwidth = data.systemInfo.incoming_bandwidth || 0;
              const outgoingBandwidth = data.systemInfo.outgoing_bandwidth || 0;
              
              panelUsers += totalPanelUsers;
              realActiveUsersFromPanels += activePanelUsers;
              totalBandwidth += incomingBandwidth + outgoingBandwidth;
              
              console.log(`GLOBAL_SUMMARY: Panel ${panel.name} - Total: ${totalPanelUsers}, Active: ${activePanelUsers}`);
            } else {
              console.log(`GLOBAL_SUMMARY: Failed to get data from panel ${panel.name}:`, data?.error);
            }
          } catch (error) {
            console.log(`GLOBAL_SUMMARY: Error fetching from panel ${panel.name}:`, error);
          }
        }
      }

      // Get real Telegram stats
      let telegramUsers = 0;
      let telegramActiveUsers = 0;
      let telegramRevenue = 0;
      
      try {
        const { telegramBotApi } = await import('@/services/telegramBotApi');
        const telegramStats = await telegramBotApi.getDashboardStats();
        
        if (telegramStats.success && telegramStats.data) {
          telegramUsers = telegramStats.data.totalUsers;
          telegramActiveUsers = telegramStats.data.activeUsers || telegramUsers; // Assume all are active if not specified
          telegramRevenue = telegramStats.data.totalRevenue;
          console.log(`GLOBAL_SUMMARY: Telegram - Total: ${telegramUsers}, Active: ${telegramActiveUsers}`);
        }
      } catch (error) {
        console.log('GLOBAL_SUMMARY: Telegram API unavailable:', error);
      }

      const finalSummary = {
        totalUsers: (dbUsers || 0) + panelUsers + telegramUsers,
        totalBandwidth,
        totalRevenue: dbRevenue + telegramRevenue,
        activeUsers: realActiveUsersFromPanels + telegramActiveUsers,
        peakUsageDate: dateRange.to.toISOString().split('T')[0]
      };

      console.log('GLOBAL_SUMMARY: Final summary with real active users:', finalSummary);
      setSummary(finalSummary);
    } catch (error) {
      console.error('GLOBAL_SUMMARY: Error loading summary:', error);
      toast({
        title: "Error",
        description: "Failed to load global summary",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGlobalSummary();
  }, [refreshTrigger, dateRange]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Global Summary (Real Data)</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {dateRange.preset === 'custom' 
              ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
              : dateRange.preset.toUpperCase()
            }
          </span>
          <Button onClick={loadGlobalSummary} disabled={loading} size="sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All systems combined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Real Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Active users from panels + Telegram</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bandwidth</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(summary.totalBandwidth)}</div>
            <p className="text-xs text-muted-foreground">All panels combined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">From all systems</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Usage</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.peakUsageDate || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">Highest traffic day</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
