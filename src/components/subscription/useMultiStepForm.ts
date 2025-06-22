import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FormData, SubscriptionResponse, StepNumber } from './types';
import { DiscountCode } from '@/types/subscription';
import { PlanService, PlanWithPanels } from '@/services/planService';

export const useMultiStepForm = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
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

  // Load available plans on component mount using PlanService
  useEffect(() => {
    loadAvailablePlans();
  }, []);

  const loadAvailablePlans = async () => {
    try {
      console.log('MULTI STEP FORM: Loading available plans from PlanService');
      
      const plans = await PlanService.getAvailablePlans();
      console.log('MULTI STEP FORM: Available plans loaded:', plans.length);
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
    console.log('MULTI STEP FORM: Updating form data:', field, value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Auto-advance from plan selection step when plan is selected
  useEffect(() => {
    if (currentStep === 1 && formData.selectedPlan && formData.selectedPlan.id) {
      console.log('MULTI STEP FORM: Auto-advancing to step 2 with selected plan:', formData.selectedPlan);
      const timer = setTimeout(() => {
        setCurrentStep(2);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [formData.selectedPlan, currentStep]);

  const canProceedFromStep = (step: StepNumber): boolean => {
    switch (step) {
      case 1:
        const hasValidPlan = !!(formData.selectedPlan && formData.selectedPlan.id);
        console.log('MULTI STEP FORM: Can proceed from step 1:', hasValidPlan, formData.selectedPlan);
        return hasValidPlan;
      case 2:
        const hasRequiredFields = !!(
          formData.username?.trim() && 
          formData.mobile?.trim() && 
          formData.dataLimit > 0 && 
          formData.duration > 0
        );
        console.log('MULTI STEP FORM: Can proceed from step 2:', hasRequiredFields, {
          username: formData.username,
          mobile: formData.mobile,
          dataLimit: formData.dataLimit,
          duration: formData.duration
        });
        return hasRequiredFields;
      case 3:
        return !!result;
      default:
        return true;
    }
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

    // Validate required fields
    if (!formData.username?.trim() || !formData.mobile?.trim()) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'لطفاً تمام فیلدهای ضروری را پر کنید' : 
          'Please fill in all required fields',
        variant: 'destructive'
      });
      return null;
    }

    setIsCreatingSubscription(true);
    
    try {
      console.log('MULTI STEP FORM: Creating subscription record with plan:', formData.selectedPlan);
      
      const totalPrice = calculateTotalPrice();
      
      // Generate unique username if needed
      const timestamp = Date.now();
      const uniqueUsername = formData.username.includes('_') ? 
        formData.username : `${formData.username}_${timestamp}`;
      
      const subscriptionData = {
        username: uniqueUsername,
        mobile: formData.mobile.trim(),
        data_limit_gb: formData.dataLimit,
        duration_days: formData.duration,
        price_toman: totalPrice,
        plan_id: formData.selectedPlan.id,
        notes: formData.notes?.trim() || `Plan: ${formData.selectedPlan.name_en} (${formData.selectedPlan.plan_id})`,
        status: 'pending' as const
      };

      console.log('MULTI STEP FORM: Creating subscription with data:', subscriptionData);

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

      // If price is 0, create VPN user immediately using PlanService
      if (totalPrice === 0) {
        try {
          console.log('MULTI STEP FORM: Creating VPN user for free subscription using PlanService');
          
          const vpnResult = await PlanService.createSubscription(
            formData.selectedPlan.id,
            {
              username: uniqueUsername,
              mobile: formData.mobile,
              dataLimitGB: formData.dataLimit,
              durationDays: formData.duration,
              notes: `Free subscription via discount: ${appliedDiscount?.code || 'N/A'} - Plan: ${formData.selectedPlan.name_en}`
            }
          );
          
          console.log('MULTI STEP FORM: VPN creation response:', vpnResult);
          
          if (vpnResult) {
            console.log('MULTI STEP FORM: Free subscription completed successfully');
            
            // Update subscription with VPN details
            await supabase
              .from('subscriptions')
              .update({
                status: 'active',
                subscription_url: vpnResult.subscription_url,
                expire_at: vpnResult.expire,
                marzban_user_created: true
              })
              .eq('id', data.id);
            
            // Set result to skip payment step
            const subscriptionResult: SubscriptionResponse = {
              username: vpnResult.username,
              subscription_url: vpnResult.subscription_url,
              expire: vpnResult.expire,
              data_limit: vpnResult.data_limit
            };
            
            setResult(subscriptionResult);
            
            toast({
              title: language === 'fa' ? 'موفق' : 'Success',
              description: language === 'fa' ? 
                'اشتراک رایگان با موفقیت ایجاد شد' : 
                'Free subscription created successfully'
            });
            
            // Navigate directly to delivery page for free subscriptions
            setTimeout(() => {
              navigate(`/delivery?id=${data.id}`);
            }, 1500);
            
            return data.id;
          } else {
            console.warn('MULTI STEP FORM: VPN user creation failed');
            
            toast({
              title: language === 'fa' ? 'خطای جزئی' : 'Partial Error',
              description: language === 'fa' ? 
                'سفارش ثبت شد اما ایجاد VPN با خطا مواجه شد. پس از پرداخت، VPN شما ایجاد خواهد شد.' :
                'Order saved but VPN creation failed. Your VPN will be created after payment.',
              variant: 'destructive'
            });
          }
          
        } catch (vpnError) {
          console.error('MULTI STEP FORM: VPN creation failed for free subscription:', vpnError);
          toast({
            title: language === 'fa' ? 'خطای جزئی' : 'Partial Error',
            description: language === 'fa' ? 
              'سفارش ثبت شد اما ایجاد VPN با خطا مواجه شد. پس از پرداخت، VPN شما ایجاد خواهد شد.' :
              'Order saved but VPN creation failed. Your VPN will be created after payment.',
            variant: 'destructive'
          });
        }
      } else {
        toast({
          title: language === 'fa' ? 'موفق' : 'Success',
          description: language === 'fa' ? 
            'سفارش شما با موفقیت ثبت شد' : 
            'Your order has been created successfully'
        });
      }
      
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
        } else {
          errorMessage = error.message;
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
    console.log('MULTI STEP FORM: Handle next called for step:', currentStep);
    
    if (!canProceedFromStep(currentStep)) {
      console.warn('MULTI STEP FORM: Cannot proceed from current step:', currentStep);
      
      // Show helpful error message
      if (currentStep === 1) {
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: language === 'fa' ? 
            'لطفاً یک پلن انتخاب کنید' : 'Please select a plan',
          variant: 'destructive'
        });
      } else if (currentStep === 2) {
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: language === 'fa' ? 
            'لطفاً تمام فیلدهای ضروری را پر کنید' : 'Please fill in all required fields',
          variant: 'destructive'
        });
      }
      return;
    }

    // Special handling for step 2 -> 3 transition (create subscription record)
    if (currentStep === 2) {
      const newSubscriptionId = await createSubscriptionRecord();
      if (!newSubscriptionId) {
        console.error('MULTI STEP FORM: Failed to create subscription record, cannot proceed');
        return;
      }
      setSubscriptionId(newSubscriptionId);
      
      // If we got a result (free subscription), the navigation is handled in createSubscriptionRecord
      if (result) {
        return;
      }
    }

    const nextStep = Math.min(currentStep + 1, 4) as StepNumber;
    console.log(`MULTI STEP FORM: Moving from step ${currentStep} to step ${nextStep}`);
    setCurrentStep(nextStep);
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      const prevStep = Math.max(currentStep - 1, 1) as StepNumber;
      console.log(`MULTI STEP FORM: Moving from step ${currentStep} to step ${prevStep}`);
      setCurrentStep(prevStep);
    }
  };

  const handlePaymentSuccess = (subscriptionUrl?: string) => {
    console.log('MULTI STEP FORM: Payment successful, redirecting to delivery page');
    
    toast({
      title: language === 'fa' ? 'تبریک!' : 'Congratulations!',
      description: language === 'fa' ? 
        'پرداخت شما با موفقیت انجام شد. VPN شما در حال ایجاد است...' : 
        'Your payment was successful. Your VPN is being created...'
    });

    // Redirect directly to delivery page
    navigate(`/delivery?id=${subscriptionId}`);
  };

  const calculateTotalPrice = (): number => {
    if (!formData.selectedPlan) {
      console.warn('MULTI STEP FORM: No plan selected for price calculation');
      return 0;
    }
    
    // Use the selected plan's price per GB
    const pricePerGB = formData.selectedPlan.price_per_gb || 0;
    const basePrice = pricePerGB * formData.dataLimit;
    const discountAmount = appliedDiscount ? 
      (basePrice * appliedDiscount.percentage) / 100 : 0;
    const finalPrice = Math.max(0, basePrice - discountAmount);
    
    console.log('MULTI STEP FORM: Calculated price:', {
      pricePerGB,
      dataLimit: formData.dataLimit,
      basePrice,
      discount: appliedDiscount,
      finalPrice
    });
    
    return finalPrice;
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
