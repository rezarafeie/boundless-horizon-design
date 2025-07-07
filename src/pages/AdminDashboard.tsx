import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, CreditCard, FileText, Settings, Server, RefreshCw, Activity, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  activeUsersFromPanels: number;
  totalRevenue: number;
  pendingApprovals: number;
  dailyNewUsers: number;
  dailyRevenue: number;
  panelUsers: number;
  telegramUsers: number;
}

interface PanelStatus {
  id: string;
  name: string;
  health_status: 'online' | 'offline' | 'unknown';
  last_health_check: string | null;
  country_en: string;
  type: string;
  userCount?: number;
  activeUserCount?: number;
}

interface RecentActivity {
  id: string;
  type: 'subscription' | 'approval' | 'payment' | 'test_user';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
}

const AdminDashboard = () => {
  // Fetch comprehensive dashboard statistics with real active users
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['real-dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      console.log('DASHBOARD: Fetching real dashboard statistics with active users from panels...');
      
      // Get database stats
      const { count: totalUsers } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true });

      const { count: activeSubscriptions } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: pendingApprovals } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('admin_decision', 'pending');

      // Get total revenue from database
      const { data: revenueData } = await supabase
        .from('subscriptions')
        .select('price_toman')
        .in('status', ['paid', 'active', 'expired']);

      const dbRevenue = revenueData?.reduce((sum, sub) => sum + sub.price_toman, 0) || 0;

      // Get daily stats
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { count: dailyNewUsers } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString());

      const { data: dailyRevenueData } = await supabase
        .from('subscriptions')
        .select('price_toman')
        .gte('created_at', yesterday.toISOString())
        .in('status', ['paid', 'active']);

      const dailyRevenue = dailyRevenueData?.reduce((sum, sub) => sum + sub.price_toman, 0) || 0;

      // Get real panel user counts including active users
      let panelUsers = 0;
      let activeUsersFromPanels = 0;
      
      try {
        const { data: panels } = await supabase
          .from('panel_servers')
          .select('*')
          .eq('is_active', true);

        console.log(`DASHBOARD: Found ${panels?.length || 0} active panels`);

        if (panels) {
          for (const panel of panels) {
            try {
              console.log(`DASHBOARD: Fetching user data from panel ${panel.name} (${panel.type})`);
              
              if (panel.type === 'marzban') {
                const { data } = await supabase.functions.invoke('marzban-get-system-info', {
                  body: { panelId: panel.id }
                });
                if (data?.success && data?.systemInfo) {
                  const totalPanelUsers = data.systemInfo.total_user || 0;
                  const activePanelUsers = data.systemInfo.users_active || data.systemInfo.active_users || 0;
                  
                  panelUsers += totalPanelUsers;
                  activeUsersFromPanels += activePanelUsers;
                  
                  console.log(`DASHBOARD: Panel ${panel.name} - Total: ${totalPanelUsers}, Active: ${activePanelUsers}`);
                }
              } else if (panel.type === 'marzneshin') {
                const { data } = await supabase.functions.invoke('marzneshin-get-system-info', {
                  body: { panelId: panel.id }
                });
                if (data?.success && data?.systemInfo) {
                  const totalPanelUsers = data.systemInfo.total_user || 0;
                  const activePanelUsers = data.systemInfo.users_active || data.systemInfo.active_users || 0;
                  
                  panelUsers += totalPanelUsers;
                  activeUsersFromPanels += activePanelUsers;
                  
                  console.log(`DASHBOARD: Panel ${panel.name} - Total: ${totalPanelUsers}, Active: ${activePanelUsers}`);
                }
              }
            } catch (error) {
              console.log(`DASHBOARD: Failed to get user count from panel ${panel.name}:`, error);
            }
          }
        }
      } catch (error) {
        console.log('DASHBOARD: Failed to get panel user counts:', error);
      }

      // Get real Telegram stats
      let telegramUsers = 0;
      let telegramRevenue = 0;
      let telegramActiveUsers = 0;
      
      try {
        const { telegramBotApi } = await import('@/services/telegramBotApi');
        const telegramStats = await telegramBotApi.getDashboardStats();
        
        if (telegramStats.success && telegramStats.data) {
          telegramUsers = telegramStats.data.totalUsers;
          telegramActiveUsers = telegramStats.data.activeUsers || telegramUsers;
          telegramRevenue = telegramStats.data.totalRevenue;
          console.log(`DASHBOARD: Telegram - Total: ${telegramUsers}, Active: ${telegramActiveUsers}`);
        } else {
          console.log('DASHBOARD: Telegram Bot API unavailable:', telegramStats.error);
        }
      } catch (error) {
        console.log('DASHBOARD: Failed to fetch Telegram stats:', error);
      }

      const totalRevenue = dbRevenue + telegramRevenue;

      const finalStats = {
        totalUsers: (totalUsers || 0) + panelUsers + telegramUsers,
        activeSubscriptions: activeSubscriptions || 0,
        activeUsersFromPanels: activeUsersFromPanels + telegramActiveUsers,
        totalRevenue,
        pendingApprovals: pendingApprovals || 0,
        dailyNewUsers: dailyNewUsers || 0,
        dailyRevenue,
        panelUsers,
        telegramUsers
      };

      console.log('DASHBOARD: Real dashboard stats with active users:', finalStats);
      return finalStats;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch panel status with real user counts
  const { data: panels, isLoading: panelsLoading, refetch: refetchPanels } = useQuery({
    queryKey: ['panel-status-with-real-users'],
    queryFn: async (): Promise<PanelStatus[]> => {
      console.log('DASHBOARD: Fetching panel status with real user counts...');
      
      const { data, error } = await supabase
        .from('panel_servers')
        .select('id, name, health_status, last_health_check, country_en, type')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const panelsWithUsers = await Promise.all(
        (data || []).map(async (panel) => {
          try {
            let userCount = 0;
            let activeUserCount = 0;
            
            if (panel.type === 'marzban') {
              const { data: systemData } = await supabase.functions.invoke('marzban-get-system-info', {
                body: { panelId: panel.id }
              });
              if (systemData?.success && systemData?.systemInfo) {
                userCount = systemData.systemInfo.total_user || 0;
                activeUserCount = systemData.systemInfo.users_active || systemData.systemInfo.active_users || 0;
              }
            } else if (panel.type === 'marzneshin') {
              const { data: systemData } = await supabase.functions.invoke('marzneshin-get-system-info', {
                body: { panelId: panel.id }
              });
              if (systemData?.success && systemData?.systemInfo) {
                userCount = systemData.systemInfo.total_user || 0;
                activeUserCount = systemData.systemInfo.users_active || systemData.systemInfo.active_users || 0;
              }
            }
            
            return {
              ...panel,
              health_status: panel.health_status as 'online' | 'offline' | 'unknown',
              userCount,
              activeUserCount
            };
          } catch (error) {
            console.log(`DASHBOARD: Error fetching users from panel ${panel.name}:`, error);
            return {
              ...panel,
              health_status: panel.health_status as 'online' | 'offline' | 'unknown',
              userCount: 0,
              activeUserCount: 0
            };
          }
        })
      );

      return panelsWithUsers;
    },
    refetchInterval: 120000, // Refresh every 2 minutes
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['recent-activity-real'],
    queryFn: async (): Promise<RecentActivity[]> => {
      console.log('Fetching real recent activity...');
      
      const activities: RecentActivity[] = [];

      // Get recent subscriptions
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('id, username, status, price_toman, created_at, admin_decision')
        .order('created_at', { ascending: false })
        .limit(10);

      subscriptions?.forEach(sub => {
        activities.push({
          id: sub.id,
          type: 'subscription',
          title: sub.status === 'active' ? 'New subscription activated' : 
                 sub.status === 'pending' ? 'New subscription created' : 'Subscription updated',
          description: `${sub.username} • ${(sub.price_toman/1000).toFixed(0)}K T`,
          timestamp: sub.created_at,
          status: sub.status
        });

        if (sub.admin_decision === 'approved') {
          activities.push({
            id: sub.id + '_approval',
            type: 'approval',
            title: 'Manual payment approved',
            description: `${sub.username} • ${(sub.price_toman/1000).toFixed(0)}K T`,
            timestamp: sub.created_at,
            status: 'approved'
          });
        }
      });

      // Get recent test users
      const { data: testUsers } = await supabase
        .from('test_users')
        .select('id, username, email, created_at, panel_name')
        .order('created_at', { ascending: false })
        .limit(5);

      testUsers?.forEach(user => {
        activities.push({
          id: user.id,
          type: 'test_user',
          title: 'Test user created',
          description: `${user.username} on ${user.panel_name}`,
          timestamp: user.created_at,
          status: 'active'
        });
      });

      // Sort all activities by timestamp
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 8);
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'subscription': return <Users className="w-4 h-4" />;
      case 'approval': return <FileText className="w-4 h-4" />;
      case 'payment': return <CreditCard className="w-4 h-4" />;
      case 'test_user': return <Settings className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time overview with actual active users from panels
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Bell className="w-4 h-4 mr-2" />
              {stats?.pendingApprovals || 0}
            </Button>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Real Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Users (All Systems)
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.totalUsers?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                DB: {(stats?.totalUsers || 0) - (stats?.panelUsers || 0) - (stats?.telegramUsers || 0)} • 
                Panels: {stats?.panelUsers || 0} • 
                Telegram: {stats?.telegramUsers || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Real Active Users
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statsLoading ? '...' : stats?.activeUsersFromPanels?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Active users from panels + Telegram
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue (All Systems)
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : formatCurrency(stats?.totalRevenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Database + Telegram combined
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

        {/* Daily Stats and Panel Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <CardTitle className="text-lg">Panel Status & Real Users</CardTitle>
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
                          {panel.country_en} • {panel.type} • 
                          Total: {panel.userCount || 0} • 
                          Active: <span className="text-green-600 font-medium">{panel.activeUserCount || 0}</span>
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
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity (Live Updates)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activityLoading ? (
                <p className="text-sm text-muted-foreground">Loading activity...</p>
              ) : recentActivity && recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between border-b pb-3 last:border-b-0">
                    <div className="flex items-center gap-3">
                      {getActivityIcon(activity.type)}
                      <div>
                        <p className="font-medium text-sm">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {activity.status && (
                        <Badge 
                          variant={
                            activity.status === 'active' || activity.status === 'approved' ? 'default' : 
                            activity.status === 'pending' ? 'secondary' : 'destructive'
                          }
                          className="text-xs mb-1"
                        >
                          {activity.status}
                        </Badge>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
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
