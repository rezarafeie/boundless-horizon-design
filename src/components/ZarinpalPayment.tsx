
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createZarinpalPayment } from '@/utils/zarinpalPayment';
import { supabase } from '@/integrations/supabase/client';

interface ZarinpalPaymentProps {
  amount: number;
  mobile: string;
  subscriptionId: string;
  onPaymentStart: () => void;
  isSubmitting: boolean;
}

const ZarinpalPayment = ({ amount, mobile, subscriptionId, onPaymentStart, isSubmitting }: ZarinpalPaymentProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();

  const handlePayment = async () => {
    if (!mobile) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'شماره موبایل الزامی است' : 'Mobile number is required',
        variant: 'destructive'
      });
      return;
    }

    if (!subscriptionId) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'شناسه سفارش یافت نشد' : 'Subscription ID not found',
        variant: 'destructive'
      });
      return;
    }

    onPaymentStart();

    try {
      console.log('Starting Zarinpal payment for amount:', amount, 'subscription:', subscriptionId);
      
      const callback_url = `${window.location.origin}/payment-success`;
      
      const response = await createZarinpalPayment({
        amount: amount * 10, // Convert Toman to Rial
        mobile: mobile,
        callback_url: callback_url,
        description: 'VPN Subscription Payment',
        subscription_id: subscriptionId
      });

      if (!response.success) {
        let errorMessage = response.error || 'Payment request failed';
        
        // Provide user-friendly error messages
        if (errorMessage.includes('Merchant does not have access')) {
          errorMessage = language === 'fa' ? 
            'سرویس پرداخت موقتاً در دسترس نیست. لطفاً از روش پرداخت دیگری استفاده کنید.' :
            'Payment service temporarily unavailable. Please use another payment method.';
        }
        
        throw new Error(errorMessage);
      }

      if (!response.gateway_url) {
        throw new Error('No gateway URL received');
      }

      console.log('Redirecting to Zarinpal gateway:', response.gateway_url);
      
      // Redirect to Zarinpal gateway
      window.location.href = response.gateway_url;

    } catch (error) {
      console.error('Zarinpal payment error:', error);
      
      toast({
        title: language === 'fa' ? 'خطا در پرداخت' : 'Payment Failed',
        description: language === 'fa' ? 
          `خطا: ${error.message}` : 
          `Error: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">
          {language === 'fa' ? 'پرداخت زرین‌پال' : 'Zarinpal Payment'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center space-y-4">
          <div className="text-2xl font-bold text-primary">
            {amount.toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center justify-center gap-4 text-2xl mb-2">
              <span>💳</span>
              <span>🔒</span>
              <span>⚡</span>
            </div>
            <p className="text-center text-sm text-blue-600 dark:text-blue-400">
              {language === 'fa' ? 
                'پرداخت امن با زرین‌پال' : 
                'Secure payment with Zarinpal'
              }
            </p>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>{language === 'fa' ? 'شماره موبایل:' : 'Mobile:'} {mobile}</p>
          </div>

          <Button
            onClick={handlePayment}
            disabled={isSubmitting || !mobile || !subscriptionId}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              language === 'fa' ? 'در حال پردازش...' : 'Processing...'
            ) : (
              language === 'fa' ? 'پرداخت با زرین‌پال' : 'Pay with Zarinpal'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ZarinpalPayment;
