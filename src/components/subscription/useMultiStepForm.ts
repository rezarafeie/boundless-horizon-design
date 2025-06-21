
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FormData, SubscriptionResponse, StepNumber } from './types';
import { DiscountCode } from '@/types/subscription';
import { PlanService, PlanWithPanels } from '@/services/planService';

export const useMultiStepForm = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
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
  const [availablePlans, setAvailablePlans] = useState<PlanWithPanels[]>([]);

  // Load available plans on component mount
  useEffect(() => {
    loadAvailablePlans();
  }, []);

  const loadAvailablePlans = async () => {
    try {
      console.log('MULTI STEP FORM: Loading available plans from admin configuration');
      const plans = await PlanService.getAvailablePlans();
      console.log('MULTI STEP FORM: Available plans:', plans.length);
      setAvailablePlans(plans);
      
      if (plans.length === 0) {
        toast({
          title: language === 'fa' ? 'هیچ پلنی موجود نیست' : 'No Plans Available',
          description: language === 'fa' ? 
            'هیچ پلن فعالی در سیستم یافت نشد' : 
            'No active plans found in the system',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('MULTI STEP FORM: Failed to load plans:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'خطا در بارگذاری پلن‌های موجود' : 
          'Failed to load available plans',
        variant: 'destructive',
      });
    }
  };

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Auto-advance from plan selection step when plan is selected
  useEffect(() => {
    if (currentStep === 1 && formData.selectedPlan) {
      const timer = setTimeout(() => {
        setCurrentStep(2);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [formData.selectedPlan, currentStep]);

  const canProceedFromStep = (step: StepNumber): boolean => {
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
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const createSubscriptionRecord = async (): Promise<string | null> => {
    if (!formData.selectedPlan) {
      console.error('MULTI STEP FORM: No plan selected');
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'لطفاً ابتدا یک پلن انتخاب کنید' : 
          'Please select a plan first',
        variant: 'destructive'
      });
      return null;
    }

    // Get full plan configuration
    const planConfig = await PlanService.getPlanById(formData.selectedPlan.id);
    if (!planConfig) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'پلن انتخابی در دسترس نیست' : 
          'Selected plan is not available',
        variant: 'destructive'
      });
      return null;
    }

    setIsCreatingSubscription(true);
    
    try {
      console.log('MULTI STEP FORM: Creating subscription record with plan:', planConfig.name_en);
      
      const totalPrice = calculateTotalPrice();
      const newSubscriptionId = generateSubscriptionId();
      
      const subscriptionData = {
        id: newSubscriptionId,
        username: formData.username.trim(),
        mobile: formData.mobile.trim(),
        data_limit_gb: formData.dataLimit,
        duration_days: formData.duration,
        price_toman: totalPrice,
        notes: formData.notes?.trim() || `Plan: ${planConfig.name_en}, API: ${PlanService.getApiType(planConfig)}`,
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('subscriptions')
        .insert([subscriptionData])
        .select('id')
        .single();

      if (error) {
        console.error('MULTI STEP FORM: Failed to create subscription:', error);
        throw new Error(error.message || 'Database error occurred');
      }

      console.log('MULTI STEP FORM: Subscription created with ID:', data.id);
      
      toast({
        title: language === 'fa' ? 'موفق' : 'Success',
        description: language === 'fa' ? 
          'سفارش شما با موفقیت ثبت شد' : 
          'Your order has been created successfully'
      });
      
      return data.id;
    } catch (error) {
      console.error('MULTI STEP FORM: Error creating subscription:', error);
      
      let errorMessage = language === 'fa' ? 
        'خطا در ایجاد سفارش. لطفاً دوباره تلاش کنید.' : 
        'Failed to create order. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          errorMessage = language === 'fa' ? 
            'این نام کاربری قبلاً استفاده شده است. لطفاً نام دیگری انتخاب کنید.' :
            'This username is already taken. Please choose a different one.';
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          errorMessage = language === 'fa' ? 
            'مشکل در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید.' :
            'Connection problem. Please check your internet connection.';
        }
      }
      
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsCreatingSubscription(false);
    }
  };

  const handleNext = async () => {
    if (!canProceedFromStep(currentStep)) {
      console.warn('Cannot proceed from current step:', currentStep);
      return;
    }

    // Special handling for step 2 -> 3 transition (create subscription record)
    if (currentStep === 2) {
      const newSubscriptionId = await createSubscriptionRecord();
      if (!newSubscriptionId) {
        console.error('Failed to create subscription record, cannot proceed');
        return;
      }
      setSubscriptionId(newSubscriptionId);
    }

    const nextStep = Math.min(currentStep + 1, 4) as StepNumber;
    console.log(`Moving from step ${currentStep} to step ${nextStep}`);
    setCurrentStep(nextStep);
  };

  const handlePrevious = () => {
    const prevStep = Math.max(currentStep - 1, 1) as StepNumber;
    console.log(`Moving from step ${currentStep} to step ${prevStep}`);
    setCurrentStep(prevStep);
  };

  const handlePaymentSuccess = (subscriptionUrl?: string) => {
    console.log('Payment successful, creating subscription result');
    
    const subscriptionResult: SubscriptionResponse = {
      username: formData.username.trim(),
      subscription_url: subscriptionUrl || '',
      expire: Date.now() + (formData.duration * 24 * 60 * 60 * 1000),
      data_limit: formData.dataLimit
    };
    
    setResult(subscriptionResult);
    setCurrentStep(4);
    
    toast({
      title: language === 'fa' ? 'تبریک!' : 'Congratulations!',
      description: language === 'fa' ? 
        'پرداخت شما با موفقیت انجام شد' : 
        'Your payment was successful'
    });
  };

  const calculateTotalPrice = (): number => {
    if (!formData.selectedPlan) {
      console.warn('MULTI STEP FORM: No plan selected for price calculation');
      return 0;
    }
    
    // Use the selected plan's price per GB
    const planConfig = availablePlans.find(p => p.id === formData.selectedPlan.id);
    const pricePerGB = planConfig?.price_per_gb || formData.selectedPlan.pricePerGB || 0;
    
    const basePrice = pricePerGB * formData.dataLimit;
    console.log('MULTI STEP FORM: Calculated price:', {
      pricePerGB,
      dataLimit: formData.dataLimit,
      basePrice,
      discount: appliedDiscount
    });
    
    return basePrice;
  };

  return {
    currentStep,
    setCurrentStep,
    formData,
    updateFormData,
    appliedDiscount,
    setAppliedDiscount,
    result,
    subscriptionId,
    isCreatingSubscription,
    availablePlans,
    loadAvailablePlans,
    canProceedFromStep,
    handleNext,
    handlePrevious,
    handlePaymentSuccess,
    calculateTotalPrice
  };
};
