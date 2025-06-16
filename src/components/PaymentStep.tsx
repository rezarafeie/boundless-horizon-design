
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader, CreditCard, AlertCircle, CheckCircle, Tag, Percent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
  onDiscountApply: (discount: DiscountCode | null) => void;
  onSuccess: (result: SubscriptionResponse) => void;
  isSubmitting: boolean;
  setIsSubmitting: (loading: boolean) => void;
}

const PaymentStep: React.FC<PaymentStepProps> = ({ 
  formData, 
  appliedDiscount, 
  onDiscountApply,
  onSuccess, 
  isSubmitting, 
  setIsSubmitting 
}) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discountLoading, setDiscountLoading] = useState(false);

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

  const handleDiscountApply = async () => {
    if (!discountCode.trim()) return;
    
    setDiscountLoading(true);
    try {
      // Simulate discount validation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock discount codes for demo
      const mockDiscounts: { [key: string]: DiscountCode } = {
        'SAVE20': { code: 'SAVE20', type: 'percentage', value: 20, description: '20% off' },
        'NEWUSER': { code: 'NEWUSER', type: 'percentage', value: 15, description: '15% off for new users' },
        'FIXED1000': { code: 'FIXED1000', type: 'fixed', value: 1000, description: '1000 Toman discount' }
      };
      
      const discount = mockDiscounts[discountCode.toUpperCase()];
      if (discount) {
        onDiscountApply(discount);
        toast({
          title: language === 'fa' ? 'کد تخفیف اعمال شد' : 'Discount Applied',
          description: language === 'fa' ? 'تخفیف با موفقیت اعمال شد' : 'Discount code applied successfully'
        });
      } else {
        toast({
          title: language === 'fa' ? 'کد تخفیف نامعتبر' : 'Invalid Discount Code',
          description: language === 'fa' ? 'کد تخفیف وارد شده معتبر نیست' : 'The discount code is not valid',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در بررسی کد تخفیف' : 'Error validating discount code',
        variant: 'destructive'
      });
    } finally {
      setDiscountLoading(false);
    }
  };

  const handleRemoveDiscount = () => {
    onDiscountApply(null);
    setDiscountCode('');
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
    <div className="space-y-8">
      {/* Discount Code Section */}
      <Card className="border-2 border-purple-100 dark:border-purple-900/20 rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <Tag className="w-5 h-5 text-purple-600" />
            {language === 'fa' ? 'کد تخفیف' : 'Discount Code'}
          </CardTitle>
          <CardDescription>
            {language === 'fa' ? 'اگر کد تخفیف دارید، آن را وارد کنید' : 'Enter your discount code if you have one'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!appliedDiscount ? (
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder={language === 'fa' ? 'کد تخفیف' : 'Discount code'}
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <Button
                onClick={handleDiscountApply}
                disabled={discountLoading || !discountCode.trim()}
                className="h-12 px-6"
              >
                {discountLoading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  language === 'fa' ? 'اعمال' : 'Apply'
                )}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <Percent className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    {appliedDiscount.code}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    {appliedDiscount.description}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveDiscount}
                className="text-red-600 hover:text-red-700"
              >
                {language === 'fa' ? 'حذف' : 'Remove'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <Card className="border-2 border-blue-100 dark:border-blue-900/20 rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <CreditCard className="w-5 h-5 text-blue-600" />
            {language === 'fa' ? 'خلاصه پرداخت' : 'Payment Summary'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
            <div className="space-y-3 text-base">
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
              
              <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                <div className="flex justify-between text-base">
                  <span>{language === 'fa' ? 'قیمت پایه:' : 'Base Price:'}</span>
                  <span className="font-medium">
                    {formData.selectedPlan?.price.toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}
                  </span>
                </div>
                
                {appliedDiscount && (
                  <div className="flex justify-between text-green-600 mt-2">
                    <span>{language === 'fa' ? 'تخفیف:' : 'Discount:'}</span>
                    <span className="font-medium">
                      -{appliedDiscount.type === 'percentage' 
                        ? `${appliedDiscount.value}%` 
                        : `${appliedDiscount.value.toLocaleString()} ${language === 'fa' ? 'تومان' : 'Toman'}`
                      }
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between text-xl font-bold mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <span>{language === 'fa' ? 'مبلغ قابل پرداخت:' : 'Total Amount:'}</span>
                  <span className="text-green-600">
                    {calculatePrice().toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}
                  </span>
                </div>
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
                <p className="font-medium mb-2">
                  {language === 'fa' ? 'اطلاعات مهم:' : 'Important Information:'}
                </p>
                <ul className="space-y-1 text-sm">
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
            className="w-full h-16 text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all duration-200 hover:scale-105"
          >
            {isSubmitting ? (
              <>
                <Loader className="w-6 h-6 animate-spin mr-3" />
                {language === 'fa' ? 'در حال پردازش...' : 'Processing...'}
              </>
            ) : (
              <>
                <CreditCard className="w-6 h-6 mr-3" />
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
