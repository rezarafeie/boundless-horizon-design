import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PaymentMethodSelector, { PaymentMethod } from '@/components/PaymentMethodSelector';
import ManualPaymentForm from '@/components/ManualPaymentForm';
import CryptoPaymentForm from '@/components/CryptoPaymentForm';
import StripePaymentForm from '@/components/StripePaymentForm';
import ZarinpalPayment from '@/components/ZarinpalPayment';
import DiscountField from '@/components/DiscountField';
import PaymentDebugPanel from '@/components/PaymentDebugPanel';
import { DiscountCode } from '@/types/subscription';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader } from 'lucide-react';

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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('zarinpal');
  const [showDebug, setShowDebug] = useState(false);
  const [isWaitingForApproval, setIsWaitingForApproval] = useState(false);
  const [manualPaymentData, setManualPaymentData] = useState<{
    trackingNumber: string;
    paymentTime: string;
    payerName: string;
  } | null>(null);

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

  const handleFreeSubscription = async () => {
    setIsSubmitting(true);
    debugLog('info', 'Processing free subscription');
    
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
          status: 'active',
          notes: `Free subscription - ${appliedDiscount ? `Discount: ${appliedDiscount.code}` : 'No discount'}`,
        })
        .select()
        .single();

      if (error) {
        debugLog('error', 'Free subscription creation failed', error);
        throw error;
      }

      debugLog('success', 'Free subscription activated', { subscriptionId: subscription.id });
      onSuccess({
        username: formData.username,
        subscription_url: `vmess://config-url-here`,
        expire: Date.now() + (formData.duration * 24 * 60 * 60 * 1000),
        data_limit: formData.dataLimit * 1073741824,
        status: 'active'
      });
    } catch (error) {
      console.error('Free subscription error:', error);
      debugLog('error', 'Free subscription failed', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در فعال‌سازی اشتراک رایگان' : 'Failed to activate free subscription',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualPayment = async (paymentData: { 
    trackingNumber: string; 
    paymentTime: string; 
    payerName: string; 
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
          notes: `Manual payment - Tracking: ${paymentData.trackingNumber}, Payer: ${paymentData.payerName}, Time: ${paymentData.paymentTime} - ${appliedDiscount ? `Discount: ${appliedDiscount.code}` : 'No discount'}`,
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

      // Store payment data and show waiting state instead of calling onSuccess
      setManualPaymentData({
        trackingNumber: paymentData.trackingNumber,
        paymentTime: paymentData.paymentTime,
        payerName: paymentData.payerName
      });
      setIsWaitingForApproval(true);

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
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .insert({
          username: formData.username,
          mobile: formData.mobile,
          data_limit_gb: formData.dataLimit,
          duration_days: formData.duration,
          protocol: 'vmess',
          price_toman: finalPrice,
          status: 'active',
          notes: `Crypto payment - ${appliedDiscount ? `Discount: ${appliedDiscount.code}` : 'No discount'}`,
        })
        .select()
        .single();

      if (error) {
        debugLog('error', 'Crypto payment processing failed', error);
        throw error;
      }

      debugLog('success', 'Crypto payment completed', { subscriptionId: subscription.id });
      onSuccess({
        username: formData.username,
        subscription_url: `vmess://config-url-here`,
        expire: Date.now() + (formData.duration * 24 * 60 * 60 * 1000),
        data_limit: formData.dataLimit
      });
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
  };

  const handleZarinpalPaymentStart = async () => {
    debugLog('info', 'Zarinpal payment started', { amount: finalPrice, mobile: formData.mobile });
    
    // Note: We do NOT create the subscription here anymore
    // The subscription will be created after payment confirmation
    // The ZarinpalPayment component will handle the actual payment flow
  };

  // If the final price is 0, show free subscription option
  if (finalPrice === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {language === 'fa' ? 'اشتراک رایگان' : 'Free Subscription'}
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {language === 'fa' ? 'اشتراک شما رایگان است!' : 'Your subscription is free!'}
          </p>
        </div>

        <DiscountField
          onDiscountApply={onDiscountApply}
          appliedDiscount={appliedDiscount}
        />

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-green-800 dark:text-green-200 text-center">
              🎉 {language === 'fa' ? 'اشتراک رایگان' : 'Free Subscription'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="text-3xl font-bold text-green-600">
                {language === 'fa' ? 'رایگان' : 'FREE'}
              </div>
              <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg">
                <div className="flex items-center justify-center gap-4 text-2xl">
                  <span>🎁</span>
                  <span>✨</span>
                  <span>🚀</span>
                </div>
                <p className="text-center text-sm text-muted-foreground mt-2">
                  {language === 'fa' ? 
                    'تخفیف شما این اشتراک را رایگان کرده است!' : 
                    'Your discount has made this subscription free!'
                  }
                </p>
              </div>
              <Button
                onClick={handleFreeSubscription}
                disabled={isSubmitting}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {isSubmitting ? (
                  language === 'fa' ? 'در حال فعال‌سازی...' : 'Activating...'
                ) : (
                  language === 'fa' ? 'فعال‌سازی اشتراک رایگان' : 'Activate Free Subscription'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

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
              <div className="flex justify-between border-t pt-2 font-bold text-green-600">
                <span>{language === 'fa' ? 'مجموع:' : 'Total:'}</span>
                <span>{language === 'fa' ? 'رایگان' : 'FREE'}</span>
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
  }

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
          <ZarinpalPayment
            amount={finalPrice}
            mobile={formData.mobile}
            onPaymentStart={handleZarinpalPaymentStart}
            isSubmitting={isSubmitting}
          />
        );
    }
  };

  // Show waiting for approval state for manual payments
  if (isWaitingForApproval && manualPaymentData) {
    return (
      <div className="space-y-6">
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader className="w-12 h-12 animate-spin mx-auto text-blue-600" />
              <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-200">
                {language === 'fa' ? 'در انتظار تأیید ادمین' : 'Waiting for Admin Approval'}
              </h2>
              <p className="text-blue-700 dark:text-blue-300">
                {language === 'fa' ? 
                  'سفارش شما دریافت شد. پس از تایید اطلاعات پرداخت لینک اتصال برای شما ساخته خواهد شد. لطفا منتظر بمانید.' : 
                  'Your order has been received. After payment information approval, the connection link will be created for you. Please wait.'
                }
              </p>
              <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg text-sm">
                <div className="grid grid-cols-1 gap-2 text-right">
                  <div>
                    <span className="text-muted-foreground">
                      {language === 'fa' ? 'شماره پیگیری:' : 'Tracking Number:'}
                    </span>
                    <span className="font-medium mr-2">{manualPaymentData.trackingNumber}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {language === 'fa' ? 'نام پرداخت کننده:' : 'Payer Name:'}
                    </span>
                    <span className="font-medium mr-2">{manualPaymentData.payerName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {language === 'fa' ? 'زمان پرداخت:' : 'Payment Time:'}
                    </span>
                    <span className="font-medium mr-2">{manualPaymentData.paymentTime}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-blue-600">
                {language === 'fa' ? 
                  'تا تایید ادمین لطفا منتظر بمانید...' : 
                  'Please wait for admin approval...'
                }
              </p>
            </div>
          </CardContent>
        </Card>

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
                  {finalPrice.toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                {finalPrice.toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}
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
