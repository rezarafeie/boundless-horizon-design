import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const AdminApproveOrder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!id) {
      setResult({ success: false, message: 'No subscription ID provided' });
      setLoading(false);
      return;
    }

    approveSubscription(id);
  }, [id]);

  const approveSubscription = async (subscriptionId: string) => {
    try {
      console.log('ADMIN_APPROVE: Approving subscription:', subscriptionId);

      // Get subscription details
      const { data: subscription, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (fetchError || !subscription) {
        throw new Error('Subscription not found');
      }

      // Update subscription status
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          admin_decision: 'approved',
          admin_decided_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (updateError) {
        throw new Error('Failed to update subscription status');
      }

      // Send admin approval edge function call
      try {
        await supabase.functions.invoke('admin-approve-subscription', {
          body: { subscriptionId }
        });
      } catch (functionError) {
        console.error('ADMIN_APPROVE: VPN creation failed:', functionError);
        // Don't fail the approval for VPN creation issues
      }

      setResult({ 
        success: true, 
        message: 'Subscription approved successfully! VPN user will be created shortly.' 
      });

      // Redirect to success page after 3 seconds
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 3000);

    } catch (error) {
      console.error('ADMIN_APPROVE: Error approving subscription:', error);
      setResult({ 
        success: false, 
        message: `Failed to approve subscription: ${error.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
            <h2 className="text-xl font-semibold mb-2">Processing Approval</h2>
            <p className="text-gray-600">Please wait while we approve the subscription...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {result?.success ? (
            <>
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-green-800 mb-2">Approval Successful</h2>
              <p className="text-gray-600 mb-4">{result.message}</p>
              <p className="text-sm text-gray-500">Redirecting to admin dashboard...</p>
            </>
          ) : (
            <>
              <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-red-800 mb-2">Approval Failed</h2>
              <p className="text-gray-600">{result?.message}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminApproveOrder;