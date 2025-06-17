
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, User, Calendar, DollarSign } from 'lucide-react';

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
}

export const UsersManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: subscriptions, isLoading, error } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      console.log('Fetching subscriptions...');
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('Subscriptions query result:', { data, error });
      
      if (error) {
        console.error('Error fetching subscriptions:', error);
        throw error;
      }
      
      console.log(`Successfully fetched ${data?.length || 0} subscriptions`);
      return data as Subscription[];
    },
    retry: 1
  });

  const filteredSubscriptions = subscriptions?.filter(sub => {
    const matchesSearch = 
      sub.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.mobile.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending': { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      'paid': { label: 'Paid', className: 'bg-blue-100 text-blue-800' },
      'active': { label: 'Active', className: 'bg-green-100 text-green-800' },
      'expired': { label: 'Expired', className: 'bg-red-100 text-red-800' },
      'cancelled': { label: 'Cancelled', className: 'bg-gray-100 text-gray-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const stats = subscriptions ? {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    pending: subscriptions.filter(s => s.status === 'pending').length,
    totalRevenue: subscriptions.reduce((sum, s) => sum + s.price_toman, 0),
  } : { total: 0, active: 0, pending: 0, totalRevenue: 0 };

  // Show error state
  if (error) {
    console.error('Users component error:', error);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users & Orders</h1>
          <p className="text-gray-600">Error loading users and orders</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-red-600">
              <p>Error loading subscriptions: {error?.message || 'Unknown error'}</p>
              <p className="text-sm mt-2">Check the browser console for more details.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users & Orders</h1>
          <p className="text-gray-600">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Users & Orders</h1>
        <p className="text-gray-600">
          Manage user subscriptions and orders ({subscriptions?.length || 0} subscriptions found)
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <User className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">{(stats.totalRevenue / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by username or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
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
      <div className="grid gap-6">
        {filteredSubscriptions?.map((subscription) => (
          <Card key={subscription.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {subscription.username}
                    {getStatusBadge(subscription.status)}
                  </CardTitle>
                  <CardDescription>
                    Mobile: {subscription.mobile} • Created: {new Date(subscription.created_at).toLocaleDateString()}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{subscription.price_toman.toLocaleString()} Toman</p>
                  <p className="text-sm text-gray-500">{subscription.data_limit_gb}GB • {subscription.duration_days} days</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Expiry:</span>
                  <p>{subscription.expire_at ? new Date(subscription.expire_at).toLocaleDateString() : 'Not set'}</p>
                </div>
                <div>
                  <span className="font-medium">Subscription URL:</span>
                  <p className="truncate text-blue-600">
                    {subscription.subscription_url ? 
                      <a href={subscription.subscription_url} target="_blank" rel="noopener noreferrer">
                        View Config
                      </a> 
                      : 'Not generated'
                    }
                  </p>
                </div>
                <div>
                  <span className="font-medium">Notes:</span>
                  <p className="truncate">{subscription.notes || 'None'}</p>
                </div>
                <div>
                  <span className="font-medium">ID:</span>
                  <p className="font-mono text-xs">{subscription.id.slice(0, 8)}...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!filteredSubscriptions || filteredSubscriptions.length === 0) && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500">
              {subscriptions?.length === 0 
                ? 'No subscriptions found. Users will appear here once they make orders.'
                : 'No subscriptions found matching your criteria.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
