
import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import PaymentMethodSelector, { PaymentMethod } from './PaymentMethodSelector';
import ManualPaymentForm from './ManualPaymentForm';
import CryptoPaymentForm from './CryptoPaymentForm';
import StripePaymentForm from './StripePaymentForm';
import ZarinpalPayment from './ZarinpalPayment';
import DiscountField from './DiscountField';
import { SubscriptionStatusMonitor } from './SubscriptionStatusMonitor';
import { supabase } from '@/integrations/supabase/client';
import { DiscountCode } from '@/types/subscription';

interface PaymentStepProps {
  amount: number;
  mobile: string;
  selectedMethod: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  subscriptionId: string;
  onPaymentSuccess: (subscriptionUrl?: string) => void;
  appliedDiscount?: DiscountCode | null;
  onDiscountApply?: (discount: DiscountCode | null) => void;
}

const PaymentStep = ({ 
  amount, 
  mobile, 
  selectedMethod, 
  onMethodChange, 
  subscriptionId,
  onPaymentSuccess,
  appliedDiscount,
  onDiscountApply
}: PaymentStepProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePaymentStart = () => {
    setIsSubmitting(true);
  };

  const renderPaymentComponent = () => {
    switch (selectedMethod) {
      case 'zarinpal':
        return (
          <ZarinpalPayment
            amount={amount}
            mobile={mobile}
            subscriptionId={subscriptionId}
            onPaymentStart={handlePaymentStart}
            isSubmitting={isSubmitting}
          />
        );
      case 'manual':
        return (
          <ManualPaymentForm
            amount={amount}
            mobile={mobile}
            subscriptionId={subscriptionId}
            onPaymentStart={handlePaymentStart}
            isSubmitting={isSubmitting}
          />
        );
      case 'stripe':
        return (
          <StripePaymentForm
            amount={amount}
            mobile={mobile}
            subscriptionId={subscriptionId}
            onPaymentStart={handlePaymentStart}
            isSubmitting={isSubmitting}
          />
        );
      case 'nowpayments':
        return (
          <CryptoPaymentForm
            amount={amount}
            mobile={mobile}
            subscriptionId={subscriptionId}
            onPaymentStart={handlePaymentStart}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <PaymentMethodSelector
        selectedMethod={selectedMethod}
        onMethodChange={onMethodChange}
        amount={amount}
      />
      
      {/* Discount Field */}
      {onDiscountApply && (
        <DiscountField
          onDiscountApply={onDiscountApply}
          appliedDiscount={appliedDiscount || null}
        />
      )}
      
      {selectedMethod && (
        <div className="mt-6">
          {renderPaymentComponent()}
        </div>
      )}
    </div>
  );
};

export default PaymentStep;
