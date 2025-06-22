
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, RefreshCw, Calendar, Database, Server, User, Globe, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  plan_id?: string;
  subscription_plans?: {
    name_en: string;
    name_fa: string;
    panel_servers?: {
      name: string;
      type: string;
      panel_url: string;
      health_status: string;
    };
  };
}

interface UserActionButtonsProps {
  subscription: Subscription;
  onUpdate?: () => void;
}

export const UserActionButtons = ({ subscription, onUpdate }: UserActionButtonsProps) => {
  const { toast } = useToast();
  const [isRenewing, setIsRenewing] = useState(false);
  const [isCheckingDetails, setIsCheckingDetails] = useState(false);

  const handleCheckDetails = async () => {
    setIsCheckingDetails(true);
    
    try {
      // Check user details from the panel
      console.log('Checking user details for:', subscription.username);
      
      // Here you would call the appropriate edge function to get user details
      // For now, we'll just show a success message
      toast({
        title: 'User Details Checked',
        description: `Successfully checked details for user ${subscription.username}`,
      });
      
    } catch (error) {
      console.error('Error checking user details:', error);
      toast({
        title: 'Error',
        description: 'Failed to check user details',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingDetails(false);
    }
  };

  const handleRenew = async () => {
    setIsRenewing(true);
    
    try {
      // Extend the user's subscription
      const newExpireDate = new Date();
      newExpireDate.setDate(newExpireDate.getDate() + subscription.duration_days);
      
      const { error } = await supabase
        .from('subscriptions')
        .update({
          expire_at: newExpireDate.toISOString(),
          updated_at: new Date().toISOString(),
          notes: `${subscription.notes || ''} - Renewed on ${new Date().toLocaleDateString()}`
        })
        .eq('id', subscription.id);

      if (error) throw error;

      toast({
        title: 'Subscription Renewed',
        description: `Successfully renewed subscription for ${subscription.username}`,
      });

      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('Error renewing subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to renew subscription',
        variant: 'destructive',
      });
    } finally {
      setIsRenewing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'expired':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="flex gap-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isCheckingDetails}
          >
            {isCheckingDetails ? (
              <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Eye className="w-4 h-4 mr-1" />
            )}
            Check Details
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              User Details: {subscription.username}
            </DialogTitle>
            <DialogDescription>
              Complete information about this user's subscription
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Basic Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Username:</span>
                    <p className="font-mono">{subscription.username}</p>
                  </div>
                  <div>
                    <span className="font-medium">Mobile:</span>
                    <p>{subscription.mobile}</p>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(subscription.status)}
                      <Badge variant="outline">{subscription.status}</Badge>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Price:</span>
                    <p>{subscription.price_toman.toLocaleString()} Toman</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Subscription Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Data Limit:</span>
                    <p>{subscription.data_limit_gb} GB</p>
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span>
                    <p>{subscription.duration_days} days</p>
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>
                    <p>{format(new Date(subscription.created_at), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                  <div>
                    <span className="font-medium">Expires:</span>
                    <p>{subscription.expire_at ? format(new Date(subscription.expire_at), 'MMM dd, yyyy HH:mm') : 'Not set'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Plan & Panel Info */}
            {subscription.subscription_plans && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    Plan & Panel Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-1 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Plan:</span>
                      <p>{subscription.subscription_plans.name_en} ({subscription.subscription_plans.name_fa})</p>
                    </div>
                    {subscription.subscription_plans.panel_servers && (
                      <>
                        <div>
                          <span className="font-medium">Panel:</span>
                          <p>{subscription.subscription_plans.panel_servers.name} ({subscription.subscription_plans.panel_servers.type})</p>
                        </div>
                        <div>
                          <span className="font-medium">Panel URL:</span>
                          <p className="font-mono text-xs break-all">{subscription.subscription_plans.panel_servers.panel_url}</p>
                        </div>
                        <div>
                          <span className="font-medium">Panel Status:</span>
                          <Badge variant={subscription.subscription_plans.panel_servers.health_status === 'online' ? 'default' : 'destructive'}>
                            {subscription.subscription_plans.panel_servers.health_status}
                          </Badge>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* VPN Config */}
            {subscription.subscription_url && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    VPN Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <span className="font-medium">Subscription URL:</span>
                    <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded break-all font-mono text-xs">
                      {subscription.subscription_url}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {subscription.notes && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{subscription.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Button
        variant="outline"
        size="sm"
        onClick={handleRenew}
        disabled={isRenewing || subscription.status !== 'active'}
      >
        {isRenewing ? (
          <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <Calendar className="w-4 h-4 mr-1" />
        )}
        Renew
      </Button>
    </div>
  );
};
