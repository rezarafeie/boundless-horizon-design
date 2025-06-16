
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, CheckCircle, CreditCard, User, Settings } from 'lucide-react';
import PlanSelector from '@/components/PlanSelector';
import UserInfoStep from '@/components/UserInfoStep';
import PaymentStep from '@/components/PaymentStep';
import SubscriptionSuccess from '@/components/SubscriptionSuccess';
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

const STEPS = [
  { id: 1, name: 'plan', icon: Settings, titleFa: 'انتخاب پلن', titleEn: 'Select Plan' },
  { id: 2, name: 'info', icon: User, titleFa: 'اطلاعات کاربری', titleEn: 'User Info' },
  { id: 3, name: 'payment', icon: CreditCard, titleFa: 'پرداخت', titleEn: 'Payment' },
  { id: 4, name: 'success', icon: CheckCircle, titleFa: 'تکمیل', titleEn: 'Complete' },
];

const MultiStepSubscriptionForm = () => {
  const { language } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    username: '',
    dataLimit: 10,
    duration: 30,
    notes: '',
    mobile: '',
    selectedPlan: null
  });
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
  const [result, setResult] = useState<SubscriptionResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Auto-advance from plan selection step when plan is selected
  useEffect(() => {
    if (currentStep === 1 && formData.selectedPlan) {
      const timer = setTimeout(() => {
        setCurrentStep(2);
      }, 300); // Small delay for smooth transition
      return () => clearTimeout(timer);
    }
  }, [formData.selectedPlan, currentStep]);

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!formData.selectedPlan;
      case 2:
        return !!(formData.username && formData.mobile && formData.dataLimit && formData.duration);
      case 3:
        return !!result;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (canProceedFromStep(currentStep) && currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handlePaymentSuccess = (subscriptionResult: SubscriptionResponse) => {
    setResult(subscriptionResult);
    setCurrentStep(4);
  };

  const progressPercentage = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <PlanSelector
              selectedPlan={formData.selectedPlan}
              onPlanSelect={(plan) => updateFormData('selectedPlan', plan)}
              dataLimit={formData.dataLimit}
            />
          </div>
        );
      case 2:
        return (
          <UserInfoStep
            formData={formData}
            onUpdate={updateFormData}
            appliedDiscount={appliedDiscount}
          />
        );
      case 3:
        return (
          <PaymentStep
            formData={formData}
            appliedDiscount={appliedDiscount}
            onSuccess={handlePaymentSuccess}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            onDiscountApply={setAppliedDiscount}
          />
        );
      case 4:
        return result ? (
          <SubscriptionSuccess result={result} />
        ) : null;
      default:
        return null;
    }
  };

  const getCurrentStepInfo = () => {
    return STEPS.find(step => step.id === currentStep);
  };

  const stepInfo = getCurrentStepInfo();

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
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                const isAccessible = currentStep >= step.id;

                return (
                  <div key={step.id} className="flex flex-col items-center">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-300
                      ${isCompleted 
                        ? 'bg-green-500 text-white' 
                        : isActive 
                        ? 'bg-blue-500 text-white shadow-lg scale-110' 
                        : isAccessible
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      }
                    `}>
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <span className={`
                      text-sm font-medium transition-colors
                      ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}
                    `}>
                      {language === 'fa' ? step.titleFa : step.titleEn}
                    </span>
                  </div>
                );
              })}
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">
            {renderStepContent()}
          </div>

          {/* Navigation Buttons - Only show for steps 2 and beyond */}
          {currentStep >= 2 && currentStep < 4 && (
            <div className="flex justify-between items-center pt-8 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                {language === 'fa' ? 'قبلی' : 'Previous'}
              </Button>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{currentStep}</span>
                <span>{language === 'fa' ? 'از' : 'of'}</span>
                <span>{STEPS.length}</span>
              </div>

              {currentStep === 2 && (
                <Button
                  variant="hero-primary"
                  onClick={handleNext}
                  disabled={!canProceedFromStep(currentStep)}
                  className="flex items-center gap-2 w-full max-w-xs"
                >
                  {language === 'fa' ? 'بعدی' : 'Next'}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}

              {currentStep === 3 && (
                <div className="w-24" /> // Spacer for layout consistency
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MultiStepSubscriptionForm;
