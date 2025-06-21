
import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, CreditCard, FileText, Settings, Server, RefreshCw, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  pendingApprovals: number;
  dailyNewUsers: number;
  dailyRevenue: number;
}

interface PanelStatus {
  id: string;
  name: string;
  health_status: 'online' | 'offline' | 'unknown';
  last_health_check: string | null;
  country_en: string;
  type: string;
}

const AdminDashboard = () => {
  // Fetch dashboard statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      console.log('Fetching dashboard statistics...');
      
      // Get total users count
      const { count: totalUsers } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true });

      // Get active subscriptions
      const { count: activeSubscriptions } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get pending manual payment approvals
      const { count: pendingApprovals } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('admin_decision', 'pending');

      // Get total revenue
      const { data: revenueData } = await supabase
        .from('subscriptions')
        .select('price_toman')
        .in('status', ['paid', 'active', 'expired']);

      const totalRevenue = revenueData?.reduce((sum, sub) => sum + sub.price_toman, 0) || 0;

      // Get daily new users (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { count: dailyNewUsers } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString());

      // Get daily revenue (last 24 hours)
      const { data: dailyRevenueData } = await supabase
        .from('subscriptions')
        .select('price_toman')
        .gte('created_at', yesterday.toISOString())
        .in('status', ['paid', 'active']);

      const dailyRevenue = dailyRevenueData?.reduce((sum, sub) => sum + sub.price_toman, 0) || 0;

      console.log('Dashboard stats:', {
        totalUsers: totalUsers || 0,
        activeSubscriptions: activeSubscriptions || 0,
        totalRevenue,
        pendingApprovals: pendingApprovals || 0,
        dailyNewUsers: dailyNewUsers || 0,
        dailyRevenue
      });

      return {
        totalUsers: totalUsers || 0,
        activeSubscriptions: activeSubscriptions || 0,
        totalRevenue,
        pendingApprovals: pendingApprovals || 0,
        dailyNewUsers: dailyNewUsers || 0,
        dailyRevenue
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch panel status
  const { data: panels, isLoading: panelsLoading, refetch: refetchPanels } = useQuery({
    queryKey: ['panel-status'],
    queryFn: async (): Promise<PanelStatus[]> => {
      console.log('Fetching panel status...');
      
      const { data, error } = await supabase
        .from('panel_servers')
        .select('id, name, health_status, last_health_check, country_en, type')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return (data || []).map(panel => ({
        ...panel,
        health_status: panel.health_status as 'online' | 'offline' | 'unknown'
      }));
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch recent activity
  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      console.log('Fetching recent activity...');
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, username, status, price_toman, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const handleRefresh = () => {
    refetchStats();
    refetchPanels();
  };

  const formatCurrency = (amount: number) => {
    return (amount / 1000).toFixed(0) + 'K T';
  };

  const getStatusBadge = (status: 'online' | 'offline' | 'unknown') => {
    const variants = {
      online: 'default',
      offline: 'destructive',
      unknown: 'secondary'
    } as const;
    
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time overview of your VPN service
            </p>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Users
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.totalUsers || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                All registered users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Subscriptions
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.activeSubscriptions || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : formatCurrency(stats?.totalRevenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                All-time revenue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Approvals
              </CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {statsLoading ? '...' : stats?.pendingApprovals || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Manual payments awaiting review
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Daily Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Daily Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">New Users (24h)</span>
                <span className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.dailyNewUsers || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Daily Revenue</span>
                <span className="text-2xl font-bold">
                  {statsLoading ? '...' : formatCurrency(stats?.dailyRevenue || 0)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Panel Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {panelsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading panels...</p>
                ) : panels && panels.length > 0 ? (
                  panels.map((panel) => (
                    <div key={panel.id} className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-sm">{panel.name}</span>
                        <p className="text-xs text-muted-foreground">
                          {panel.country_en} • {panel.type}
                        </p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(panel.health_status)}
                        {panel.last_health_check && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(panel.last_health_check).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No active panels found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activityLoading ? (
                <p className="text-sm text-muted-foreground">Loading activity...</p>
              ) : recentActivity && recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {activity.status === 'active' ? 'New subscription activated' : 
                         activity.status === 'pending' ? 'New subscription created' :
                         'Subscription updated'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.username} • {formatCurrency(activity.price_toman)}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(activity.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
