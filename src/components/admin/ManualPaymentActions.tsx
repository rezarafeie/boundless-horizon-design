
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

  // Show actions only if status is pending and admin_decision is pending
  if (status !== 'pending' || adminDecision !== 'pending') {
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
        updateData.status = 'paid';
        
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
          console.log('🔵 MANUAL_PAYMENT: Using admin-approve-subscription edge function for consistency');
          
          // Generate a temporary decision token for the approval process
          const tempToken = crypto.randomUUID();
          
          // Update subscription with the temp token first
          const { error: tokenError } = await supabase
            .from('subscriptions')
            .update({ admin_decision_token: tempToken })
            .eq('id', subscriptionId);
          
          if (tokenError) {
            throw new Error('Failed to prepare subscription for approval');
          }
          
          // ✅ Use the same admin-approve-subscription edge function that AdminApproveOrder uses
          // This ensures consistent panel configuration usage and proper VPN creation
          const { data: approveResult, error: approveError } = await supabase.functions.invoke('admin-approve-subscription', {
            body: {
              subscriptionId: subscription.id,
              action: 'approve',
              token: tempToken
            }
          });
          
          if (approveError) {
            throw new Error(`Admin approval function failed: ${approveError.message}`);
          }
          
          if (!approveResult?.success) {
            throw new Error(`Approval process failed: ${approveResult?.error || 'Unknown error'}`);
          }
          
          console.log('🟢 MANUAL_PAYMENT: VPN user created successfully via admin-approve-subscription');
          
          // The edge function handles all updates, so we don't need to update again
          // Just refresh the data to get the latest state
          onStatusUpdate();
          return; // Exit early since the edge function handled everything
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
      } else {
        // For rejected payments
        updateData.status = 'cancelled';
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
