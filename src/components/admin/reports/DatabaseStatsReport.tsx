
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Database, Users, Calendar, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DatabaseStatsReportProps {
  refreshTrigger: number;
}

interface DatabaseStats {
  totalUsers: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  deletedUsers: number;
  planStats: Array<{
    plan_name: string;
    count: number;
    total_revenue: number;
  }>;
  recentSubscriptions: Array<{
    id: string;
    username: string;
    created_at: string;
    status: string;
    price_toman: number;
  }>;
}

export const DatabaseStatsReport = ({ refreshTrigger }: DatabaseStatsReportProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('week');
  const [stats, setStats] = useState<DatabaseStats>({
    totalUsers: 0,
    activeSubscriptions: 0,
    expiredSubscriptions: 0,
    deletedUsers: 0,
    planStats: [],
    recentSubscriptions: []
  });

  const getDateFilter = (range: string) => {
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    return startDate.toISOString();
  };

  const loadDatabaseStats = async () => {
    setLoading(true);
    try {
      const startDate = getDateFilter(dateRange);
      
      // Get all subscriptions with date filter
      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select('status, price_toman, plan_id, created_at, username, id, expire_at')
        .gte('created_at', startDate);

      if (subsError) throw subsError;

      const now = new Date();
      
      // Calculate stats with proper logic
      const activeCount = subscriptions?.filter(s => 
        s.status === 'active' && (!s.expire_at || new Date(s.expire_at) > now)
      ).length || 0;
      
      const expiredCount = subscriptions?.filter(s => 
        (s.status === 'active' && s.expire_at && new Date(s.expire_at) <= now) ||
        s.status === 'expired'
      ).length || 0;

      const deletedCount = subscriptions?.filter(s => 
        s.status === 'deleted' || s.status === 'cancelled'
      ).length || 0;

      // Get plan stats
      const { data: plans, error: plansError } = await supabase
        .from('subscription_plans')
        .select('id, name_en, name_fa');

      if (plansError) throw plansError;

      const planStats = plans?.map(plan => {
        const planSubs = subscriptions?.filter(s => s.plan_id === plan.id) || [];
        return {
          plan_name: plan.name_en || plan.name_fa,
          count: planSubs.length,
          total_revenue: planSubs.reduce((sum, s) => sum + (s.price_toman || 0), 0)
        };
      }).filter(p => p.count > 0) || [];

      // Get recent subscriptions
      const recentSubs = subscriptions
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
        .map(s => ({
          id: s.id,
          username: s.username,
          created_at: s.created_at,
          status: s.status,
          price_toman: s.price_toman
        })) || [];

      setStats({
        totalUsers: subscriptions?.length || 0,
        activeSubscriptions: activeCount,
        expiredSubscriptions: expiredCount,
        deletedUsers: deletedCount,
        planStats,
        recentSubscriptions: recentSubs
      });

    } catch (error) {
      console.error('Error loading database stats:', error);
      toast({
        title: "Error",
        description: "Failed to load database statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseStats();
  }, [refreshTrigger, dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Database Statistics</h2>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadDatabaseStats} disabled={loading} size="sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">All subscriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Active subscriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.expiredSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Expired subscriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deleted</CardTitle>
            <Database className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.deletedUsers}</div>
            <p className="text-xs text-muted-foreground">Deleted users</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Usage by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.planStats.map((plan, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{plan.plan_name}</p>
                    <p className="text-sm text-muted-foreground">{plan.count} users</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">{formatCurrency(plan.total_revenue)}</p>
                  </div>
                </div>
              ))}
              {stats.planStats.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No plan data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Subscriptions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentSubscriptions.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{sub.username}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(sub.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono">{formatCurrency(sub.price_toman)}</p>
                    <p className="text-xs text-muted-foreground">{sub.status}</p>
                  </div>
                </div>
              ))}
              {stats.recentSubscriptions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No recent subscriptions</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
