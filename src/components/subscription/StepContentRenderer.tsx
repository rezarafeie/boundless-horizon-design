import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import PaymentStep from '@/components/PaymentStep';
import SubscriptionSuccess from '@/components/SubscriptionSuccess';
import { FormData, StepNumber, SubscriptionResponse } from './types';

interface StepContentRendererProps {
  currentStep: StepNumber;
  formData: FormData;
  appliedDiscount: any;
  result: SubscriptionResponse | null;
  subscriptionId: string;
  calculateTotalPrice: () => number;
  onUpdateFormData: (field: keyof FormData, value: any) => void;
  onPaymentSuccess: (subscriptionUrl?: string) => void;
  onPrevious: () => void;
}

const StepContentRenderer = ({
  currentStep,
  formData,
  appliedDiscount,
  result,
  subscriptionId,
  calculateTotalPrice,
  onUpdateFormData,
  onPaymentSuccess,
  onPrevious
}: StepContentRendererProps) => {
  const { language } = useLanguage();

  if (currentStep === 1) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">
          {language === 'fa' ? 'انتخاب پلن' : 'Select Plan'}
        </h2>
        <p className="text-muted-foreground">
          {language === 'fa' ? 'لطفاً پلن مورد نظر خود را انتخاب کنید' : 'Please select your desired plan'}
        </p>
      </div>
    );
  }

  if (currentStep === 2) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">
          {language === 'fa' ? 'اطلاعات کاربر' : 'User Details'}
        </h2>
        <p className="text-muted-foreground">
          {language === 'fa' ? 'اطلاعات خود را وارد کنید' : 'Enter your details'}
        </p>
      </div>
    );
  }

  if (currentStep === 3) {
    if (result) {
      return (
        <div className="text-center py-8">
          <SubscriptionSuccess 
            result={result}
            onStartOver={() => window.location.reload()}
          />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">
            {language === 'fa' ? 'پرداخت' : 'Payment'}
          </h2>
          <p className="text-muted-foreground">
            {language === 'fa' ? 
              'روش پرداخت خود را انتخاب کنید' : 
              'Choose your payment method'
            }
          </p>
        </div>

        <PaymentStep
          amount={calculateTotalPrice()}
          mobile={formData.mobile}
          selectedMethod={formData.paymentMethod || 'zarinpal'}
          onMethodChange={(method) => onUpdateFormData('paymentMethod', method)}
          subscriptionId={subscriptionId}
          onPaymentSuccess={onPaymentSuccess}
        />
      </div>
    );
  }

  return (
    <div className="text-center">
      <h2>{language === 'fa' ? 'ممنون از خرید شما' : 'Thank you for your purchase!'}</h2>
      <p>{language === 'fa' ? 'اشتراک شما فعال شد' : 'Your subscription is now active.'}</p>
    </div>
  );
};

export default StepContentRenderer;
