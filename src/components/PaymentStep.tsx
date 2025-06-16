
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MarzneshinApiService } from '@/services/marzneshinApi';
import { SubscriptionPlan, DiscountCode } from '@/types/subscription';

interface FormData {
  username: string;
  dataLimit: number;
  duration: number;
  notes: string;
  mobile: string;
  selectedPlan: SubscriptionPlan | null;
}

interface SubscriptionResponse {
  username: string;
  subscription_url: string;
  expire: number;
  data_limit: number;
}

interface PaymentStepProps {
  formData: FormData;
  appliedDiscount: DiscountCode | null;
  onSuccess: (result: SubscriptionResponse) => void;
  isSubmitting: boolean;
  setIsSubmitting: (loading: boolean) => void;
}

const PaymentStep: React.FC<PaymentStepProps> = ({ 
  formData, 
  appliedDiscount, 
  onSuccess, 
  isSubmitting, 
  setIsSubmitting 
}) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const calculatePrice = () => {
    if (!formData.selectedPlan) return 0;
    
    let basePrice = formData.selectedPlan.price;
    if (appliedDiscount) {
      if (appliedDiscount.type === 'percentage') {
        basePrice = basePrice * (1 - appliedDiscount.value / 100);
      } else {
        basePrice = Math.max(0, basePrice - appliedDiscount.value);
      }
    }
    return basePrice;
  };

  const handlePayment = async () => {
    if (!formData.selectedPlan) return;

    setIsSubmitting(true);
    setPaymentError(null);

    try {
      console.log('Starting payment process...', {
        username: formData.username,
        mobile: formData.mobile,
        plan: formData.selectedPlan.name,
        dataLimit: formData.dataLimit,
        duration: formData.duration
      });

      const finalPrice = calculatePrice();

      // Create Zarinpal payment
      const checkoutResponse = await fetch('/api/zarinpal/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: finalPrice,
          description: `اشتراک ${formData.selectedPlan.name} - ${formData.dataLimit}GB - ${formData.duration} روز`,
          mobile: formData.mobile,
          metadata: {
            username: formData.username,
            dataLimit: formData.dataLimit,
            duration: formData.duration,
            notes: formData.notes,
            planId: formData.selectedPlan.id,
            discountCode: appliedDiscount?.code || null
          }
        }),
      });

      if (!checkoutResponse.ok) {
        throw new Error('Payment initialization failed');
      }

      const checkoutData = await checkoutResponse.json();
      
      if (checkoutData.success && checkoutData.gatewayURL) {
        // Redirect to Zarinpal gateway
        window.location.href = checkoutData.gatewayURL;
      } else {
        throw new Error(checkoutData.message || 'Payment gateway error');
      }

    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      setPaymentError(errorMessage);
      
      toast({
        title: language === 'fa' ? 'خطا در پرداخت' : 'Payment Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-purple-100 dark:border-purple-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-600" />
            {language === 'fa' ? 'پرداخت امن' : 'Secure Payment'}
          </CardTitle>
          <CardDescription>
            {language === 'fa' ? 
              'پرداخت از طریق درگاه امن زرین‌پال انجام می‌شود' : 
              'Payment is processed through secure Zarinpal gateway'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Payment Summary */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              {language === 'fa' ? 'جزئیات پرداخت' : 'Payment Details'}
            </h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{language === 'fa' ? 'نام کاربری:' : 'Username:'}</span>
                <span className="font-medium">{formData.username}</span>
              </div>
              <div className="flex justify-between">
                <span>{language === 'fa' ? 'پلن:' : 'Plan:'}</span>
                <span className="font-medium">{formData.selectedPlan?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>{language === 'fa' ? 'حجم:' : 'Data:'}</span>
                <span className="font-medium">{formData.dataLimit} GB</span>
              </div>
              <div className="flex justify-between">
                <span>{language === 'fa' ? 'مدت:' : 'Duration:'}</span>
                <span className="font-medium">{formData.duration} {language === 'fa' ? 'روز' : 'days'}</span>
              </div>
              
              {appliedDiscount && (
                <div className="flex justify-between text-green-600">
                  <span>{language === 'fa' ? 'تخفیف:' : 'Discount:'}</span>
                  <span className="font-medium">
                    -{appliedDiscount.type === 'percentage' 
                      ? `${appliedDiscount.value}%` 
                      : `${appliedDiscount.value.toLocaleString()} ${language === 'fa' ? 'تومان' : 'Toman'}`
                    }
                  </span>
                </div>
              )}
              
              <div className="border-t border-gray-200 dark:border-gray-600 pt-2 flex justify-between text-lg font-bold">
                <span>{language === 'fa' ? 'مبلغ قابل پرداخت:' : 'Total Amount:'}</span>
                <span className="text-green-600">
                  {calculatePrice().toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Error */}
          {paymentError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{paymentError}</AlertDescription>
            </Alert>
          )}

          {/* Payment Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">
                  {language === 'fa' ? 'اطلاعات مهم:' : 'Important Information:'}
                </p>
                <ul className="space-y-1 text-xs">
                  <li>
                    {language === 'fa' 
                      ? '• پس از پرداخت موفق، اطلاعات اتصال ارسال می‌شود' 
                      : '• Connection details will be sent after successful payment'
                    }
                  </li>
                  <li>
                    {language === 'fa' 
                      ? '• اشتراک بلافاصله بعد از پرداخت فعال می‌شود' 
                      : '• Subscription activates immediately after payment'
                    }
                  </li>
                  <li>
                    {language === 'fa' 
                      ? '• پشتیبانی 24/7 در دسترس است' 
                      : '• 24/7 support is available'
                    }
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Payment Button */}
          <Button
            onClick={handlePayment}
            disabled={isSubmitting || !formData.selectedPlan}
            className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            {isSubmitting ? (
              <>
                <Loader className="w-5 h-5 animate-spin mr-2" />
                {language === 'fa' ? 'در حال پردازش...' : 'Processing...'}
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                {language === 'fa' 
                  ? `پرداخت ${calculatePrice().toLocaleString()} تومان` 
                  : `Pay ${calculatePrice().toLocaleString()} Toman`
                }
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentStep;
