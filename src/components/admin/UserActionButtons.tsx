
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
  AlertCircle,
  Send,
  Trash2
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
  email?: string;
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
      username: string;
      password: string;
    };
  };
}

interface UserActionButtonsProps {
  subscription: Subscription;
  onUpdate: () => void;
}

export const UserActionButtons = ({ subscription, onUpdate }: UserActionButtonsProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreatingVpn, setIsCreatingVpn] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSendingToAdmin, setIsSendingToAdmin] = useState(false);
  const { toast } = useToast();

  const handleSendToAdmin = async () => {
    setIsSendingToAdmin(true);
    
    try {
      console.log('📤 SEND_TO_ADMIN: Sending subscription data to webhook:', subscription.id);
      
      // Prepare comprehensive subscription data
      const webhookData = {
        subscription_id: subscription.id,
        username: subscription.username,
        mobile: subscription.mobile,
        email: subscription.email || '',
        status: subscription.status,
        data_limit_gb: subscription.data_limit_gb,
        duration_days: subscription.duration_days,
        price_toman: subscription.price_toman,
        plan_id: subscription.plan_id || '',
        created_at: subscription.created_at,
        expire_at: subscription.expire_at || '',
        subscription_url: subscription.subscription_url || '',
        notes: subscription.notes || '',
        panel_info: {
          name: subscription.subscription_plans?.panel_servers?.name || 'Unknown',
          url: subscription.subscription_plans?.panel_servers?.panel_url || '',
          type: subscription.subscription_plans?.panel_servers?.type || 'unknown'
        }
      };

      console.log('📤 SEND_TO_ADMIN: Webhook payload:', webhookData);

      // Send POST request to webhook
      const response = await fetch('https://rafeie.app.n8n.cloud/webhook-test/bnetswewbmailnewusernotification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        body: JSON.stringify(webhookData)
      });

      // Note: With no-cors mode, we can't check response status
      // The request was sent successfully if no error was thrown

      console.log('✅ SEND_TO_ADMIN: Successfully sent to webhook');

      toast({
        title: 'Sent to Admin',
        description: `Subscription info for ${subscription.username} has been sent to admin successfully`,
      });

    } catch (error) {
      console.error('❌ SEND_TO_ADMIN: Error sending to webhook:', error);
      
      toast({
        title: 'Error',
        description: `Failed to send subscription info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setIsSendingToAdmin(false);
    }
  };

  const handleDeleteSubscription = async () => {
    setIsDeleting(true);
    
    try {
      console.log('🗑️ DELETE_SUBSCRIPTION: Starting deletion process for:', subscription.id);
      
      // Step 1: Update subscription status to 'deleted' in database
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
          notes: `${subscription.notes || ''} - Deleted on ${new Date().toLocaleDateString()}`
        })
        .eq('id', subscription.id);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      console.log('✅ DELETE_SUBSCRIPTION: Database updated to deleted status');

      // Step 2: Get panel information and delete from panel
      let panelInfo = subscription.subscription_plans?.panel_servers;
      
      if (!panelInfo) {
        console.warn('⚠️ DELETE_SUBSCRIPTION: No panel info found, attempting fallback');
        
        // Fallback: get panel info based on plan_id
        const { data: planData } = await supabase
          .from('subscription_plans')
          .select(`
            *,
            panel_servers!assigned_panel_id(
              id,
              name,
              type,
              panel_url,
              username,
              password,
              health_status
            )
          `)
          .eq('plan_id', subscription.plan_id || 'lite')
          .single();
        
        panelInfo = planData?.panel_servers;
      }

      if (panelInfo && panelInfo.panel_url) {
        console.log('🔥 DELETE_SUBSCRIPTION: Deleting from panel:', panelInfo.name);
        
        // Determine API endpoint based on panel type
        const deleteEndpoint = panelInfo.type === 'marzneshin' 
          ? `${panelInfo.panel_url}/api/users/${subscription.username}`
          : `${panelInfo.panel_url}/api/user/${subscription.username}`;

        // Create auth header
        const authHeader = btoa(`${panelInfo.username}:${panelInfo.password}`);

        const response = await fetch(deleteEndpoint, {
          method: 'DELETE',
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok && response.status !== 404) {
          // 404 is acceptable (user already doesn't exist)
          throw new Error(`Panel deletion failed: ${response.status} ${response.statusText}`);
        }

        console.log('✅ DELETE_SUBSCRIPTION: Successfully deleted from panel');
      } else {
        console.warn('⚠️ DELETE_SUBSCRIPTION: No panel info available, skipping panel deletion');
      }

      // Step 3: Log the deletion attempt
      await supabase.from('user_creation_logs').insert({
        subscription_id: subscription.id,
        edge_function_name: 'manual-delete-subscription',
        request_data: { 
          username: subscription.username, 
          plan_id: subscription.plan_id,
          panel_info: panelInfo ? {
            name: panelInfo.name,
            url: panelInfo.panel_url,
            type: panelInfo.type
          } : null 
        },
        response_data: { deleted_at: new Date().toISOString() },
        success: true,
        panel_id: panelInfo?.id || null,
        panel_name: panelInfo?.name || null,
        panel_url: panelInfo?.panel_url || null
      });

      toast({
        title: 'Subscription Deleted',
        description: `Subscription for ${subscription.username} has been deleted successfully`,
      });

      onUpdate();
      
    } catch (error) {
      console.error('❌ DELETE_SUBSCRIPTION: Error during deletion:', error);
      
      // Log the failed attempt
      await supabase.from('user_creation_logs').insert({
        subscription_id: subscription.id,
        edge_function_name: 'manual-delete-subscription',
        request_data: { username: subscription.username, plan_id: subscription.plan_id },
        response_data: {},
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
      
      toast({
        title: 'Error',
        description: `Failed to delete subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
    }
  };

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
      console.log('🔵 MANUAL_VPN: Manually creating VPN user for subscription:', subscription.id);
      
      // CRITICAL FIX: Get the CORRECT panel based on subscription's plan
      let panelInfo = null;
      let apiType = 'marzban'; // Default
      
      try {
        console.log('🔍 MANUAL_VPN: Looking up CORRECT assigned panel for plan_id:', subscription.plan_id);
        
        // Get the subscription plan with its assigned panel
        const { data: planData, error: planError } = await supabase
          .from('subscription_plans')
          .select(`
            *,
            panel_servers!assigned_panel_id(
              id,
              name,
              type,
              panel_url,
              username,
              password,
              is_active,
              health_status
            )
          `)
          .eq('plan_id', subscription.plan_id || 'lite')
          .eq('is_active', true)
          .single();

        if (!planError && planData?.panel_servers) {
          panelInfo = planData.panel_servers;
          apiType = planData.api_type || 'marzban';
          
          console.log('🟢 MANUAL_VPN: Found CORRECT assigned panel:', {
            planId: planData.plan_id,
            planName: planData.name_en,
            panelName: panelInfo.name,
            panelUrl: panelInfo.panel_url,
            panelType: panelInfo.type
          });
        } else {
          console.error('❌ MANUAL_VPN: No assigned panel found for plan:', subscription.plan_id, planError);
          
          // STRICT FALLBACK: Only use panels that match the plan type
          const targetPanelType = subscription.plan_id === 'plus' ? 'cp.rain.rest' : 'file.shopifysb.xyz';
          console.log('🔍 MANUAL_VPN: Using STRICT fallback for plan type:', subscription.plan_id, 'targeting:', targetPanelType);
          
          const { data: fallbackPanel } = await supabase
            .from('panel_servers')
            .select('*')
            .eq('type', 'marzban')
            .eq('is_active', true)
            .eq('health_status', 'online')
            .like('panel_url', `%${targetPanelType}%`)
            .limit(1)
            .single();
          
          if (fallbackPanel) {
            panelInfo = fallbackPanel;
            console.log('🟡 MANUAL_VPN: Using STRICT fallback panel:', {
              planType: subscription.plan_id,
              panelName: panelInfo.name,
              panelUrl: panelInfo.panel_url
            });
          }
        }
      } catch (error) {
        console.error('❌ MANUAL_VPN: Error getting panel info:', error);
      }

      if (!panelInfo) {
        throw new Error(`No active panel available for plan "${subscription.plan_id}" VPN creation`);
      }

      // CRITICAL VERIFICATION: Ensure correct panel is being used
      const isCorrectPanel = (
        (subscription.plan_id === 'plus' && panelInfo.panel_url.includes('rain')) ||
        (subscription.plan_id === 'lite' && panelInfo.panel_url.includes('shopifysb'))
      );

      console.log('🔍 MANUAL_VPN: Panel verification:', {
        subscriptionPlan: subscription.plan_id,
        panelUrl: panelInfo.panel_url,
        isCorrectPanel,
        panelName: panelInfo.name
      });

      if (!isCorrectPanel) {
        throw new Error(`PANEL MISMATCH: Plan "${subscription.plan_id}" cannot use panel "${panelInfo.name}" (${panelInfo.panel_url})`);
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

      console.log(`🔵 MANUAL_VPN: Creating VPN user via ${apiType} API on CORRECT panel:`, {
        panel: panelInfo.name,
        url: panelInfo.panel_url,
        planType: subscription.plan_id
      });

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
      updateData.notes = `${existingNotes} - VPN created manually on correct panel ${new Date().toLocaleDateString()}`;

      const { error: updateError } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('id', subscription.id);

      if (updateError) {
        console.error('Failed to update subscription:', updateError);
      }

      toast({
        title: 'VPN User Created',
        description: 'VPN user has been created successfully on the correct panel',
      });

      onUpdate();
      
    } catch (error) {
      console.error('❌ MANUAL_VPN: Error creating VPN user:', error);
      
      // Log the failed attempt
      await supabase.from('user_creation_logs').insert({
        subscription_id: subscription.id,
        edge_function_name: 'manual-vpn-creation',
        request_data: { username: subscription.username, plan_id: subscription.plan_id },
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

      {/* Send to Admin Button */}
      <Button 
        size="sm" 
        variant="outline"
        onClick={handleSendToAdmin}
        disabled={isSendingToAdmin}
        className="border-blue-200 text-blue-700 hover:bg-blue-50"
      >
        {isSendingToAdmin ? (
          <Loader className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <Send className="w-4 h-4 mr-1" />
        )}
        Send
      </Button>

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

      {/* Delete Subscription Button */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            size="sm" 
            variant="destructive"
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <Loader className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-1" />
            )}
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Delete Subscription
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the subscription for <strong>{subscription.username}</strong>?
              <div className="mt-2 p-3 bg-red-50 rounded-lg text-sm">
                <strong>This action will:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Mark the subscription as deleted in the database</li>
                  <li>Remove the user from the VPN panel</li>
                  <li>Hide the subscription from the admin panel</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSubscription}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
