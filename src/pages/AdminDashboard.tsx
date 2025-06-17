
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Package, 
  Server, 
  Ticket,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export const AdminDashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [subscriptions, plans, panels, discounts] = await Promise.all([
        supabase.from('subscriptions').select('id, status, price_toman'),
        supabase.from('subscription_plans').select('id, is_active'),
        supabase.from('panel_servers').select('id, is_active, health_status'),
        supabase.from('discount_codes').select('id, is_active, current_usage_count')
      ]);

      return {
        totalUsers: subscriptions.data?.length || 0,
        activeSubscriptions: subscriptions.data?.filter(s => s.status === 'active').length || 0,
        totalRevenue: subscriptions.data?.reduce((sum, s) => sum + (s.price_toman || 0), 0) || 0,
        activePlans: plans.data?.filter(p => p.is_active).length || 0,
        totalPlans: plans.data?.length || 0,
        onlinePanels: panels.data?.filter(p => p.health_status === 'online').length || 0,
        totalPanels: panels.data?.length || 0,
        activeDiscounts: discounts.data?.filter(d => d.is_active).length || 0,
        totalDiscountUsage: discounts.data?.reduce((sum, d) => sum + (d.current_usage_count || 0), 0) || 0
      };
    }
  });

  const dashboardCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      description: `${stats?.activeSubscriptions || 0} active subscriptions`,
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Revenue',
      value: `${((stats?.totalRevenue || 0) / 1000).toFixed(0)}K`,
      description: 'Total revenue (Toman)',
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      title: 'Plans',
      value: stats?.activePlans || 0,
      description: `${stats?.totalPlans || 0} total plans`,
      icon: Package,
      color: 'text-purple-600'
    },
    {
      title: 'Panel Status',
      value: `${stats?.onlinePanels || 0}/${stats?.totalPanels || 0}`,
      description: 'Online panels',
      icon: Server,
      color: stats?.onlinePanels === stats?.totalPanels ? 'text-green-600' : 'text-yellow-600'
    },
    {
      title: 'Discounts',
      value: stats?.activeDiscounts || 0,
      description: `${stats?.totalDiscountUsage || 0} total uses`,
      icon: Ticket,
      color: 'text-orange-600'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your VPN service</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {dashboardCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {card.title}
                  </CardTitle>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="text-xs text-gray-500">{card.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest system events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">New subscription created</p>
                    <p className="text-xs text-gray-500">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Panel health check passed</p>
                    <p className="text-xs text-gray-500">5 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">Discount code used</p>
                    <p className="text-xs text-gray-500">10 minutes ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Current system health</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Online
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Payment Gateway</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Online
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Panel Servers</span>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                    {stats?.onlinePanels || 0}/{stats?.totalPanels || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};
