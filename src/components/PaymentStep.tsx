
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PaymentMethodSelector, { PaymentMethod } from '@/components/PaymentMethodSelector';
import ManualPaymentForm from '@/components/ManualPaymentForm';
import CryptoPaymentForm from '@/components/CryptoPaymentForm';
import StripePaymentForm from '@/components/StripePaymentForm';
import DiscountField from '@/components/DiscountField';
import PaymentDebugPanel from '@/components/PaymentDebugPanel';
import { DiscountCode } from '@/types/subscription';
import { useSubscriptionSubmit } from '@/hooks/useSubscriptionSubmit';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PaymentStepProps {
  formData: any;
  appliedDiscount: DiscountCode | null;
  onSuccess: (result: any) => void;
  isSubmitting: boolean;
  setIsSubmitting: (loading: boolean) => void;
  onDiscountApply: (discount: DiscountCode | null) => void;
}

const PaymentStep = ({ 
  formData, 
  appliedDiscount, 
  onSuccess, 
  isSubmitting, 
  setIsSubmitting,
  onDiscountApply 
}: PaymentStepProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const { submitSubscription } = useSubscriptionSubmit();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('zarinpal');
  const [showDebug, setShowDebug] = useState(false);

  // Calculate pricing
  const basePrice = formData.dataLimit * (formData.selectedPlan?.pricePerGB || 800);
  const discountAmount = appliedDiscount ? (basePrice * appliedDiscount.percentage) / 100 : 0;
  const finalPrice = Math.max(0, basePrice - discountAmount);

  const debugLog = (type: 'info' | 'error' | 'success' | 'warning', message: string, data?: any) => {
    console.log(`[PAYMENT-STEP] ${type.toUpperCase()}: ${message}`, data || '');
    if (window.debugPayment) {
      window.debugPayment(selectedPaymentMethod, type, message, data);
    }
  };

  const handleManualPayment = async (paymentData: { 
    receiptFile?: File; 
    confirmed: boolean;
    postCreationCallback?: (subscriptionId: string) => Promise<void>;
  }) => {
    if (!paymentData.confirmed) return;

    setIsSubmitting(true);
    debugLog('info', 'Manual payment started', paymentData);
    
    try {
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .insert({
          username: formData.username,
          mobile: formData.mobile,
          data_limit_gb: formData.dataLimit,
          duration_days: formData.duration,
          protocol: 'vmess',
          price_toman: finalPrice,
          status: 'pending',
          admin_decision: 'pending',
          notes: `Manual payment - ${appliedDiscount ? `Discount: ${appliedDiscount.code}` : 'No discount'}`,
          user_id: null
        })
        .select()
        .single();

      if (error) {
        debugLog('error', 'Subscription creation failed', error);
        throw error;
      }

      debugLog('success', 'Subscription created', subscription);

      if (paymentData.postCreationCallback) {
        await paymentData.postCreationCallback(subscription.id);
      }

      onSuccess({
        username: formData.username,
        subscription_url: null,
        expire: Date.now() + (formData.duration * 24 * 60 * 60 * 1000),
        data_limit: formData.dataLimit,
        status: 'pending'
      });

    } catch (error) {
      console.error('Manual payment error:', error);
      debugLog('error', 'Manual payment failed', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در ثبت درخواست' : 'Failed to submit request',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCryptoPayment = async (paymentId: string) => {
    setIsSubmitting(true);
    debugLog('info', 'Crypto payment success callback', { paymentId });
    
    try {
      const subscriptionData = {
        username: formData.username,
        mobile: formData.mobile,
        dataLimit: formData.dataLimit,
        duration: formData.duration,
        protocol: 'vmess',
        selectedPlan: formData.selectedPlan,
        appliedDiscount
      };

      const subscriptionId = await submitSubscription(subscriptionData);
      
      if (subscriptionId) {
        debugLog('success', 'Crypto payment completed', { subscriptionId });
        onSuccess({
          username: formData.username,
          subscription_url: `vmess://config-url-here`,
          expire: Date.now() + (formData.duration * 24 * 60 * 60 * 1000),
          data_limit: formData.dataLimit
        });
      }
    } catch (error) {
      console.error('Crypto payment processing error:', error);
      debugLog('error', 'Crypto payment processing failed', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در پردازش پرداخت' : 'Failed to process payment',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStripePayment = async (sessionId: string) => {
    debugLog('success', 'Stripe payment initiated', { sessionId });
    // Don't show toast here as user is being redirected
  };

  const handleZarinpalPayment = async () => {
    setIsSubmitting(true);
    debugLog('info', 'Zarinpal payment started', { amount: finalPrice });
    
    try {
      if (finalPrice === 0) {
        // Handle free subscription
        const subscriptionData = {
          username: formData.username,
          mobile: formData.mobile,
          dataLimit: formData.dataLimit,
          duration: formData.duration,
          protocol: 'vmess',
          selectedPlan: formData.selectedPlan,
          appliedDiscount
        };

        const subscriptionId = await submitSubscription(subscriptionData);
        
        if (subscriptionId) {
          debugLog('success', 'Free subscription activated', { subscriptionId });
          onSuccess({
            username: formData.username,
            subscription_url: `vmess://config-url-here`,
            expire: Date.now() + (formData.duration * 24 * 60 * 60 * 1000),
            data_limit: formData.dataLimit
          });
        }
        return;
      }

      // Create subscription first
      const subscriptionData = {
        username: formData.username,
        mobile: formData.mobile,
        dataLimit: formData.dataLimit,
        duration: formData.duration,
        protocol: 'vmess',
        selectedPlan: formData.selectedPlan,
        appliedDiscount
      };

      const subscriptionId = await submitSubscription(subscriptionData);
      
      if (!subscriptionId) {
        throw new Error('Failed to create subscription');
      }

      debugLog('info', 'Calling Zarinpal checkout function', { subscriptionId, amount: finalPrice });
      
      const { data, error } = await supabase.functions.invoke('zarinpal-checkout', {
        body: {
          amount: finalPrice,
          subscriptionId,
          description: `VPN Subscription - ${formData.username} - ${formData.dataLimit}GB`
        }
      });

      debugLog('info', 'Zarinpal function response', { data, error });

      if (error) {
        debugLog('error', 'Zarinpal checkout failed', error);
        throw error;
      }

      if (data?.success && data?.redirectUrl) {
        debugLog('info', 'Redirecting to Zarinpal', { url: data.redirectUrl });
        window.location.href = data.redirectUrl;
      } else {
        debugLog('error', 'Invalid Zarinpal response', data);
        throw new Error(data?.error || 'Failed to get Zarinpal redirect URL');
      }

    } catch (error) {
      console.error('Zarinpal payment error:', error);
      debugLog('error', 'Zarinpal payment failed', error);
      
      const errorMessage = error?.message || 'Payment processing failed';
      
      toast({
        title: language === 'fa' ? 'خطا در پرداخت' : 'Payment Error',
        description: language === 'fa' ? 
          `خطا در پردازش پرداخت: ${errorMessage}` : 
          `Payment processing failed: ${errorMessage}`,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPaymentForm = () => {
    switch (selectedPaymentMethod) {
      case 'manual':
        return (
          <ManualPaymentForm
            amount={finalPrice}
            onPaymentConfirm={handleManualPayment}
            isSubmitting={isSubmitting}
          />
        );
      case 'nowpayments':
        return (
          <CryptoPaymentForm
            amount={finalPrice}
            onPaymentSuccess={handleCryptoPayment}
            isSubmitting={isSubmitting}
          />
        );
      case 'stripe':
        return (
          <StripePaymentForm
            amount={finalPrice}
            subscriptionData={formData}
            onPaymentSuccess={handleStripePayment}
            isSubmitting={isSubmitting}
          />
        );
      case 'zarinpal':
      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>
                {language === 'fa' ? 'پرداخت زرین‌پال' : 'Zarinpal Payment'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="text-2xl font-bold text-primary">
                  {finalPrice === 0 ? (
                    language === 'fa' ? 'رایگان' : 'FREE'
                  ) : (
                    `${finalPrice.toLocaleString()} ${language === 'fa' ? 'تومان' : 'Toman'}`
                  )}
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center justify-center gap-4 text-2xl">
                    <span>💳</span>
                    <span>🇮🇷</span>
                    <span>⚡</span>
                  </div>
                  <p className="text-center text-sm text-muted-foreground mt-2">
                    {language === 'fa' ? 
                      'پرداخت آسان با کارت‌های ایرانی' : 
                      'Easy payment with Iranian cards'
                    }
                  </p>
                </div>
                <Button
                  onClick={handleZarinpalPayment}
                  disabled={isSubmitting}
                  className="w-full"
                  size="lg"
                >
                  {isSubmitting ? (
                    language === 'fa' ? 'در حال پردازش...' : 'Processing...'
                  ) : finalPrice === 0 ? (
                    language === 'fa' ? 'فعال‌سازی رایگان' : 'Activate Free'
                  ) : (
                    language === 'fa' ? 'پرداخت با زرین‌پال' : 'Pay with Zarinpal'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {language === 'fa' ? 'تکمیل پرداخت' : 'Complete Payment'}
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          {language === 'fa' ? 'روش پرداخت مورد نظر خود را انتخاب کنید' : 'Choose your preferred payment method'}
        </p>
      </div>

      <DiscountField
        onDiscountApply={onDiscountApply}
        appliedDiscount={appliedDiscount}
      />

      <PaymentMethodSelector
        selectedMethod={selectedPaymentMethod}
        onMethodChange={setSelectedPaymentMethod}
        amount={finalPrice}
      />

      {renderPaymentForm()}

      {/* Order Summary */}
      <Card className="bg-gray-50 dark:bg-gray-800">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-3">
            {language === 'fa' ? 'خلاصه سفارش' : 'Order Summary'}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>{language === 'fa' ? 'نام کاربری:' : 'Username:'}</span>
              <span className="font-medium">{formData.username}</span>
            </div>
            <div className="flex justify-between">
              <span>{language === 'fa' ? 'حجم داده:' : 'Data:'}</span>
              <span className="font-medium">{formData.dataLimit} GB</span>
            </div>
            <div className="flex justify-between">
              <span>{language === 'fa' ? 'مدت زمان:' : 'Duration:'}</span>
              <span className="font-medium">{formData.duration} {language === 'fa' ? 'روز' : 'days'}</span>
            </div>
            {appliedDiscount && (
              <div className="flex justify-between text-green-600">
                <span>{language === 'fa' ? 'تخفیف:' : 'Discount:'}</span>
                <span className="font-medium">-{appliedDiscount.percentage}%</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>{language === 'fa' ? 'مجموع:' : 'Total:'}</span>
              <span>
                {finalPrice === 0 ? (
                  language === 'fa' ? 'رایگان' : 'FREE'
                ) : (
                  `${finalPrice.toLocaleString()} ${language === 'fa' ? 'تومان' : 'Toman'}`
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug Panel */}
      <PaymentDebugPanel 
        isVisible={showDebug}
        onToggleVisibility={() => setShowDebug(!showDebug)}
      />
    </div>
  );
};

export default PaymentStep;
