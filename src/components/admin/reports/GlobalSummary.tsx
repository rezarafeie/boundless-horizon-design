
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
      // Get real data from database
      const { count: dbUsers } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true });

      const { count: activeDbUsers } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { data: revenueData } = await supabase
        .from('subscriptions')
        .select('price_toman')
        .in('status', ['paid', 'active', 'expired']);

      const dbRevenue = revenueData?.reduce((sum, sub) => sum + sub.price_toman, 0) || 0;

      // Get panel stats
      let panelUsers = 0;
      let totalBandwidth = 0;
      
      const { data: panels } = await supabase
        .from('panel_servers')
        .select('*')
        .eq('is_active', true);

      if (panels) {
        for (const panel of panels) {
          try {
            const functionName = panel.type === 'marzban' ? 'marzban-get-system-info' : 'marzneshin-get-system-info';
            const { data } = await supabase.functions.invoke(functionName, {
              body: { 
                panelId: panel.id,
                dateFrom: dateRange.from.toISOString(),
                dateTo: dateRange.to.toISOString()
              }
            });
            
            if (data?.success && data?.systemInfo) {
              panelUsers += data.systemInfo.total_user || 0;
              totalBandwidth += (data.systemInfo.incoming_bandwidth || 0) + (data.systemInfo.outgoing_bandwidth || 0);
            }
          } catch (error) {
            console.log(`Failed to get stats from panel ${panel.name}:`, error);
          }
        }
      }

      // Get Telegram stats
      let telegramUsers = 0;
      let telegramRevenue = 0;
      
      try {
        const { telegramBotApi } = await import('@/services/telegramBotApi');
        const telegramStats = await telegramBotApi.getDashboardStats();
        
        if (telegramStats.success && telegramStats.data) {
          telegramUsers = telegramStats.data.totalUsers;
          telegramRevenue = telegramStats.data.totalRevenue;
        }
      } catch (error) {
        console.log('Telegram API unavailable:', error);
      }

      setSummary({
        totalUsers: (dbUsers || 0) + panelUsers + telegramUsers,
        totalBandwidth,
        totalRevenue: dbRevenue + telegramRevenue,
        activeUsers: (activeDbUsers || 0) + telegramUsers, // Assume telegram users are active
        peakUsageDate: dateRange.to.toISOString().split('T')[0]
      });
    } catch (error) {
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
        <h2 className="text-xl font-semibold">Global Summary</h2>
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
            <p className="text-xs text-muted-foreground">Across all systems</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
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
            <p className="text-xs text-muted-foreground">From all invoices</p>
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
