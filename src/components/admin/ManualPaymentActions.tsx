
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { PanelUserCreationService } from '@/services/panelUserCreationService';
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

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    setIsProcessing(true);
    
    try {
      console.log(`🔵 MANUAL_PAYMENT: Processing ${decision} for subscription:`, subscriptionId);
      
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
          console.log('🔵 MANUAL_PAYMENT: Creating VPN user automatically after approval');
          
          // ✅ NEW: Use the PanelUserCreationService for automatic VPN creation
          const vpnResult = await PanelUserCreationService.createUserFromPanel({
            planId: subscription.plan_id,
            username: subscription.username,
            dataLimitGB: subscription.data_limit_gb,
            durationDays: subscription.duration_days,
            notes: `Manual payment approved - Amount: ${subscription.price_toman} Toman`,
            subscriptionId: subscription.id
          });
          
          if (vpnResult.success && vpnResult.data?.subscription_url) {
            updateData.subscription_url = vpnResult.data.subscription_url;
            updateData.marzban_user_created = true;
            updateData.expire_at = new Date(Date.now() + (subscription.duration_days * 24 * 60 * 60 * 1000)).toISOString();
            
            // Update notes to include success
            const existingNotes = subscription.notes || '';
            updateData.notes = `${existingNotes} - VPN created automatically after approval using ${vpnResult.data.panel_type} panel`;
            
            console.log('🟢 MANUAL_PAYMENT: VPN user created successfully automatically');
            
            // Log successful creation
            await logUserCreationAttempt(
              subscription.id,
              vpnResult.data.panel_type === 'marzneshin' ? 'marzneshin-create-user' : 'marzban-create-user',
              {
                planId: subscription.plan_id,
                username: subscription.username,
                dataLimitGB: subscription.data_limit_gb,
                durationDays: subscription.duration_days
              },
              true,
              vpnResult.data,
              null,
              {
                panel_id: vpnResult.data.panel_id,
                panel_name: vpnResult.data.panel_name,
                panel_url: vpnResult.data.panel_url
              }
            );
          } else {
            throw new Error(vpnResult.error || 'VPN creation failed');
          }
        } catch (vpnError) {
          console.error('❌ MANUAL_PAYMENT: VPN creation failed:', vpnError);
          
          // Log failed attempt
          await logUserCreationAttempt(
            subscription.id,
            'automatic-creation-after-approval',
            {
              planId: subscription.plan_id,
              username: subscription.username
            },
            false,
            null,
            vpnError instanceof Error ? vpnError.message : 'Unknown error'
          );
          
          // Continue with approval even if VPN creation fails
          const existingNotes = subscription.notes || '';
          updateData.notes = `${existingNotes} - VPN creation failed after approval: ${vpnError instanceof Error ? vpnError.message : 'Unknown error'}`;
          
          console.log('🟡 MANUAL_PAYMENT: Continuing with approval despite VPN creation failure');
        }
      }

      const { error } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('id', subscriptionId);

      if (error) {
        console.error('❌ MANUAL_PAYMENT: Database update error:', error);
        throw error;
      }

      toast({
        title: decision === 'approved' ? 'Payment Approved' : 'Payment Rejected',
        description: decision === 'approved' 
          ? `Manual payment for ${username} has been approved and VPN creation attempted.`
          : `Manual payment for ${username} has been rejected.`,
      });

      onStatusUpdate();
      
    } catch (error) {
      console.error(`❌ MANUAL_PAYMENT: Error ${decision} payment:`, error);
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
              This will activate their VPN subscription and automatically create their VPN user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleDecision('approved')}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve & Create VPN
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
