
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
        // Generate subscription URL with proper format
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        updateData.subscription_url = `vmess://eyJ2IjoiMiIsInBzIjoiQm91bmRsZXNzTmV0LSR7dXNlcm5hbWV9IiwiYWRkIjoic2VydmVyLmJuZXRzLmNvIiwicG9ydCI6IjQ0MyIsImlkIjoiJHtyYW5kb21JZH0iLCJhaWQiOiIwIiwic2N5IjoiYXV0byIsIm5ldCI6IndzIiwidHlwZSI6Im5vbmUiLCJob3N0IjoiIiwicGF0aCI6Ii8iLCJ0bHMiOiJ0bHMiLCJzbmkiOiIifQ==`;
        updateData.expire_at = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(); // 30 days from now
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
              This will activate their VPN subscription immediately.
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
              variant="destructive"
            >
              Reject Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
