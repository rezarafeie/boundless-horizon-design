
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SubscriptionProgressBar from './subscription/SubscriptionProgressBar';
import StepContentRenderer from './subscription/StepContentRenderer';
import StepNavigation from './subscription/StepNavigation';
import { useMultiStepForm } from './subscription/useMultiStepForm';

const MultiStepSubscriptionForm = () => {
  const { language } = useLanguage();
  const {
    currentStep,
    formData,
    appliedDiscount,
    result,
    subscriptionId,
    isCreatingSubscription,
    canProceedFromStep,
    handleNext,
    handlePrevious,
    handlePaymentSuccess,
    calculateTotalPrice,
    updateFormData,
    handleDiscountApply
  } = useMultiStepForm();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="bg-white dark:bg-gray-900 shadow-xl border-0">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {language === 'fa' ? 'خرید اشتراک VPN' : 'VPN Subscription Purchase'}
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
            {language === 'fa' ? 
              'اشتراک شبکه بدون مرز خود را در چند مرحله ساده تکمیل کنید' : 
              'Complete your Boundless Network subscription in simple steps'
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="px-8 pb-8">
          <SubscriptionProgressBar currentStep={currentStep} />

          <div className="min-h-[400px]">
            <StepContentRenderer
              currentStep={currentStep}
              formData={formData}
              appliedDiscount={appliedDiscount}
              result={result}
              subscriptionId={subscriptionId}
              calculateTotalPrice={calculateTotalPrice}
              onUpdateFormData={updateFormData}
              onDiscountApply={handleDiscountApply}
              onPaymentSuccess={handlePaymentSuccess}
              onPrevious={handlePrevious}
            />
          </div>

          <StepNavigation
            currentStep={currentStep}
            canProceed={canProceedFromStep(currentStep)}
            isCreatingSubscription={isCreatingSubscription}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default MultiStepSubscriptionForm;
