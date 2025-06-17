
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PaymentSuccess = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      try {
        // Get session_id from URL parameters
        const sessionId = searchParams.get('session_id');
        const subscriptionDataParam = searchParams.get('subscriptionData');

        console.log('PaymentSuccess - URL params:', { sessionId, subscriptionDataParam });

        if (sessionId) {
          // This is a Stripe payment - verify the session
          console.log('Processing Stripe payment with session ID:', sessionId);
          
          const { data, error } = await supabase.functions.invoke('stripe-verify-session', {
            body: { sessionId }
          });

          console.log('Stripe verification response:', { data, error });

          if (error) {
            console.error('Stripe verification error:', error);
            throw new Error(error.message || 'Failed to verify payment');
          }

          if (data?.success && data?.subscription) {
            setSubscriptionData(data.subscription);
            console.log('Stripe payment verified successfully:', data.subscription);
            
            // Store for delivery page
            localStorage.setItem('deliverySubscriptionData', JSON.stringify(data.subscription));
            
            toast({
              title: language === 'fa' ? 'پرداخت موفق' : 'Payment Successful',
              description: language === 'fa' ? 
                'پرداخت با موفقیت انجام شد. در حال انتقال...' : 
                'Payment completed successfully. Redirecting...',
            });

            // Redirect to delivery page after short delay
            setTimeout(() => {
              navigate('/delivery', { state: { subscriptionData: data.subscription } });
            }, 2000);
          } else {
            throw new Error('Payment verification failed');
          }
        } else if (subscriptionDataParam) {
          // This is from other payment methods with subscription data in URL
          try {
            const decodedData = JSON.parse(decodeURIComponent(subscriptionDataParam));
            setSubscriptionData(decodedData);
            console.log('Decoded subscription data:', decodedData);
            
            // Store for delivery page
            localStorage.setItem('deliverySubscriptionData', JSON.stringify(decodedData));
            
            // Redirect to delivery page
            setTimeout(() => {
              navigate('/delivery', { state: { subscriptionData: decodedData } });
            }, 2000);
          } catch (parseError) {
            console.error('Failed to parse subscription data:', parseError);
            throw new Error('Invalid subscription data format');
          }
        } else {
          throw new Error('No payment data found in URL');
        }
      } catch (error) {
        console.error('Payment success handling error:', error);
        setError(error.message);
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: error.message,
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    handlePaymentSuccess();
  }, [searchParams, navigate, language, toast]);

  const goToDelivery = () => {
    if (subscriptionData) {
      navigate('/delivery', { state: { subscriptionData } });
    } else {
      navigate('/subscription');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader className="w-12 h-12 animate-spin mx-auto text-blue-600" />
              <h2 className="text-xl font-semibold">
                {language === 'fa' ? 'در حال بررسی پرداخت...' : 'Verifying Payment...'}
              </h2>
              <p className="text-muted-foreground">
                {language === 'fa' ? 
                  'لطفا صبر کنید تا پرداخت شما بررسی شود' : 
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {language === 'fa' ? 'خطا در پرداخت' : 'Payment Error'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/subscription')} variant="outline" className="flex-1">
                {language === 'fa' ? 'تلاش مجدد' : 'Try Again'}
              </Button>
              <Button onClick={() => navigate('/')} className="flex-1">
                {language === 'fa' ? 'صفحه اصلی' : 'Home'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-600 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {language === 'fa' ? 'پرداخت موفق' : 'Payment Successful'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            {language === 'fa' ? 
              'پرداخت شما با موفقیت انجام شد. در حال انتقال به صفحه جزئیات...' : 
              'Your payment was successful. Redirecting to details page...'
            }
          </p>
          
          {subscriptionData && (
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-sm">
              <p><strong>{language === 'fa' ? 'نام کاربری:' : 'Username:'}</strong> {subscriptionData.username}</p>
              <p><strong>{language === 'fa' ? 'وضعیت:' : 'Status:'}</strong> {subscriptionData.status || 'Active'}</p>
            </div>
          )}
          
          <Button onClick={goToDelivery} className="w-full">
            {language === 'fa' ? 'مشاهده جزئیات' : 'View Details'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
