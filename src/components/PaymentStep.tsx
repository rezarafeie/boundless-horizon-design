import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Loader, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionPlan, DiscountCode } from '@/types/subscription';
import { MarzneshinApiService } from '@/services/marzneshinApi';
import DiscountField from '@/components/DiscountField';

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
  setIsSubmitting: (value: boolean) => void;
  onDiscountApply: (discount: DiscountCode | null) => void;
}

const PaymentStep = ({ formData, appliedDiscount, onSuccess, isSubmitting, setIsSubmitting, onDiscountApply }: PaymentStepProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  
  const MERCHANT_ID = '10f6ea92-fb53-468c-bcc9-36ef4d9f539c';

  const calculatePrice = () => {
    if (!formData.selectedPlan) return 0;
    const basePrice = formData.dataLimit * formData.selectedPlan.pricePerGB;
    
    if (appliedDiscount) {
      const discountAmount = (basePrice * appliedDiscount.percentage) / 100;
      return Math.max(0, basePrice - discountAmount);
    }
    
    return basePrice;
  };

  const sanitizeInput = (input: string): string => {
    return input.replace(/[<>'"]/g, '').trim();
  };

  const createMarzbanUser = async (formData: FormData): Promise<SubscriptionResponse> => {
    const tokenEndpoint = 'https://file.shopifysb.xyz:8000/api/admin/token';
    const tokenRequestData = {
      username: 'bnets',
      password: 'reza1234',
      grant_type: 'password'
    };

    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(tokenRequestData)
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to authenticate with Marzban API');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const expireTimestamp = Math.floor(Date.now() / 1000) + (formData.duration * 86400);
    const dataLimitBytes = formData.dataLimit * 1073741824;
    const FIXED_UUID = '70f64bea-a84c-4feb-ac0e-fb796657790f';
    const MARZBAN_INBOUND_TAGS = ['VLESSTCP', 'Israel', 'fanland', 'USAC', 'info_protocol', 'Dubai'];

    const userData = {
      username: sanitizeInput(formData.username),
      status: 'active',
      expire: expireTimestamp,
      data_limit: dataLimitBytes,
      data_limit_reset_strategy: 'no_reset',
      inbounds: {
        vless: MARZBAN_INBOUND_TAGS
      },
      proxies: {
        vless: {
          id: FIXED_UUID
        }
      },
      note: `From bnets.co form - ${sanitizeInput(formData.notes)} - Mobile: ${formData.mobile}`,
      next_plan: {
        add_remaining_traffic: false,
        data_limit: 0,
        expire: 0,
        fire_on_either: true
      }
    };

    const userEndpoint = 'https://file.shopifysb.xyz:8000/api/user';
    const userResponse = await fetch(userEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(userData)
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      if (userResponse.status === 409) {
        throw new Error(language === 'fa' ? 
          'این نام کاربری قبلاً استفاده شده است. لطفاً نام دیگری انتخاب کنید' : 
          'This username is already taken. Please choose a different one'
        );
      }
      throw new Error(errorData.detail || 'Failed to create user');
    }

    const responseData = await userResponse.json();
    return {
      username: responseData.username,
      subscription_url: responseData.subscription_url,
      expire: responseData.expire,
      data_limit: responseData.data_limit
    };
  };

  const createMarzneshinUser = async (formData: FormData): Promise<SubscriptionResponse> => {
    try {
      const result = await MarzneshinApiService.createUser({
        username: sanitizeInput(formData.username),
        dataLimitGB: formData.dataLimit,
        durationDays: formData.duration,
        notes: sanitizeInput(formData.notes)
      });

      return {
        username: result.username,
        subscription_url: result.subscription_url,
        expire: result.expire || Math.floor(Date.now() / 1000) + (formData.duration * 86400),
        data_limit: result.data_limit
      };
    } catch (error) {
      throw error;
    }
  };

  const handlePayment = async () => {
    setIsSubmitting(true);
    
    try {
      const finalPrice = calculatePrice();
      
      // If price is 0 (due to discount), bypass payment and create subscription directly
      if (finalPrice === 0) {
        let result: SubscriptionResponse;
        
        if (formData.selectedPlan?.apiType === 'marzneshin') {
          result = await createMarzneshinUser(formData);
        } else {
          result = await createMarzbanUser(formData);
        }
        
        onSuccess(result);
        
        toast({
          title: language === 'fa' ? 'موفق' : 'Success',
          description: language === 'fa' ? 
            'اشتراک رایگان با موفقیت ایجاد شد' : 
            'Free subscription created successfully',
        });
        
        return;
      }
      
      // Store form data for after payment
      localStorage.setItem('pendingUserData', JSON.stringify(formData));
      
      // Create payment contract
      const expireAt = new Date();
      expireAt.setDate(expireAt.getDate() + 30);
      
      const paymanRequest = {
        merchant_id: MERCHANT_ID,
        mobile: formData.mobile,
        expire_at: Math.floor(expireAt.getTime() / 1000),
        max_daily_count: 100,
        max_monthly_count: 1000,
        max_amount: finalPrice * 10, // Convert Toman to Rial
        callback_url: `${window.location.origin}/subscription?payment_callback=1`
      };

      const response = await fetch(`https://feamvyruipxtafzhptkh.supabase.co/functions/v1/zarinpal-contract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlYW12eXJ1aXB4dGFmemhwdGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwODE0MzIsImV4cCI6MjA2NTY1NzQzMn0.OcYM5_AGC6CGNgzM_TwrjpcB1PYBiHmUbeuYe9LQJQg'
        },
        body: JSON.stringify(paymanRequest)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create contract');
      }

      if (!data.data?.data?.payman_authority) {
        throw new Error(language === 'fa' ? 
          'پاسخ نامعتبر از درگاه پرداخت' : 
          'Invalid response from payment gateway');
      }

      // Redirect to Zarinpal payment page
      window.location.href = `https://www.zarinpal.com/pg/StartPayman/${data.data.data.payman_authority}/1`;
      
    } catch (error) {
      console.error('Payment error:', error);
      
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: error instanceof Error ? error.message : (
          language === 'fa' ? 
            'خطا در پردازش پرداخت. لطفاً دوباره تلاش کنید' : 
            'Payment processing failed. Please try again'
        ),
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const basePrice = formData.selectedPlan ? formData.dataLimit * formData.selectedPlan.pricePerGB : 0;
  const discountAmount = appliedDiscount ? (basePrice * appliedDiscount.percentage) / 100 : 0;

  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold">
              {language === 'fa' ? 'خلاصه پرداخت' : 'Payment Summary'}
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>{language === 'fa' ? 'نام کاربری:' : 'Username:'}</span>
              <span className="font-mono">{formData.username}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{language === 'fa' ? 'پلن:' : 'Plan:'}</span>
              <span>{formData.selectedPlan?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{language === 'fa' ? 'حجم:' : 'Volume:'}</span>
              <span>{formData.dataLimit} GB</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{language === 'fa' ? 'مدت:' : 'Duration:'}</span>
              <span>{formData.duration} {language === 'fa' ? 'روز' : 'days'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{language === 'fa' ? 'قیمت پایه:' : 'Base Price:'}</span>
              <span>{basePrice.toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}</span>
            </div>
            
            {appliedDiscount && (
              <div className="flex justify-between text-sm text-green-600">
                <span>{language === 'fa' ? 'تخفیف:' : 'Discount:'}</span>
                <span>-{discountAmount.toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}</span>
              </div>
            )}
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>{language === 'fa' ? 'مبلغ نهایی:' : 'Final Amount:'}</span>
                <span className="text-green-600">
                  {calculatePrice().toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discount Code Field */}
      <DiscountField
        onDiscountApply={onDiscountApply}
        appliedDiscount={appliedDiscount}
      />

      {/* Security Notice */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">
                {language === 'fa' ? 'پرداخت امن' : 'Secure Payment'}
              </p>
              <p className="text-blue-600 dark:text-blue-300">
                {language === 'fa' ? 
                  'پرداخت شما از طریق درگاه امن زرین‌پال انجام می‌شود' : 
                  'Your payment is processed through secure Zarinpal gateway'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Button */}
      <div className="text-center pt-4">
        <Button
          onClick={handlePayment}
          disabled={isSubmitting}
          variant="hero-primary"
          size="xl"
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader className="w-5 h-5 mr-2 animate-spin" />
              {language === 'fa' ? 'در حال پردازش...' : 'Processing...'}
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              {calculatePrice() === 0 ? (
                language === 'fa' ? 'دریافت رایگان' : 'Get Free'
              ) : (
                language === 'fa' ? 
                  `پرداخت ${calculatePrice().toLocaleString()} تومان` : 
                  `Pay ${calculatePrice().toLocaleString()} Toman`
              )}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default PaymentStep;
