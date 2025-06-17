
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState(null);

  const debugLog = (type: 'info' | 'error' | 'success' | 'warning', message: string, data?: any) => {
    console.log(`[PAYMENT-SUCCESS] ${type.toUpperCase()}: ${message}`, data || '');
    if (window.debugPayment) {
      window.debugPayment('stripe', type, message, data);
    }
  };

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        debugLog('info', 'PaymentSuccess page loaded');
        
        // Get session_id from URL parameters
        const sessionId = searchParams.get('session_id');
        debugLog('info', 'URL parameters check', { 
          sessionId, 
          allParams: Object.fromEntries(searchParams.entries()),
          fullUrl: window.location.href 
        });

        if (!sessionId) {
          debugLog('error', 'No session_id found in URL parameters');
          setError('No session ID found. Please try again.');
          setLoading(false);
          return;
        }

        debugLog('info', 'Verifying Stripe session', { sessionId });

        // Call the Stripe verification function
        const { data, error } = await supabase.functions.invoke('stripe-verify-session', {
          body: { sessionId }
        });

        if (error) {
          debugLog('error', 'Stripe verification failed', error);
          throw error;
        }

        if (!data?.success) {
          debugLog('error', 'Stripe verification returned error', data);
          throw new Error(data?.error || 'Payment verification failed');
        }

        debugLog('success', 'Payment verified successfully', data.subscription);
        setSubscriptionData(data.subscription);

        // Show success message
        toast({
          title: language === 'fa' ? 'پرداخت موفق' : 'Payment Successful',
          description: language === 'fa' ? 
            'پرداخت شما با موفقیت انجام شد.' : 
            'Your payment was processed successfully.',
        });

        // Redirect to delivery page after 2 seconds
        setTimeout(() => {
          const deliveryUrl = `/delivery?subscriptionData=${encodeURIComponent(JSON.stringify(data.subscription))}`;
          debugLog('info', 'Redirecting to delivery page', { url: deliveryUrl });
          navigate(deliveryUrl);
        }, 2000);

      } catch (error) {
        console.error('Payment verification error:', error);
        debugLog('error', 'Payment verification failed', error);
        setError(error.message || 'Payment verification failed');
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams, navigate, language, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" />
              <h2 className="text-xl font-semibold">
                {language === 'fa' ? 'در حال تأیید پرداخت...' : 'Verifying Payment...'}
              </h2>
              <p className="text-gray-600">
                {language === 'fa' ? 
                  'لطفاً صبر کنید تا پرداخت شما تأیید شود' : 
                  'Please wait while we verify your payment'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-6 h-6" />
              {language === 'fa' ? 'خطا در پرداخت' : 'Payment Error'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">{error}</p>
            <div className="space-y-2">
              <Button 
                onClick={() => navigate('/subscription')} 
                className="w-full"
              >
                {language === 'fa' ? 'بازگشت به صفحه اشتراک' : 'Back to Subscription'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                {language === 'fa' ? 'تلاش مجدد' : 'Try Again'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-6 h-6" />
            {language === 'fa' ? 'پرداخت موفق' : 'Payment Successful'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            {language === 'fa' ? 
              'پرداخت شما با موفقیت انجام شد. در حال انتقال به صفحه جزئیات...' : 
              'Your payment was successful. Redirecting to details page...'
            }
          </p>
          {subscriptionData && (
            <div className="text-sm text-gray-500">
              <p>{language === 'fa' ? 'نام کاربری:' : 'Username:'} {subscriptionData.username}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
