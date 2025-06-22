
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Eye, 
  RefreshCw, 
  Loader, 
  User, 
  Calendar, 
  DollarSign, 
  Server,
  Zap,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,  
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

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
  marzban_user_created?: boolean;
  plan_id?: string;
}

interface UserActionButtonsProps {
  subscription: Subscription;
  onUpdate: () => void;
}

export const UserActionButtons = ({ subscription, onUpdate }: UserActionButtonsProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreatingVpn, setIsCreatingVpn] = useState(false);
  const { toast } = useToast();

  const handleRenew = async () => {
    setIsProcessing(true);
    
    try {
      console.log('Renewing subscription:', subscription.id);
      
      // Extend expiry by the original duration
      const currentExpiry = subscription.expire_at ? new Date(subscription.expire_at) : new Date();
      const newExpiry = new Date(currentExpiry.getTime() + (subscription.duration_days * 24 * 60 * 60 * 1000));
      
      const { error } = await supabase
        .from('subscriptions')
        .update({
          expire_at: newExpiry.toISOString(),
          updated_at: new Date().toISOString(),
          notes: `${subscription.notes || ''} - Renewed on ${new Date().toLocaleDateString()}`
        })
        .eq('id', subscription.id);

      if (error) {
        throw error;
      }

      toast({
        title: 'Subscription Renewed',
        description: `Extended expiry to ${newExpiry.toLocaleDateString()}`,
      });

      onUpdate();
      
    } catch (error) {
      console.error('Error renewing subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to renew subscription. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const createVpnUser = async () => {
    setIsCreatingVpn(true);
    
    try {
      console.log('Manually creating VPN user for subscription:', subscription.id);
      
      // Get plan information to determine the correct API and panel
      let panelInfo = null;
      let apiType = 'marzban'; // Default
      
      try {
        // Get plan details with panel mapping
        const { data: planData, error: planError } = await supabase
          .from('subscription_plans')
          .select(`
            *,
            plan_panel_mappings!inner(
              panel_id,
              is_primary,
              panel_servers!inner(
                id,
                name,
                type,
                panel_url,
                username,
                password,
                is_active,
                health_status
              )
            )
          `)
          .eq('plan_id', subscription.plan_id || 'lite')
          .eq('plan_panel_mappings.is_primary', true)
          .single();

        if (!planError && planData?.plan_panel_mappings?.[0]) {
          const mapping = planData.plan_panel_mappings[0];
          panelInfo = mapping.panel_servers;
          apiType = planData.api_type || 'marzban';
        } else {
          // Fallback to any active panel
          const { data: fallbackPanel } = await supabase
            .from('panel_servers')
            .select('*')
            .eq('type', 'marzban')
            .eq('is_active', true)
            .eq('health_status', 'online')
            .limit(1)
            .single();
          
          if (fallbackPanel) {
            panelInfo = fallbackPanel;
          }
        }
      } catch (error) {
        console.error('Error getting panel info:', error);
      }

      if (!panelInfo) {
        throw new Error('No active panel available for VPN creation');
      }

      // Prepare request data
      const requestData = {
        username: subscription.username,
        dataLimitGB: subscription.data_limit_gb,
        durationDays: subscription.duration_days,
        notes: `Manual VPN creation - ${subscription.notes || ''}`,
        panelId: panelInfo.id,
        subscriptionId: subscription.id
      };

      console.log(`Creating VPN user via ${apiType} API...`);

      let result;
      if (apiType === 'marzban') {
        const { data, error } = await supabase.functions.invoke('marzban-create-user', {
          body: requestData
        });
        
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase.functions.invoke('marzneshin-create-user', {
          body: requestData
        });
        
        if (error) throw error;
        result = data;
      }

      // Log the attempt
      await supabase.from('user_creation_logs').insert({
        subscription_id: subscription.id,
        edge_function_name: apiType === 'marzban' ? 'marzban-create-user' : 'marzneshin-create-user',
        request_data: requestData,
        response_data: result || {},
        success: result?.success || false,
        error_message: result?.error || null,
        panel_id: panelInfo.id,
        panel_name: panelInfo.name,
        panel_url: panelInfo.panel_url
      });

      if (!result?.success) {
        throw new Error(result?.error || 'VPN creation failed');
      }

      // Update subscription with VPN details
      const updateData: any = {
        marzban_user_created: true,
        updated_at: new Date().toISOString()
      };

      if (result.data?.subscription_url) {
        updateData.subscription_url = result.data.subscription_url;
      }

      if (!subscription.expire_at && subscription.duration_days) {
        updateData.expire_at = new Date(Date.now() + (subscription.duration_days * 24 * 60 * 60 * 1000)).toISOString();
      }

      // Update notes
      const existingNotes = subscription.notes || '';
      updateData.notes = `${existingNotes} - VPN created manually on ${new Date().toLocaleDateString()}`;

      const { error: updateError } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('id', subscription.id);

      if (updateError) {
        console.error('Failed to update subscription:', updateError);
      }

      toast({
        title: 'VPN User Created',
        description: 'VPN user has been created successfully',
      });

      onUpdate();
      
    } catch (error) {
      console.error('Error creating VPN user:', error);
      
      // Log the failed attempt
      await supabase.from('user_creation_logs').insert({
        subscription_id: subscription.id,
        edge_function_name: 'manual-vpn-creation',
        request_data: { username: subscription.username },
        response_data: {},
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
      
      toast({
        title: 'Error',
        description: `Failed to create VPN user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setIsCreatingVpn(false);
    }
  };

  return (
    <div className="flex gap-2">
      {/* Check Details Button */}
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Eye className="w-4 h-4 mr-1" />
            Details
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              User Details: {subscription.username}
            </DialogTitle>
            <DialogDescription>
              Comprehensive information about this subscription
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Basic Information</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Username:</strong> {subscription.username}</div>
                  <div><strong>Mobile:</strong> {subscription.mobile}</div>
                  <div><strong>Status:</strong> 
                    <Badge className="ml-2" variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                      {subscription.status}
                    </Badge>
                  </div>
                  <div><strong>Admin Decision:</strong> {subscription.admin_decision || 'None'}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Subscription Details</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    <strong>Price:</strong> {subscription.price_toman.toLocaleString()} Toman
                  </div>
                  <div><strong>Data Limit:</strong> {subscription.data_limit_gb} GB</div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <strong>Duration:</strong> {subscription.duration_days} days
                  </div>
                  <div><strong>Plan ID:</strong> {subscription.plan_id || 'Not set'}</div>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Important Dates</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div><strong>Created:</strong> {new Date(subscription.created_at).toLocaleString()}</div>
                <div><strong>Expires:</strong> {subscription.expire_at ? new Date(subscription.expire_at).toLocaleString() : 'Not set'}</div>
              </div>
            </div>

            {/* VPN Status */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                <Server className="w-4 h-4" />
                VPN Status
              </h4>
              <div className="space-y-1 text-sm">
                <div><strong>VPN Created:</strong> 
                  <Badge className="ml-2" variant={subscription.marzban_user_created ? 'default' : 'destructive'}>
                    {subscription.marzban_user_created ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div><strong>Subscription URL:</strong> 
                  {subscription.subscription_url ? (
                    <a href={subscription.subscription_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline">
                      View Config
                    </a>
                  ) : (
                    <span className="ml-2 text-muted-foreground">Not generated</span>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            {subscription.notes && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Notes</h4>
                <div className="bg-muted p-3 rounded-lg text-sm">
                  {subscription.notes}
                </div>
              </div>
            )}

            {/* Technical Details */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Technical Details</h4>
              <div className="text-sm">
                <div><strong>Subscription ID:</strong> <code className="text-xs">{subscription.id}</code></div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create VPN User Button (only show if VPN not created yet) */}
      {!subscription.marzban_user_created && subscription.status === 'active' && (
        <Button 
          size="sm" 
          variant="outline"
          onClick={createVpnUser}
          disabled={isCreatingVpn}
          className="border-blue-200 text-blue-700 hover:bg-blue-50"
        >
          {isCreatingVpn ? (
            <Loader className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Zap className="w-4 h-4 mr-1" />
          )}
          Create VPN
        </Button>
      )}

      {/* Renew Button */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            size="sm" 
            variant="outline"
            disabled={isProcessing}
            className="border-green-200 text-green-700 hover:bg-green-50"
          >
            {isProcessing ? (
              <Loader className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            Renew
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Renew Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to extend the subscription for {subscription.username} by {subscription.duration_days} days?
              {subscription.expire_at && (
                <span className="block mt-2 text-sm">
                  Current expiry: {new Date(subscription.expire_at).toLocaleDateString()}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRenew}
              className="bg-green-600 hover:bg-green-700"
            >
              Extend Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
