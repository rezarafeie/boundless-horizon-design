
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

  // Calculate discounted amount
  const calculateDiscountedAmount = () => {
    if (!appliedDiscount) return amount;
    
    if (appliedDiscount.percentage > 0) {
      return Math.round(amount * (100 - appliedDiscount.percentage) / 100);
    }
    
    return amount;
  };

  const discountedAmount = calculateDiscountedAmount();

  const renderPaymentComponent = () => {
    switch (selectedMethod) {
      case 'zarinpal':
        return (
          <ZarinpalPayment
            amount={discountedAmount}
            mobile={mobile}
            subscriptionId={subscriptionId}
            onPaymentStart={handlePaymentStart}
            isSubmitting={isSubmitting}
          />
        );
      case 'manual':
        return (
          <ManualPaymentForm
            amount={discountedAmount}
            mobile={mobile}
            subscriptionId={subscriptionId}
            onPaymentStart={handlePaymentStart}
            isSubmitting={isSubmitting}
          />
        );
      case 'stripe':
        return (
          <StripePaymentForm
            amount={discountedAmount}
            mobile={mobile}
            subscriptionId={subscriptionId}
            onPaymentStart={handlePaymentStart}
            isSubmitting={isSubmitting}
          />
        );
      case 'nowpayments':
        return (
          <CryptoPaymentForm
            amount={discountedAmount}
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
      {/* Discount Field */}
      {onDiscountApply && (
        <DiscountField
          onDiscountApply={onDiscountApply}
          appliedDiscount={appliedDiscount}
        />
      )}
      
      {/* Price Summary */}
      {appliedDiscount && (
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground line-through">
                {amount.toLocaleString()} تومان
              </span>
              <span className="text-green-600 font-medium">
                -{appliedDiscount.percentage}%
              </span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold">
              <span>مبلغ نهایی:</span>
              <span className="text-green-600">
                {discountedAmount.toLocaleString()} تومان
              </span>
            </div>
          </div>
        </div>
      )}

      <PaymentMethodSelector
        selectedMethod={selectedMethod}
        onMethodChange={onMethodChange}
        amount={discountedAmount}
      />
      
      {selectedMethod && (
        <div className="mt-6">
          {renderPaymentComponent()}
        </div>
      )}
    </div>
  );
};

export default PaymentStep;
