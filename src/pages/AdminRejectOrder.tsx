import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const AdminRejectOrder = () => {
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

    rejectSubscription(id);
  }, [id]);

  const rejectSubscription = async (subscriptionId: string) => {
    try {
      console.log('ADMIN_REJECT: Rejecting subscription:', subscriptionId);

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
          status: 'rejected',
          admin_decision: 'rejected',
          admin_decided_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (updateError) {
        throw new Error('Failed to update subscription status');
      }

      setResult({ 
        success: true, 
        message: 'Subscription rejected successfully!' 
      });

      // Redirect to success page after 3 seconds
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 3000);

    } catch (error) {
      console.error('ADMIN_REJECT: Error rejecting subscription:', error);
      setResult({ 
        success: false, 
        message: `Failed to reject subscription: ${error.message}` 
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
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-red-600" />
            <h2 className="text-xl font-semibold mb-2">Processing Rejection</h2>
            <p className="text-gray-600">Please wait while we reject the subscription...</p>
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
              <h2 className="text-xl font-semibold text-green-800 mb-2">Rejection Successful</h2>
              <p className="text-gray-600 mb-4">{result.message}</p>
              <p className="text-sm text-gray-500">Redirecting to admin dashboard...</p>
            </>
          ) : (
            <>
              <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-red-800 mb-2">Rejection Failed</h2>
              <p className="text-gray-600">{result?.message}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRejectOrder;