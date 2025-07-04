
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Database, DollarSign, Activity, Calendar, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
      // This would aggregate data from all sources based on dateRange
      // For now, we'll simulate the data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSummary({
        totalUsers: 2150,
        totalBandwidth: 5.2 * 1024 * 1024 * 1024 * 1024, // 5.2 TB
        totalRevenue: 2450000, // 2.45M Toman
        activeUsers: 1850,
        peakUsageDate: '2025-07-03'
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
