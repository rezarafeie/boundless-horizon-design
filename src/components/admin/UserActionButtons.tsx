
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
        body: JSON.stringify(webhookData)
      });

      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
      }

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
        
        try {
          // Step 1: Get access token (following VPN creation pattern)
          const authEndpoint = panelInfo.type === 'marzneshin' 
            ? `${panelInfo.panel_url}/api/admins/token`  // Marzneshin
            : `${panelInfo.panel_url}/api/admin/token`;   // Marzban

          const params = new URLSearchParams();
          params.append('username', panelInfo.username);
          params.append('password', panelInfo.password);

          const authStartTime = Date.now();
          console.log('🔑 DELETE_SUBSCRIPTION: Getting access token from:', authEndpoint);
          console.log('🔑 DELETE_SUBSCRIPTION: Auth request details:', {
            method: 'POST',
            endpoint: authEndpoint,
            panelType: panelInfo.type,
            username: panelInfo.username,
            password: '[REDACTED]',
            body: `username=${panelInfo.username}&password=[REDACTED]`
          });

          // Log authentication attempt
          await supabase.from('user_creation_logs').insert({
            subscription_id: subscription.id,
            edge_function_name: 'manual-delete-auth-attempt',
            request_data: { 
              auth_endpoint: authEndpoint,
              panel_type: panelInfo.type,
              username: panelInfo.username,
              timestamp: new Date().toISOString()
            },
            response_data: {},
            success: false,
            panel_id: panelInfo.id,
            panel_name: panelInfo.name,
            panel_url: panelInfo.panel_url
          });

          const authResponse = await fetch(authEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json',
            },
            body: params.toString()
          });

          const authEndTime = Date.now();
          const authDuration = authEndTime - authStartTime;

          console.log('🔑 DELETE_SUBSCRIPTION: Auth response details:', {
            status: authResponse.status,
            statusText: authResponse.statusText,
            duration: `${authDuration}ms`,
            headers: Object.fromEntries(authResponse.headers.entries())
          });

          if (!authResponse.ok) {
            const errorText = await authResponse.text().catch(() => 'No response body');
            console.error('❌ DELETE_SUBSCRIPTION: Auth failed with response:', errorText);
            
            // Log authentication failure
            await supabase.from('user_creation_logs').insert({
              subscription_id: subscription.id,
              edge_function_name: 'manual-delete-auth-failed',
              request_data: { 
                auth_endpoint: authEndpoint,
                panel_type: panelInfo.type,
                duration_ms: authDuration
              },
              response_data: { 
                status: authResponse.status,
                statusText: authResponse.statusText,
                error_body: errorText
              },
              success: false,
              error_message: `Authentication failed: ${authResponse.status} ${authResponse.statusText}`,
              panel_id: panelInfo.id,
              panel_name: panelInfo.name,
              panel_url: panelInfo.panel_url
            });
            
            throw new Error(`Authentication failed: ${authResponse.status} ${authResponse.statusText}`);
          }

          const authData = await authResponse.json();
          const accessToken = authData.access_token;

          console.log('✅ DELETE_SUBSCRIPTION: Auth successful, token received:', {
            tokenReceived: !!accessToken,
            tokenLength: accessToken?.length || 0,
            duration: `${authDuration}ms`,
            authData: { ...authData, access_token: accessToken ? '[REDACTED]' : null }
          });

          if (!accessToken) {
            // Log token missing
            await supabase.from('user_creation_logs').insert({
              subscription_id: subscription.id,
              edge_function_name: 'manual-delete-no-token',
              request_data: { auth_endpoint: authEndpoint },
              response_data: authData,
              success: false,
              error_message: 'No access token received from panel',
              panel_id: panelInfo.id,
              panel_name: panelInfo.name,
              panel_url: panelInfo.panel_url
            });
            
            throw new Error('No access token received from panel');
          }

          // Log successful authentication
          await supabase.from('user_creation_logs').insert({
            subscription_id: subscription.id,
            edge_function_name: 'manual-delete-auth-success',
            request_data: { 
              auth_endpoint: authEndpoint,
              duration_ms: authDuration
            },
            response_data: { 
              status: authResponse.status,
              token_received: true,
              token_length: accessToken.length
            },
            success: true,
            panel_id: panelInfo.id,
            panel_name: panelInfo.name,
            panel_url: panelInfo.panel_url
          });

          console.log('✅ DELETE_SUBSCRIPTION: Got access token, proceeding with deletion');

          // Step 2: Delete user with Bearer token
          const deleteEndpoint = panelInfo.type === 'marzneshin' 
            ? `${panelInfo.panel_url}/api/users/${subscription.username}`
            : `${panelInfo.panel_url}/api/user/${subscription.username}`;

          const deleteStartTime = Date.now();
          console.log('🗑️ DELETE_SUBSCRIPTION: Sending DELETE request:', {
            method: 'DELETE',
            endpoint: deleteEndpoint,
            username: subscription.username,
            headers: {
              'Authorization': `Bearer [TOKEN-${accessToken.length}-CHARS]`,
              'Content-Type': 'application/json'
            }
          });

          // Add timeout and retry logic for Marzban delete issues
          const deleteWithTimeout = async (attempt = 1): Promise<Response> => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
            
            try {
              const response = await fetch(deleteEndpoint, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                signal: controller.signal
              });
              clearTimeout(timeoutId);
              return response;
            } catch (error) {
              clearTimeout(timeoutId);
              
              // Retry logic for network failures (max 2 retries)
              if (attempt < 2 && (error instanceof Error && (error.name === 'AbortError' || error.message.includes('fetch')))) {
                console.log(`🔄 DELETE_SUBSCRIPTION: Retry attempt ${attempt + 1} after error:`, error.message);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
                return deleteWithTimeout(attempt + 1);
              }
              throw error;
            }
          };

          const deleteResponse = await deleteWithTimeout();

          const deleteEndTime = Date.now();
          const deleteDuration = deleteEndTime - deleteStartTime;

          console.log('🗑️ DELETE_SUBSCRIPTION: DELETE response details:', {
            status: deleteResponse.status,
            statusText: deleteResponse.statusText,
            duration: `${deleteDuration}ms`,
            headers: Object.fromEntries(deleteResponse.headers.entries())
          });

          let deleteResponseBody = '';
          try {
            deleteResponseBody = await deleteResponse.text();
            console.log('🗑️ DELETE_SUBSCRIPTION: DELETE response body:', deleteResponseBody);
          } catch (e) {
            console.log('🗑️ DELETE_SUBSCRIPTION: No response body or failed to read');
          }

          if (!deleteResponse.ok && deleteResponse.status !== 404) {
            // Log deletion failure
            await supabase.from('user_creation_logs').insert({
              subscription_id: subscription.id,
              edge_function_name: 'manual-delete-failed',
              request_data: { 
                delete_endpoint: deleteEndpoint,
                username: subscription.username,
                duration_ms: deleteDuration
              },
              response_data: { 
                status: deleteResponse.status,
                statusText: deleteResponse.statusText,
                response_body: deleteResponseBody
              },
              success: false,
              error_message: `Panel deletion failed: ${deleteResponse.status} ${deleteResponse.statusText}`,
              panel_id: panelInfo.id,
              panel_name: panelInfo.name,
              panel_url: panelInfo.panel_url
            });
            
            // 404 is acceptable (user already doesn't exist)
            throw new Error(`Panel deletion failed: ${deleteResponse.status} ${deleteResponse.statusText}`);
          }

          // Log successful deletion
          await supabase.from('user_creation_logs').insert({
            subscription_id: subscription.id,
            edge_function_name: 'manual-delete-success',
            request_data: { 
              delete_endpoint: deleteEndpoint,
              username: subscription.username,
              duration_ms: deleteDuration
            },
            response_data: { 
              status: deleteResponse.status,
              statusText: deleteResponse.statusText,
              response_body: deleteResponseBody
            },
            success: true,
            panel_id: panelInfo.id,
            panel_name: panelInfo.name,
            panel_url: panelInfo.panel_url
          });

          console.log('✅ DELETE_SUBSCRIPTION: Successfully deleted from panel');
        } catch (authError) {
          console.error('❌ DELETE_SUBSCRIPTION: Panel deletion error:', authError);
          
          // Log the overall error
          await supabase.from('user_creation_logs').insert({
            subscription_id: subscription.id,
            edge_function_name: 'manual-delete-error',
            request_data: { 
              username: subscription.username,
              panel_name: panelInfo.name,
              panel_url: panelInfo.panel_url
            },
            response_data: {},
            success: false,
            error_message: authError instanceof Error ? authError.message : 'Unknown deletion error',
            panel_id: panelInfo.id,
            panel_name: panelInfo.name,
            panel_url: panelInfo.panel_url
          });
          
          // Don't throw here - log but continue with database cleanup
          console.warn('⚠️ DELETE_SUBSCRIPTION: Panel deletion failed, but continuing with database cleanup');
        }
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

  // Check if subscription is cancelled or deleted
  const isDeleted = subscription.status === 'cancelled' || subscription.notes?.includes('- Deleted on');

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
      {/* Check Details Button */}
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="min-h-[44px] flex-1 sm:flex-none">
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
        className="border-blue-200 text-blue-700 hover:bg-blue-50 min-h-[44px] flex-1 sm:flex-none"
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
          className="border-blue-200 text-blue-700 hover:bg-blue-50 min-h-[44px] flex-1 sm:flex-none"
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
            className="border-green-200 text-green-700 hover:bg-green-50 min-h-[44px] flex-1 sm:flex-none"
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

      {/* Delete Subscription Button - Hide for cancelled/deleted subscriptions */}
      {!isDeleted && (
        <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            size="sm" 
            variant="destructive"
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 min-h-[44px] flex-1 sm:flex-none"
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
      )}
    </div>
  );
};
