
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
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          amount: usdAmount * 100, // Stripe expects cents
          currency: 'usd',
          productName: `VPN Subscription - ${subscriptionData.dataLimit}GB`,
          metadata: {
            username: subscriptionData.username,
            mobile: subscriptionData.mobile,
            dataLimit: subscriptionData.dataLimit,
            duration: subscriptionData.duration,
            protocol: subscriptionData.protocol
          },
          successUrl: `${window.location.origin}/payment-success`,
          cancelUrl: `${window.location.origin}/subscription`
        }
      });

      if (error) {
        debugLog('error', 'Supabase function error', error);
        throw error;
      }

      if (data?.url) {
        debugLog('success', 'Checkout session created successfully', { url: data.url });
        
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
        
        toast({
          title: language === 'fa' ? 'هدایت به درگاه پرداخت' : 'Redirecting to Payment',
          description: language === 'fa' ? 
            'صفحه پرداخت در تب جدید باز شد' : 
            'Payment page opened in new tab',
        });
      } else {
        debugLog('error', 'No checkout URL received', data);
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Stripe payment error:', error);
      debugLog('error', 'Stripe checkout creation failed', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در ایجاد پرداخت' : 'Failed to create payment',
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
            ${usdAmount} USD
          </div>
          <p className="text-muted-foreground">
            {language === 'fa' ? 
              'پرداخت با کارت‌های ویزا/مسترکارت' : 
              'Pay with Visa/Mastercard'
            }
          </p>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center justify-center gap-4 text-2xl">
            <span>💎</span>
            <span>💳</span>
            <span>🌍</span>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">
            {language === 'fa' ? 
              'پرداخت امن و بین‌المللی' : 
              'Secure international payment'
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
            <span>${usdAmount} USD</span>
          </div>
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
