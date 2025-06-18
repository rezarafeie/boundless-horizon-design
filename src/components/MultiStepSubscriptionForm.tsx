
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, CheckCircle, CreditCard, User, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<number>(1);
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
  const [subscriptionId, setSubscriptionId] = useState<string>('');
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false);

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

  const generateSubscriptionId = (): string => {
    // Generate a UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const createSubscriptionRecord = async (): Promise<string | null> => {
    if (!formData.selectedPlan) {
      console.error('No plan selected');
      return null;
    }

    setIsCreatingSubscription(true);
    
    try {
      console.log('Creating subscription record...', formData);
      
      const totalPrice = calculateTotalPrice();
      const newSubscriptionId = generateSubscriptionId();
      
      const subscriptionData = {
        id: newSubscriptionId,
        username: formData.username,
        mobile: formData.mobile,
        data_limit_gb: formData.dataLimit,
        duration_days: formData.duration,
        price_toman: totalPrice,
        notes: formData.notes || '',
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('subscriptions')
        .insert([subscriptionData])
        .select('id')
        .single();

      if (error) {
        console.error('Failed to create subscription:', error);
        throw error;
      }

      console.log('Subscription created with ID:', data.id);
      return data.id;
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'خطا در ایجاد سفارش. لطفاً دوباره تلاش کنید.' : 
          'Failed to create order. Please try again.',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsCreatingSubscription(false);
    }
  };

  const handleNext = async () => {
    if (!canProceedFromStep(currentStep)) return;

    // If moving from step 2 to step 3, create subscription record
    if (currentStep === 2) {
      const newSubscriptionId = await createSubscriptionRecord();
      if (!newSubscriptionId) {
        return; // Failed to create subscription, don't proceed
      }
      setSubscriptionId(newSubscriptionId);
    }

    const nextStep = currentStep + 1;
    if (nextStep <= 4) {
      setCurrentStep(nextStep);
    }
  };

  const handlePrevious = () => {
    const prevStep = currentStep - 1;
    if (prevStep >= 1) {
      setCurrentStep(prevStep);
    }
  };

  const handlePaymentSuccess = (subscriptionUrl?: string) => {
    // Create a mock SubscriptionResponse object since we only have the URL
    const subscriptionResult: SubscriptionResponse = {
      username: formData.username,
      subscription_url: subscriptionUrl || '',
      expire: Date.now() + (formData.duration * 24 * 60 * 60 * 1000),
      data_limit: formData.dataLimit
    };
    
    setResult(subscriptionResult);
    setCurrentStep(4);
  };

  const calculateTotalPrice = (): number => {
    if (!formData.selectedPlan) return 0;
    return formData.selectedPlan.pricePerGB * formData.dataLimit;
  };

  const progressPercentage = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  const renderStepContent = () => {
    if (currentStep === 1) {
      return (
        <div className="space-y-6">
          <PlanSelector
            selectedPlan={formData.selectedPlan}
            onPlanSelect={(plan) => updateFormData('selectedPlan', plan)}
            dataLimit={formData.dataLimit}
          />
        </div>
      );
    }
    
    if (currentStep === 2) {
      return (
        <UserInfoStep
          formData={formData}
          onUpdate={updateFormData}
          appliedDiscount={appliedDiscount}
        />
      );
    }
    
    if (currentStep === 3) {
      return (
        <PaymentStep
          amount={calculateTotalPrice()}
          subscriptionId={subscriptionId}
          onSuccess={handlePaymentSuccess}
          onBack={handlePrevious}
        />
      );
    }
    
    if (currentStep === 4) {
      return result ? (
        <SubscriptionSuccess result={result} />
      ) : null;
    }
    
    return null;
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

          {/* Navigation Buttons - Only show for step 2 */}
          {currentStep === 2 && (
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

              <Button
                variant="hero-primary"
                onClick={handleNext}
                disabled={!canProceedFromStep(currentStep) || isCreatingSubscription}
                className="flex items-center gap-2 w-full max-w-xs"
              >
                {isCreatingSubscription ? (
                  language === 'fa' ? 'در حال ایجاد سفارش...' : 'Creating Order...'
                ) : (
                  <>
                    {language === 'fa' ? 'بعدی' : 'Next'}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MultiStepSubscriptionForm;
