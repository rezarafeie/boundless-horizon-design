
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
          <PlanSelector
            selectedPlan={formData.selectedPlan}
            onPlanSelect={(plan) => updateFormData('selectedPlan', plan)}
            dataLimit={formData.dataLimit}
          />
        );
      case 2:
        return (
          <UserInfoStep
            formData={formData}
            onUpdate={updateFormData}
          />
        );
      case 3:
        return (
          <PaymentStep
            formData={formData}
            appliedDiscount={appliedDiscount}
            onDiscountApply={setAppliedDiscount}
            onSuccess={handlePaymentSuccess}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
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
      <Card className="bg-white dark:bg-gray-900 shadow-2xl border-0 rounded-2xl overflow-hidden">
        <CardHeader className="text-center pb-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
          <CardTitle className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {language === 'fa' ? 'خرید اشتراک VPN' : 'VPN Subscription Purchase'}
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
            {language === 'fa' ? 
              'اشتراک شبکه بدون مرز خود را در چند مرحله ساده تکمیل کنید' : 
              'Complete your Boundless Network subscription in simple steps'
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8">
          {/* Progress Bar */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-6">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                const isAccessible = currentStep >= step.id;

                return (
                  <div key={step.id} className="flex flex-col items-center">
                    <div className={`
                      w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-all duration-300 border-2
                      ${isCompleted 
                        ? 'bg-green-500 border-green-500 text-white scale-110' 
                        : isActive 
                        ? 'bg-blue-500 border-blue-500 text-white shadow-xl scale-125' 
                        : isAccessible
                        ? 'bg-white border-gray-300 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                        : 'bg-gray-100 border-gray-200 text-gray-400 dark:bg-gray-800 dark:border-gray-700'
                      }
                    `}>
                      {isCompleted ? (
                        <CheckCircle className="w-7 h-7" />
                      ) : (
                        <Icon className="w-7 h-7" />
                      )}
                    </div>
                    <span className={`
                      text-sm font-medium transition-colors text-center
                      ${isActive ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}
                    `}>
                      {language === 'fa' ? step.titleFa : step.titleEn}
                    </span>
                  </div>
                );
              })}
            </div>
            <Progress value={progressPercentage} className="h-3 rounded-full" />
          </div>

          {/* Step Content */}
          <div className="min-h-[500px] mb-8">
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          {currentStep < 4 && (
            <div className="flex gap-4 pt-8 border-t border-gray-200 dark:border-gray-700">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="flex-1 h-14 text-lg font-semibold"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  {language === 'fa' ? 'قبلی' : 'Previous'}
                </Button>
              )}

              {currentStep < 3 && (
                <Button
                  variant="hero-primary"
                  onClick={handleNext}
                  disabled={!canProceedFromStep(currentStep)}
                  className={`h-14 text-lg font-semibold transition-all duration-200 ${
                    currentStep === 1 ? 'flex-1' : 'flex-1'
                  } ${!canProceedFromStep(currentStep) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                >
                  {language === 'fa' ? 'بعدی' : 'Next'}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MultiStepSubscriptionForm;
