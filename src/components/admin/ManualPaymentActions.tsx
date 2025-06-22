
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
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

interface ManualPaymentActionsProps {
  subscriptionId: string;
  status: string;
  adminDecision: string | null;
  username: string;
  amount: number;
  onStatusUpdate: () => void;
}

export const ManualPaymentActions = ({ 
  subscriptionId, 
  status, 
  adminDecision, 
  username, 
  amount,
  onStatusUpdate 
}: ManualPaymentActionsProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Don't show actions if already decided or not a manual payment
  if (status !== 'pending' || (adminDecision && adminDecision !== 'pending')) {
    return null;
  }

  const logUserCreationAttempt = async (
    subscriptionId: string,
    functionName: string,
    requestData: any,
    success: boolean,
    responseData?: any,
    errorMessage?: string,
    panelInfo?: any
  ) => {
    try {
      await supabase.from('user_creation_logs').insert({
        subscription_id: subscriptionId,
        edge_function_name: functionName,
        request_data: requestData,
        response_data: responseData || {},
        success: success,
        error_message: errorMessage || null,
        panel_id: panelInfo?.panel_id || null,
        panel_name: panelInfo?.panel_name || null,
        panel_url: panelInfo?.panel_url || null
      });
    } catch (logError) {
      console.error('Failed to log user creation attempt:', logError);
    }
  };

  const createVpnUser = async (subscription: any) => {
    console.log('Creating VPN user for subscription:', subscription.id);
    
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
        console.log('Found panel info:', panelInfo);
      } else {
        console.warn('No panel mapping found, using fallback');
        // Fallback to any active panel of the right type
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
          console.log('Using fallback panel:', panelInfo);
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
      notes: `Manual payment approved - Amount: ${subscription.price_toman} Toman`,
      panelId: panelInfo.id,
      subscriptionId: subscription.id
    };

    console.log(`Creating VPN user via ${apiType} API...`);

    try {
      let result;
      let functionName;

      if (apiType === 'marzban') {
        functionName = 'marzban-create-user';
        const { data, error } = await supabase.functions.invoke('marzban-create-user', {
          body: requestData
        });
        
        if (error) throw error;
        result = data;
      } else {
        functionName = 'marzneshin-create-user';
        const { data, error } = await supabase.functions.invoke('marzneshin-create-user', {
          body: requestData
        });
        
        if (error) throw error;
        result = data;
      }

      // Log the attempt
      await logUserCreationAttempt(
        subscription.id,
        functionName,
        requestData,
        result?.success || false,
        result,
        result?.error,
        {
          panel_id: panelInfo.id,
          panel_name: panelInfo.name,
          panel_url: panelInfo.panel_url
        }
      );

      if (!result?.success) {
        throw new Error(result?.error || 'VPN creation failed');
      }

      console.log('VPN user created successfully:', result);
      return result;

    } catch (error) {
      // Log the failed attempt
      await logUserCreationAttempt(
        subscription.id,
        apiType === 'marzban' ? 'marzban-create-user' : 'marzneshin-create-user',
        requestData,
        false,
        null,
        error instanceof Error ? error.message : 'Unknown error',
        {
          panel_id: panelInfo.id,
          panel_name: panelInfo.name,
          panel_url: panelInfo.panel_url
        }
      );
      
      throw error;
    }
  };

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    setIsProcessing(true);
    
    try {
      console.log(`Processing ${decision} for subscription:`, subscriptionId);
      
      const updateData: any = {
        admin_decision: decision,
        admin_decided_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (decision === 'approved') {
        updateData.status = 'active';
        
        // Get subscription details
        const { data: subscription, error: fetchError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('id', subscriptionId)
          .single();

        if (fetchError || !subscription) {
          throw new Error('Failed to fetch subscription details');
        }

        try {
          // Create VPN user
          const vpnResult = await createVpnUser(subscription);
          
          if (vpnResult?.data?.subscription_url) {
            updateData.subscription_url = vpnResult.data.subscription_url;
            updateData.marzban_user_created = true;
            updateData.expire_at = new Date(Date.now() + (subscription.duration_days * 24 * 60 * 60 * 1000)).toISOString();
            
            // Update notes to include success
            const existingNotes = subscription.notes || '';
            updateData.notes = `${existingNotes} - VPN created successfully`;
            console.log('VPN user created successfully');
          }
        } catch (vpnError) {
          console.error('VPN creation failed:', vpnError);
          // Continue with approval even if VPN creation fails
          const existingNotes = subscription.notes || '';
          updateData.notes = `${existingNotes} - VPN creation failed: ${vpnError instanceof Error ? vpnError.message : 'Unknown error'}`;
        }
      }

      const { error } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('id', subscriptionId);

      if (error) {
        console.error('Database update error:', error);
        throw error;
      }

      toast({
        title: decision === 'approved' ? 'Payment Approved' : 'Payment Rejected',
        description: `Manual payment for ${username} has been ${decision}.`,
      });

      onStatusUpdate();
      
    } catch (error) {
      console.error(`Error ${decision} payment:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${decision} payment. Please try again.`,
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            size="sm" 
            variant="default"
            disabled={isProcessing}
            className="bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Approve
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve the payment of {amount.toLocaleString()} Toman for {username}?
              This will activate their VPN subscription and attempt to create their VPN user automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleDecision('approved')}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            size="sm" 
            variant="destructive"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            Reject
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject the payment of {amount.toLocaleString()} Toman for {username}?
              This action cannot be undone and the user will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleDecision('rejected')}
              className="bg-destructive hover:bg-destructive/90"
            >
              Reject Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
