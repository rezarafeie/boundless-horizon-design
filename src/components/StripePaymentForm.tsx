
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StripePaymentFormProps {
  amount: number;
  subscriptionData: any;
  onPaymentSuccess: (sessionId: string) => void;
  isSubmitting: boolean;
}

const StripePaymentForm = ({ amount, subscriptionData, onPaymentSuccess, isSubmitting }: StripePaymentFormProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const usdAmount = Math.ceil(amount / 60000); // Convert Toman to USD

  const debugLog = (type: 'info' | 'error' | 'success' | 'warning', message: string, data?: any) => {
    console.log(`[STRIPE-PAYMENT] ${type.toUpperCase()}: ${message}`, data || '');
    if (window.debugPayment) {
      window.debugPayment('stripe', type, message, data);
    }
  };

  const createCheckoutSession = async () => {
    setLoading(true);
    debugLog('info', 'Starting Stripe checkout creation', { 
      amount: usdAmount, 
      subscriptionData 
    });

    try {
      // Ensure minimum amount
      const finalAmount = Math.max(usdAmount, 1);
      const amountInCents = finalAmount * 100;

      debugLog('info', 'Calling Stripe checkout function', {
        amount: amountInCents,
        finalAmount,
        originalAmount: usdAmount
      });

      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          amount: amountInCents, // Stripe expects cents
          currency: 'usd',
          productName: `VPN Subscription - ${subscriptionData.dataLimit}GB`,
          metadata: {
            username: subscriptionData.username,
            mobile: subscriptionData.mobile,
            dataLimit: subscriptionData.dataLimit.toString(),
            duration: subscriptionData.duration.toString(),
            protocol: subscriptionData.protocol || 'vmess'
          },
          successUrl: `${window.location.origin}/payment-success`,
          cancelUrl: `${window.location.origin}/subscription`
        }
      });

      debugLog('info', 'Stripe function response', { data, error });

      if (error) {
        debugLog('error', 'Supabase function error', error);
        throw error;
      }

      if (!data?.url) {
        debugLog('error', 'No checkout URL received', data);
        throw new Error('No checkout URL received from Stripe');
      }

      debugLog('success', 'Checkout session created successfully', { 
        url: data.url,
        sessionId: data.session_id 
      });
      
      // Redirect to Stripe checkout
      debugLog('info', 'Redirecting to Stripe checkout', { url: data.url });
      window.location.href = data.url;
      
      // Call success callback with session ID
      if (data.session_id) {
        onPaymentSuccess(data.session_id);
      }
      
      toast({
        title: language === 'fa' ? 'هدایت به درگاه پرداخت' : 'Redirecting to Payment',
        description: language === 'fa' ? 
          'در حال انتقال به صفحه پرداخت...' : 
          'Redirecting to payment page...',
      });

    } catch (error) {
      console.error('Stripe payment error:', error);
      debugLog('error', 'Stripe checkout creation failed', error);
      
      const errorMessage = error?.message || 'Failed to create payment session';
      
      toast({
        title: language === 'fa' ? 'خطا در پرداخت' : 'Payment Error',
        description: language === 'fa' ? 
          `خطا در ایجاد پرداخت: ${errorMessage}` : 
          `Failed to create payment: ${errorMessage}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          {language === 'fa' ? 'پرداخت کارتی' : 'Card Payment'}
          <Badge variant="outline">USD</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary mb-2">
            ${Math.max(usdAmount, 1)} USD
          </div>
          <p className="text-muted-foreground">
            {language === 'fa' ? 
              'پرداخت امن با کارت‌های بین‌المللی' : 
              'Secure payment with international cards'
            }
          </p>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center justify-center gap-4 text-2xl">
            <span>💳</span>
            <span>🔒</span>
            <span>🌍</span>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">
            {language === 'fa' ? 
              'پرداخت امن توسط Stripe' : 
              'Secure payment powered by Stripe'
            }
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {language === 'fa' ? 'مبلغ اصلی:' : 'Original Amount:'}
            </span>
            <span>{amount.toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span className="text-muted-foreground">
              {language === 'fa' ? 'مبلغ نهایی:' : 'Final Amount:'}
            </span>
            <span>${Math.max(usdAmount, 1)} USD</span>
          </div>
          {usdAmount < 1 && (
            <p className="text-xs text-yellow-600">
              {language === 'fa' ? 
                'حداقل مبلغ پرداخت $1 است' : 
                'Minimum payment amount is $1'
              }
            </p>
          )}
        </div>

        <Button 
          onClick={createCheckoutSession}
          disabled={loading || isSubmitting}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 mr-2 animate-spin" />
              {language === 'fa' ? 'ایجاد پرداخت...' : 'Creating Payment...'}
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              {language === 'fa' ? 'پرداخت با کارت' : 'Pay with Card'}
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          {language === 'fa' ? 
            'پرداخت توسط Stripe محافظت می‌شود' : 
            'Payment secured by Stripe'
          }
        </p>
      </CardContent>
    </Card>
  );
};

export default StripePaymentForm;
