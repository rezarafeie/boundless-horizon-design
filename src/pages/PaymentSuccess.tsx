import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PaymentSuccess = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processStripePayment = async () => {
      try {
        if (window.debugPayment) {
          window.debugPayment('stripe', 'info', 'Processing Stripe payment success', { 
            searchParams: Object.fromEntries(searchParams.entries()) 
          });
        }

        const sessionId = searchParams.get('session_id');
        if (!sessionId) {
          throw new Error('No session ID found');
        }

        if (window.debugPayment) {
          window.debugPayment('stripe', 'info', 'Verifying Stripe session', { sessionId });
        }

        // Verify the Stripe session and create subscription
        const { data: stripeData, error: stripeError } = await supabase.functions.invoke('stripe-verify-session', {
          body: { sessionId }
        });

        if (stripeError) {
          throw stripeError;
        }

        if (!stripeData.success) {
          throw new Error(stripeData.error || 'Payment verification failed');
        }

        const subscriptionData = stripeData.subscription;

        if (window.debugPayment) {
          window.debugPayment('stripe', 'success', 'Stripe payment verified and subscription created', subscriptionData);
        }

        toast({
          title: language === 'fa' ? 'پرداخت موفق' : 'Payment Successful',
          description: language === 'fa' ? 
            'پرداخت شما تأیید شد. در حال انتقال...' : 
            'Your payment has been confirmed. Redirecting...',
        });

        // Redirect to delivery page with real subscription data
        setTimeout(() => {
          navigate('/delivery', { 
            state: { subscriptionData },
            replace: true 
          });
        }, 2000);

      } catch (error) {
        console.error('Stripe payment processing error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(errorMessage);
        
        if (window.debugPayment) {
          window.debugPayment('stripe', 'error', 'Stripe payment processing failed', { error: errorMessage });
        }

        toast({
          title: language === 'fa' ? 'خطا در پرداخت' : 'Payment Error',
          description: language === 'fa' ? 
            'خطا در پردازش پرداخت. لطفا دوباره تلاش کنید.' : 
            'Error processing payment. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsProcessing(false);
      }
    };

    processStripePayment();
  }, [searchParams, navigate, toast, language]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {isProcessing ? (
              <>
                <Loader className="w-6 h-6 animate-spin text-blue-600" />
                {language === 'fa' ? 'پردازش پرداخت...' : 'Processing Payment...'}
              </>
            ) : error ? (
              <>
                <AlertCircle className="w-6 h-6 text-red-600" />
                {language === 'fa' ? 'خطا در پرداخت' : 'Payment Error'}
              </>
            ) : (
              <>
                <CheckCircle className="w-6 h-6 text-green-600" />
                {language === 'fa' ? 'پرداخت موفق' : 'Payment Successful'}
              </>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          {isProcessing && (
            <p className="text-muted-foreground">
              {language === 'fa' ? 
                'لطفا صبر کنید. در حال تأیید پرداخت...' : 
                'Please wait. Verifying your payment...'
              }
            </p>
          )}
          
          {error && (
            <div className="space-y-2">
              <p className="text-red-600">
                {language === 'fa' ? 'خطا در پردازش پرداخت:' : 'Payment processing error:'}
              </p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <button
                onClick={() => navigate('/subscription')}
                className="text-blue-600 hover:underline"
              >
                {language === 'fa' ? 'بازگشت به صفحه پرداخت' : 'Return to Payment Page'}
              </button>
            </div>
          )}
          
          {!isProcessing && !error && (
            <p className="text-green-600">
              {language === 'fa' ? 
                'در حال انتقال به صفحه جزئیات...' : 
                'Redirecting to details page...'
              }
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
