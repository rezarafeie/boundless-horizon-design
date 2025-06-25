import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, User, Calendar, DollarSign, RefreshCw, Image, Receipt, Server, Package } from 'lucide-react';
import { ManualPaymentActions } from './ManualPaymentActions';
import { UserCreationLogs } from './UserCreationLogs';
import { UserActionButtons } from './UserActionButtons';
import { SubscriptionDiagnostics } from './SubscriptionDiagnostics';

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
  // Plan and panel info from the relationship
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
        .order('created_at', { ascending: false });

      // Add status filter if not 'all'
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Add search filter
      if (searchTerm.trim()) {
        query = query.or(`username.ilike.%${searchTerm}%,mobile.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      
      console.log('USERS: Subscriptions query result:', { data, error, count: data?.length });
      
      if (error) {
        console.error('USERS: Error fetching subscriptions:', error);
        throw error;
      }
      
      // Transform data to include plan and panel information
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
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Helper function to parse manual payment details from notes
  const parseManualPaymentDetails = (notes: string) => {
    if (!notes || !notes.includes('Manual payment')) return null;
    
    const trackingMatch = notes.match(/Tracking:\s*([^,]+)/);
    const payerMatch = notes.match(/Payer:\s*([^,]+)/);
    const timeMatch = notes.match(/Time:\s*([^-]+)/);
    
    return {
      trackingNumber: trackingMatch ? trackingMatch[1].trim() : null,
      payerName: payerMatch ? payerMatch[1].trim() : null,
      paymentTime: timeMatch ? timeMatch[1].trim() : null
    };
  };

  // Helper function to determine if subscription needs diagnostics
  const needsDiagnostics = (subscription: Subscription) => {
    return (
      subscription.status === 'active' && 
      subscription.admin_decision === 'approved' && 
      !subscription.marzban_user_created
    ) || (
      subscription.notes && 
      subscription.notes.includes('VPN creation failed')
    );
  };

  const getStatusBadge = (status: string, adminDecision?: string) => {
    if (status === 'pending' && adminDecision === 'pending') {
      return <Badge className="bg-orange-100 text-orange-800">Awaiting Review</Badge>;
    }
    
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
    awaitingReview: subscriptions.filter(s => s.status === 'pending' && s.admin_decision === 'pending').length,
    totalRevenue: subscriptions.reduce((sum, s) => sum + s.price_toman, 0),
  } : { total: 0, active: 0, pending: 0, awaitingReview: 0, totalRevenue: 0 };

  const handleRefresh = () => {
    refetch();
  };

  console.log('USERS: Component render - isLoading:', isLoading, 'subscriptions count:', subscriptions?.length, 'error:', error);

  // Show error state
  if (error) {
    console.error('USERS: Component error:', error);
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Users & Orders</h1>
            <p className="text-gray-600">Error loading users and orders</p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
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
    console.log('USERS: Component loading state');
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Users & Orders</h1>
          <p className="text-gray-600">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Users & Orders</h1>
          <p className="text-gray-600">
            Manage user subscriptions and orders ({subscriptions?.length || 0} subscriptions found)
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <User className="w-6 h-6 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="w-6 h-6 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="w-6 h-6 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="w-6 h-6 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Awaiting Review</p>
                <p className="text-xl font-bold text-orange-600">{stats.awaitingReview}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-xl font-bold">{(stats.totalRevenue / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
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
      <div className="grid gap-6">
        {subscriptions?.map((subscription) => {
          const manualPaymentDetails = parseManualPaymentDetails(subscription.notes || '');
          const showDiagnostics = needsDiagnostics(subscription);
          
          return (
            <Card key={subscription.id} className={subscription.status === 'pending' && subscription.admin_decision === 'pending' ? 'border-orange-200 bg-orange-50' : ''}>
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="flex flex-wrap items-center gap-2">
                      <span>{subscription.username}</span>
                      {getStatusBadge(subscription.status, subscription.admin_decision)}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span>Mobile: {subscription.mobile}</span>
                        <span>•</span>
                        <span>Created: {new Date(subscription.created_at).toLocaleDateString()}</span>
                      </div>
                    </CardDescription>
                    
                    {/* Plan and Panel Info */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        <Package className="w-3 h-3 mr-1" />
                        {(subscription as any).plan_name} ({(subscription as any).plan_id_text})
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Server className="w-3 h-3 mr-1" />
                        {(subscription as any).panel_name} ({(subscription as any).panel_type})
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-left lg:text-right">
                    <p className="text-lg font-bold">{subscription.price_toman.toLocaleString()} Toman</p>
                    <p className="text-sm text-gray-500">{subscription.data_limit_gb}GB • {subscription.duration_days} days</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
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

                  {/* Manual Payment Details */}
                  {manualPaymentDetails && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-3">
                        <Receipt className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-blue-800 dark:text-blue-200">Manual Payment Details</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        {manualPaymentDetails.trackingNumber && (
                          <div>
                            <span className="font-medium text-muted-foreground">Tracking Number:</span>
                            <p className="font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded mt-1">
                              {manualPaymentDetails.trackingNumber}
                            </p>
                          </div>
                        )}
                        {manualPaymentDetails.payerName && (
                          <div>
                            <span className="font-medium text-muted-foreground">Payer Name:</span>
                            <p className="bg-white dark:bg-gray-800 px-2 py-1 rounded mt-1">
                              {manualPaymentDetails.payerName}
                            </p>
                          </div>
                        )}
                        {manualPaymentDetails.paymentTime && (
                          <div>
                            <span className="font-medium text-muted-foreground">Payment Time:</span>
                            <p className="bg-white dark:bg-gray-800 px-2 py-1 rounded mt-1">
                              {manualPaymentDetails.paymentTime}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Receipt Image */}
                  {subscription.receipt_image_url && (
                    <div className="flex items-center gap-2 text-sm">
                      <Image className="w-4 h-4" />
                      <a 
                        href={subscription.receipt_image_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View Payment Receipt
                      </a>
                    </div>
                  )}

                  {/* Subscription Diagnostics */}
                  {showDiagnostics && (
                    <div className="border-t pt-4">
                      <SubscriptionDiagnostics subscriptionId={subscription.id} />
                    </div>
                  )}

                  {/* User Creation Logs */}
                  <div className="border-t pt-4">
                    <UserCreationLogs subscriptionId={subscription.id} />
                  </div>

                  {/* Action Buttons */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <UserActionButtons 
                        subscription={subscription} 
                        onUpdate={handleRefresh}
                      />
                      <ManualPaymentActions
                        subscriptionId={subscription.id}
                        status={subscription.status}
                        adminDecision={subscription.admin_decision}
                        username={subscription.username}
                        amount={subscription.price_toman}
                        onStatusUpdate={handleRefresh}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!subscriptions || subscriptions.length === 0) && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
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
