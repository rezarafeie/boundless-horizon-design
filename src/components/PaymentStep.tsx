import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import PaymentMethodSelector, { PaymentMethod } from '@/components/PaymentMethodSelector';
import ManualPaymentForm from '@/components/ManualPaymentForm';
import CryptoPaymentForm from '@/components/CryptoPaymentForm';
import StripePaymentForm from '@/components/StripePaymentForm';
import DiscountField from '@/components/DiscountField';
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

  // Calculate pricing
  const basePrice = formData.dataLimit * (formData.selectedPlan?.pricePerGB || 800);
  const discountAmount = appliedDiscount ? (basePrice * appliedDiscount.percentage) / 100 : 0;
  const finalPrice = Math.max(0, basePrice - discountAmount);

  const handleManualPayment = async (paymentData: { 
    receiptFile?: File; 
    confirmed: boolean;
    postCreationCallback?: (subscriptionId: string) => Promise<void>;
  }) => {
    if (!paymentData.confirmed) return;

    setIsSubmitting(true);
    try {
      // Insert subscription with manual payment status
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .insert({
          username: formData.username,
          mobile: formData.mobile,
          data_limit_gb: formData.dataLimit,
          duration_days: formData.duration,
          protocol: 'vmess',
          price_toman: finalPrice,
          status: 'pending_manual_verification',
          admin_decision: 'pending',
          notes: `Manual payment - ${appliedDiscount ? `Discount: ${appliedDiscount.code}` : 'No discount'}`,
          user_id: null
        })
        .select()
        .single();

      if (error) throw error;

      // Execute post-creation callback if provided
      if (paymentData.postCreationCallback) {
        await paymentData.postCreationCallback(subscription.id);
      }

      toast({
        title: language === 'fa' ? 'درخواست ثبت شد' : 'Request Submitted',
        description: language === 'fa' ? 
          'درخواست پرداخت شما به ادمین ارسال شد و پس از تأیید فعال خواهد شد' : 
          'Your payment request has been sent to admin and will be activated after approval',
      });

      onSuccess({
        username: formData.username,
        subscription_url: null,
        expire: Date.now() + (formData.duration * 24 * 60 * 60 * 1000),
        data_limit: formData.dataLimit,
        status: 'pending_manual_verification'
      });

    } catch (error) {
      console.error('Manual payment error:', error);
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
        onSuccess({
          username: formData.username,
          subscription_url: `vmess://config-url-here`,
          expire: Date.now() + (formData.duration * 24 * 60 * 60 * 1000),
          data_limit: formData.dataLimit
        });
      }
    } catch (error) {
      console.error('Crypto payment processing error:', error);
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
    toast({
      title: language === 'fa' ? 'پرداخت انجام شد' : 'Payment Successful',
      description: language === 'fa' ? 
        'اشتراک شما پس از تأیید پرداخت فعال خواهد شد' : 
        'Your subscription will be activated after payment confirmation',
    });
  };

  const handleZarinpalPayment = async () => {
    setIsSubmitting(true);
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
      
      if (subscriptionId && finalPrice > 0) {
        // Redirect to Zarinpal (existing logic)
      } else if (subscriptionId && finalPrice === 0) {
        onSuccess({
          username: formData.username,
          subscription_url: `vmess://config-url-here`,
          expire: Date.now() + (formData.duration * 24 * 60 * 60 * 1000),
          data_limit: formData.dataLimit
        });
      }
    } catch (error) {
      console.error('Zarinpal payment error:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در پردازش پرداخت' : 'Failed to process payment',
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
    </div>
  );
};

export default PaymentStep;
