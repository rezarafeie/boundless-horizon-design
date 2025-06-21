
import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import PaymentMethodSelector, { PaymentMethod } from './PaymentMethodSelector';
import ManualPaymentForm from './ManualPaymentForm';
import CryptoPaymentForm from './CryptoPaymentForm';
import StripePaymentForm from './StripePaymentForm';
import { SubscriptionStatusMonitor } from './SubscriptionStatusMonitor';
import { supabase } from '@/integrations/supabase/client';

interface PaymentStepProps {
  amount: number;
  subscriptionId: string;
  onSuccess: (subscriptionUrl?: string) => void;
  onBack: () => void;
}

const PaymentStep = ({ amount, subscriptionId, onSuccess, onBack }: PaymentStepProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('manual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWaitingState, setShowWaitingState] = useState(false);

  const debugLog = (type: 'info' | 'error' | 'success' | 'warning', message: string, data?: any) => {
    console.log(`[PAYMENT-STEP] ${type.toUpperCase()}: ${message}`, data || '');
  };

  const handleManualPaymentConfirm = async (data: {
    trackingNumber: string;
    paymentTime: string;
    payerName: string;
    confirmed: boolean;
  }) => {
    setIsSubmitting(true);
    debugLog('info', 'Processing manual payment confirmation', data);

    try {
      // Validate subscription ID
      if (!subscriptionId) {
        throw new Error('Subscription ID is missing');
      }

      // Update subscription with manual payment details
      const notes = `Manual payment - Tracking: ${data.trackingNumber}, Payer: ${data.payerName}, Time: ${data.paymentTime}`;
      
      debugLog('info', 'Updating subscription with manual payment data', {
        subscriptionId,
        notes,
        admin_decision: 'pending'
      });

      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          notes,
          admin_decision: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (error) {
        debugLog('error', 'Supabase update error', error);
        throw new Error(`Database update failed: ${error.message}`);
      }

      debugLog('success', 'Manual payment data saved successfully');
      
      toast({
        title: language === 'fa' ? 'پرداخت ثبت شد' : 'Payment Recorded',
        description: language === 'fa' ? 
          'اطلاعات پرداخت شما ثبت شد و در انتظار تأیید ادمین است' : 
          'Your payment information has been recorded and is awaiting admin approval',
      });

      // Show waiting state instead of calling onSuccess immediately
      setShowWaitingState(true);
      
    } catch (error) {
      debugLog('error', 'Manual payment confirmation failed', error);
      
      let errorMessage = 'An unexpected error occurred';
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = language === 'fa' ? 
            'مشکل در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید.' :
            'Connection problem. Please check your internet connection.';
        } else if (error.message.includes('Database update failed')) {
          errorMessage = language === 'fa' ? 
            'خطا در ذخیره اطلاعات. لطفاً دوباره تلاش کنید.' :
            'Failed to save information. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = (status: string, subscriptionUrl?: string) => {
    debugLog('info', 'Subscription status updated', { status, subscriptionUrl });
    
    if (status === 'active' && subscriptionId) {
      debugLog('success', 'Subscription activated, calling onSuccess');
      // Call onSuccess to trigger redirection in parent component
      onSuccess(subscriptionUrl);
    } else if (status === 'rejected') {
      toast({
        title: language === 'fa' ? 'پرداخت رد شد' : 'Payment Rejected',
        description: language === 'fa' ? 
          'پرداخت شما رد شد. لطفاً با پشتیبانی تماس بگیرید' : 
          'Your payment was rejected. Please contact support',
        variant: 'destructive'
      });
      setShowWaitingState(false);
    }
  };

  const handlePaymentSuccess = (subscriptionUrl?: string) => {
    debugLog('success', 'Payment successful via automated method, calling onSuccess callback');
    // Call onSuccess to trigger redirection in parent component
    onSuccess(subscriptionUrl);
  };

  // If showing waiting state for manual payment, show the monitor
  if (showWaitingState) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">
            {language === 'fa' ? 'در انتظار تأیید' : 'Awaiting Approval'}
          </h2>
          <p className="text-muted-foreground">
            {language === 'fa' ? 
              'پرداخت شما در حال بررسی توسط ادمین است' : 
              'Your payment is being reviewed by admin'}
          </p>
        </div>
        
        <SubscriptionStatusMonitor 
          subscriptionId={subscriptionId}
          onStatusUpdate={handleStatusUpdate}
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
          {language === 'fa' ? 'روش پرداخت خود را انتخاب کنید' : 'Choose your payment method'}
        </p>
        <div className="mt-2 text-lg font-semibold text-blue-600">
          {language === 'fa' ? 'مبلغ قابل پرداخت: ' : 'Amount to pay: '}
          {amount.toLocaleString()} 
          {language === 'fa' ? ' تومان' : ' Toman'}
        </div>
      </div>

      <PaymentMethodSelector
        selectedMethod={selectedMethod}
        onMethodChange={setSelectedMethod}
        amount={amount}
      />

      {selectedMethod === 'manual' && (
        <ManualPaymentForm
          amount={amount}
          onPaymentConfirm={handleManualPaymentConfirm}
          isSubmitting={isSubmitting}
        />
      )}

      {selectedMethod === 'nowpayments' && (
        <CryptoPaymentForm
          amount={amount}
          onPaymentSuccess={handlePaymentSuccess}
          isSubmitting={isSubmitting}
        />
      )}

      {selectedMethod === 'stripe' && (
        <StripePaymentForm
          amount={amount}
          subscriptionData={{}} 
          onPaymentSuccess={handlePaymentSuccess}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};

export default PaymentStep;
