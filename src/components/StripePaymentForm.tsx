
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StripePaymentFormProps {
  amount: number;
  mobile: string;
  subscriptionId: string;
  onPaymentStart: () => void;
  isSubmitting: boolean;
  selectedService?: any; // Add selectedService prop
}

const StripePaymentForm = ({ amount, mobile, subscriptionId, onPaymentStart, isSubmitting, selectedService }: StripePaymentFormProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const debugLog = (type: 'info' | 'error' | 'success' | 'warning', message: string, data?: any) => {
    if (window.debugPayment) {
      window.debugPayment('stripe', type, message, data);
    }
  };

  // Convert Toman to USD (40,000 Toman = 1 USD) with minimum $1
  const usdAmount = Math.max(1, Math.ceil(amount / 40000));
  
  // Determine product name
  const productName = selectedService 
    ? (selectedService.name_en || selectedService.name)
    : 'Bnets Subscription';

  const handleStripeCheckout = async () => {
    setLoading(true);
    onPaymentStart();
    debugLog('info', 'Starting Stripe checkout', { amount, usdAmount, subscriptionId, mobile, productName });
    
    try {
      const origin = window.location.origin;
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          amount: usdAmount * 100, // Convert USD to cents
          currency: 'usd',
          productName: productName,
          metadata: {
            subscription_id: subscriptionId,
            mobile: mobile,
            original_amount_toman: amount
          },
          successUrl: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${origin}/subscription`
        }
      });

      if (error) {
        debugLog('error', 'Stripe checkout error', error);
        throw error;
      }
      
      if (data?.url) {
        debugLog('success', 'Redirecting to Stripe checkout', { url: data.url });
        window.location.href = data.url;
      } else {
        debugLog('error', 'No checkout URL received', data);
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Stripe payment error:', error);
      debugLog('error', 'Stripe payment failed', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در ایجاد پرداخت Stripe' : 'Failed to create Stripe payment',
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
          {language === 'fa' ? 'پرداخت با کارت اعتباری' : 'Credit Card Payment'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary mb-2">
            ${usdAmount} USD
          </div>
          <p className="text-muted-foreground">
            {language === 'fa' ? 
              'پرداخت امن با Stripe' : 
              'Secure payment with Stripe'
            }
          </p>
        </div>

        <Button 
          onClick={handleStripeCheckout}
          disabled={loading || isSubmitting}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 mr-2 animate-spin" />
              {language === 'fa' ? 'در حال انتقال...' : 'Redirecting...'}
            </>
          ) : (
            language === 'fa' ? 'پرداخت با Stripe' : 'Pay with Stripe'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default StripePaymentForm;
