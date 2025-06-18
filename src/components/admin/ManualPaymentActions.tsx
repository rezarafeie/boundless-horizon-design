
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
        
        // Get subscription details to determine which API to use
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('id', subscriptionId)
          .single();

        if (subscription) {
          // Determine API type from plan configuration
          let planApiType = 'marzneshin'; // Default fallback
          
          if (subscription.notes) {
            // Extract plan info from notes
            const planMatch = subscription.notes.match(/Plan:\s*(\w+)/i);
            if (planMatch) {
              const planName = planMatch[1].toLowerCase();
              console.log('Found plan name in notes:', planName);
              
              // Query the subscription_plans table to get the API type
              const { data: planData, error: planError } = await supabase
                .from('subscription_plans')
                .select('api_type')
                .ilike('plan_id', planName)
                .eq('is_active', true)
                .single();
              
              if (!planError && planData) {
                planApiType = planData.api_type;
                console.log('Found plan API type from database:', planApiType);
              } else {
                console.warn('Could not find plan in database, using default API type');
              }
            }
          }

          console.log(`Using API type: ${planApiType} for subscription:`, subscriptionId);

          // Try to create VPN user via the appropriate API
          let vpnResult = null;
          let apiUsed = '';
          
          try {
            if (planApiType === 'marzban') {
              console.log('Creating VPN user via Marzban API...');
              const { data: marzbanResult, error: marzbanError } = await supabase.functions.invoke(
                'marzban-create-user',
                {
                  body: {
                    username: subscription.username,
                    dataLimitGB: subscription.data_limit_gb,
                    durationDays: subscription.duration_days,
                    notes: `Manual payment approved - ${subscription.notes || ''}`
                  }
                }
              );
              
              if (!marzbanError && marzbanResult?.success) {
                vpnResult = marzbanResult.data;
                apiUsed = 'marzban';
                console.log('Marzban user created successfully');
              } else {
                throw new Error(marzbanError?.message || 'Marzban API failed');
              }
            } else {
              console.log('Creating VPN user via Marzneshin API...');
              const { data: marzneshinResult, error: marzneshinError } = await supabase.functions.invoke(
                'marzneshin-create-user',
                {
                  body: {
                    username: subscription.username,
                    dataLimitGB: subscription.data_limit_gb,
                    durationDays: subscription.duration_days,
                    notes: `Manual payment approved - ${subscription.notes || ''}`
                  }
                }
              );
              
              if (!marzneshinError && marzneshinResult?.success) {
                vpnResult = marzneshinResult.data;
                apiUsed = 'marzneshin';
                console.log('Marzneshin user created successfully');
              } else {
                throw new Error(marzneshinError?.message || 'Marzneshin API failed');
              }
            }
            
            if (vpnResult?.subscription_url) {
              updateData.subscription_url = vpnResult.subscription_url;
              updateData.marzban_user_created = true;
              updateData.expire_at = new Date(Date.now() + (subscription.duration_days * 24 * 60 * 60 * 1000)).toISOString();
              
              // Update notes to include which API was used
              const existingNotes = subscription.notes || '';
              updateData.notes = `${existingNotes} - VPN created via ${apiUsed}`;
              console.log(`VPN user created successfully via ${apiUsed}`);
            }
          } catch (vpnError) {
            console.error('VPN creation failed:', vpnError);
            // Continue with approval even if VPN creation fails
            const existingNotes = subscription.notes || '';
            updateData.notes = `${existingNotes} - VPN creation failed: ${vpnError.message}`;
          }
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
              This will activate their VPN subscription immediately using the appropriate API based on their plan configuration.
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
