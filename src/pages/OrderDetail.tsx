import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, User, CreditCard, Calendar, Globe, Package, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ManualPaymentActions } from '@/components/admin/ManualPaymentActions';

interface SubscriptionData {
  id: string;
  username: string;
  email: string;
  mobile: string;
  status: string;
  admin_decision: string | null;
  price_toman: number;
  data_limit_gb: number;
  duration_days: number;
  protocol: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  admin_decided_at: string | null;
  subscription_url: string | null;
  receipt_image_url: string | null;
  expire_at: string | null;
  subscription_plans?: {
    name_en: string;
    name_fa: string;
    description_en: string;
    description_fa: string;
  };
}

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    if (!id) {
      setError('No subscription ID provided');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans (
            name_en,
            name_fa,
            description_en,
            description_fa
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        setError('Subscription not found');
        return;
      }

      setSubscription(data);
    } catch (err) {
      setError('Failed to load subscription details');
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [id]);

  const getStatusBadge = (status: string, adminDecision: string | null) => {
    if (status === 'pending' && adminDecision === 'pending') {
      return <Badge variant="secondary">Pending Approval</Badge>;
    }
    if (status === 'active' || adminDecision === 'approved') {
      return <Badge variant="default" className="bg-green-600">Active</Badge>;
    }
    if (status === 'cancelled' || adminDecision === 'rejected') {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (status === 'paid') {
      return <Badge variant="default" className="bg-blue-600">Paid</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('fa-IR') + ' تومان';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader className="w-6 h-6 animate-spin" />
          <span>Loading order details...</span>
        </div>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isManualPayment = subscription.status === 'pending' && subscription.admin_decision === 'pending';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button 
            onClick={() => navigate(-1)} 
            variant="outline" 
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Order Details</h1>
          <p className="text-muted-foreground">Order ID: {subscription.id}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Status & Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Status:</span>
                {getStatusBadge(subscription.status, subscription.admin_decision)}
              </div>
              
              <div className="flex items-center justify-between">
                <span>Created:</span>
                <span className="text-sm">{formatDate(subscription.created_at)}</span>
              </div>

              {subscription.admin_decided_at && (
                <div className="flex items-center justify-between">
                  <span>Decision Made:</span>
                  <span className="text-sm">{formatDate(subscription.admin_decided_at)}</span>
                </div>
              )}

              {subscription.expire_at && (
                <div className="flex items-center justify-between">
                  <span>Expires:</span>
                  <span className="text-sm">{formatDate(subscription.expire_at)}</span>
                </div>
              )}

              {(subscription.status === 'pending' && (subscription.admin_decision === 'pending' || subscription.admin_decision === null)) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Admin Actions</h4>
                    <ManualPaymentActions
                      subscriptionId={subscription.id}
                      status={subscription.status}
                      adminDecision={subscription.admin_decision}
                      username={subscription.username}
                      amount={subscription.price_toman}
                      onStatusUpdate={fetchSubscription}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Username:</span>
                <span className="font-medium">{subscription.username}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Mobile:</span>
                <span className="font-medium">{subscription.mobile}</span>
              </div>

              {subscription.email && (
                <div className="flex items-center justify-between">
                  <span>Email:</span>
                  <span className="font-medium">{subscription.email}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Service Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {subscription.subscription_plans && (
                <div className="flex items-center justify-between">
                  <span>Plan:</span>
                  <span className="font-medium">{subscription.subscription_plans.name_en}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span>Protocol:</span>
                <span className="font-medium uppercase">{subscription.protocol}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Data Limit:</span>
                <span className="font-medium">{subscription.data_limit_gb} GB</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Duration:</span>
                <span className="font-medium">{subscription.duration_days} days</span>
              </div>

              {subscription.subscription_url && (
                <div className="space-y-2">
                  <span>Subscription URL:</span>
                  <div className="p-2 bg-muted rounded text-sm break-all">
                    {subscription.subscription_url}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Amount:</span>
                <span className="font-medium text-lg">{formatPrice(subscription.price_toman)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Payment Method:</span>
                <span className="font-medium">
                  {isManualPayment ? 'Manual Payment' : 'Online Payment'}
                </span>
              </div>

              {subscription.receipt_image_url && (
                <div className="space-y-2">
                  <span>Receipt:</span>
                  <img 
                    src={subscription.receipt_image_url} 
                    alt="Payment receipt" 
                    className="max-w-full h-auto rounded border"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {subscription.notes && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {subscription.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;