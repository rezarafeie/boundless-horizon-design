import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, User, Calendar, DollarSign, RefreshCw } from 'lucide-react';
import { UserCard } from './UserCard';
import { OfflineWarning, OfflineStatus } from './OfflineStatus';

interface Subscription {
  id: string;
  username: string;
  mobile: string;
  data_limit_gb: number;
  duration_days: number;
  price_toman: number;
  status: string;
  subscription_url?: string;
  expire_at?: string;
  created_at: string;
  notes?: string;
  admin_decision?: string;
  receipt_image_url?: string;
  plan_id?: string;
  marzban_user_created?: boolean;
  subscription_plans?: {
    id: string;
    plan_id: string;
    name_en: string;
    name_fa: string;
    assigned_panel_id?: string;
    panel_servers?: {
      id: string;
      name: string;
      type: string;
      health_status: string;
      panel_url: string;
    };
  };
}

export const UsersManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: subscriptions, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-subscriptions', searchTerm, statusFilter],
    queryFn: async () => {
      console.log('=== USERS: Fetching subscriptions with plan and panel info using plan_id relationship ===');
      
      let query = supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans!plan_id(
            id,
            plan_id,
            name_en,
            name_fa,
            assigned_panel_id,
            panel_servers!assigned_panel_id(
              id,
              name,
              type,
              health_status,
              panel_url
            )
          )
        `)
        .neq('status', 'deleted')
        .not('notes', 'like', '%- Deleted on %')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm.trim()) {
        query = query.or(`username.ilike.%${searchTerm}%,mobile.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      
      console.log('USERS: Subscriptions query result:', { data, error, count: data?.length });
      
      if (error) {
        console.error('USERS: Error fetching subscriptions:', error);
        throw error;
      }
      
      const transformedData: Subscription[] = (data || []).map((sub: any) => ({
        ...sub,
        plan_name: sub.subscription_plans?.name_en || 'Unknown Plan',
        plan_id_text: sub.subscription_plans?.plan_id || 'N/A',
        panel_name: sub.subscription_plans?.panel_servers?.name || 'No Panel',
        panel_type: sub.subscription_plans?.panel_servers?.type || 'N/A'
      }));
      
      console.log(`USERS: Successfully fetched ${transformedData.length} subscriptions with plan/panel info`);
      return transformedData;
    },
    retry: 1,
    refetchInterval: 30000,
  });

  const stats = subscriptions ? {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    pending: subscriptions.filter(s => s.status === 'pending').length,
    awaitingReview: subscriptions.filter(s => s.status === 'pending' && s.admin_decision === 'pending').length,
    totalRevenue: subscriptions.reduce((sum, s) => sum + s.price_toman, 0),
  } : { total: 0, active: 0, pending: 0, awaitingReview: 0, totalRevenue: 0 };

  const handleRefresh = () => {
    refetch();
  };

  console.log('USERS: Component render - isLoading:', isLoading, 'subscriptions count:', subscriptions?.length, 'error:', error);

  // Show offline status for connection errors
  if (error) {
    console.error('USERS: Component error:', error);
    return <OfflineStatus showFullScreen={true} />;
  }

  if (isLoading) {
    console.log('USERS: Component loading state');
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Users & Orders</h1>
          <p className="text-gray-600">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Offline Warning */}
      <OfflineWarning />

      {/* Header - Mobile optimized */}
      <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">Users & Orders</h1>
          <p className="text-sm sm:text-base text-gray-600">
            {subscriptions?.length || 0} subscriptions found
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OfflineStatus />
          <Button onClick={handleRefresh} variant="outline" size="sm" className="whitespace-nowrap">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards - Mobile responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center">
              <User className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
              <div className="ml-2 sm:ml-3 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total</p>
                <p className="text-lg sm:text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
              <div className="ml-2 sm:ml-3 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Active</p>
                <p className="text-lg sm:text-xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600 flex-shrink-0" />
              <div className="ml-2 sm:ml-3 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Pending</p>
                <p className="text-lg sm:text-xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600 flex-shrink-0" />
              <div className="ml-2 sm:ml-3 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Review</p>
                <p className="text-lg sm:text-xl font-bold text-orange-600">{stats.awaitingReview}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden col-span-2 sm:col-span-1">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center">
              <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0" />
              <div className="ml-2 sm:ml-3 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Revenue</p>
                <p className="text-lg sm:text-xl font-bold">{(stats.totalRevenue / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Mobile responsive */}
      <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search username or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Subscriptions List */}
      <div className="grid gap-4 sm:gap-6">
        {subscriptions?.map((subscription) => (
          <UserCard 
            key={subscription.id}
            subscription={subscription}
            onRefresh={handleRefresh}
          />
        ))}
      </div>

      {(!subscriptions || subscriptions.length === 0) && !isLoading && (
        <Card>
          <CardContent className="text-center py-8 sm:py-12">
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'No subscriptions found matching your criteria.'
                : 'No subscriptions found. Users will appear here once they make orders.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
