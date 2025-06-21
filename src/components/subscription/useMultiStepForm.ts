import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FormData, SubscriptionResponse, StepNumber } from './types';
import { DiscountCode, SubscriptionPlan } from '@/types/subscription';
import { UserCreationService } from '@/services/userCreationService';

interface PlanWithPanels {
  id: string;
  plan_id: string;
  name_en: string;
  name_fa: string;
  description_en?: string;
  description_fa?: string;
  price_per_gb: number;
  default_data_limit_gb: number;
  default_duration_days: number;
  api_type: string;
  plan_panel_mappings: Array<{
    panel_id: string;
    is_primary: boolean;
    panel_servers: {
      id: string;
      name: string;
      type: string;
    };
  }>;
}

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

  // Load available plans on component mount
  useEffect(() => {
    loadAvailablePlans();
  }, []);

  const loadAvailablePlans = async () => {
    try {
      console.log('MULTI STEP FORM: Loading available plans from database directly');
      
      const { data: plans, error } = await supabase
        .from('subscription_plans')
        .select(`
          *,
          plan_panel_mappings!inner(
            panel_id,
            is_primary,
            panel_servers!inner(
              id,
              name,
              type
            )
          )
        `);

      if (error) {
        console.error('MULTI STEP FORM: Error loading plans:', error);
        throw error;
      }

      console.log('MULTI STEP FORM: Available plans loaded:', plans?.length || 0);
      setAvailablePlans(plans || []);
      
      if (!plans || plans.length === 0) {
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
    console.log('Updating form data:', field, value);
    
    if (field === 'selectedPlan') {
      // Handle plan selection properly
      if (typeof value === 'string') {
        // If we received a plan ID, find the full plan object
        const fullPlan = availablePlans.find(p => p.id === value || p.plan_id === value);
        if (fullPlan) {
          const planObject: SubscriptionPlan = {
            id: fullPlan.id,
            plan_id: fullPlan.plan_id,
            name: fullPlan.name_en,
            name_en: fullPlan.name_en,
            name_fa: fullPlan.name_fa,
            description: fullPlan.description_en || '',
            description_en: fullPlan.description_en,
            description_fa: fullPlan.description_fa,
            pricePerGB: fullPlan.price_per_gb,
            price_per_gb: fullPlan.price_per_gb,
            apiType: fullPlan.api_type as 'marzban' | 'marzneshin',
            api_type: fullPlan.api_type as 'marzban' | 'marzneshin',
            durationDays: fullPlan.default_duration_days,
            default_duration_days: fullPlan.default_duration_days,
            default_data_limit_gb: fullPlan.default_data_limit_gb
          };
          
          setFormData(prev => ({ ...prev, [field]: planObject }));
          console.log('Plan object set:', planObject);
        } else {
          console.warn('Plan not found for ID:', value);
          setFormData(prev => ({ ...prev, [field]: { id: value, plan_id: value } as SubscriptionPlan }));
        }
      } else {
        // Direct object assignment
        setFormData(prev => ({ ...prev, [field]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  // Auto-advance from plan selection step when plan is selected
  useEffect(() => {
    if (currentStep === 1 && formData.selectedPlan) {
      console.log('Auto-advancing to step 2 with selected plan:', formData.selectedPlan);
      const timer = setTimeout(() => {
        setCurrentStep(2);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [formData.selectedPlan, currentStep]);

  const canProceedFromStep = (step: StepNumber): boolean => {
    switch (step) {
      case 1:
        const canProceed1 = !!formData.selectedPlan;
        console.log('Can proceed from step 1:', canProceed1, formData.selectedPlan);
        return canProceed1;
      case 2:
        const canProceed2 = !!(formData.username && formData.mobile && formData.dataLimit && formData.duration);
        console.log('Can proceed from step 2:', canProceed2, {
          username: formData.username,
          mobile: formData.mobile,
          dataLimit: formData.dataLimit,
          duration: formData.duration
        });
        return canProceed2;
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

    // Get full plan configuration from the loaded plans
    const planConfig = availablePlans.find(p => p.id === formData.selectedPlan?.id || p.plan_id === formData.selectedPlan?.plan_id);
    if (!planConfig) {
      console.log('MULTI STEP FORM: Plan not found in availablePlans, proceeding anyway');
    }

    setIsCreatingSubscription(true);
    
    try {
      console.log('MULTI STEP FORM: Creating subscription record with plan:', planConfig?.name_en || formData.selectedPlan.name);
      
      const totalPrice = calculateTotalPrice();
      const newSubscriptionId = generateSubscriptionId();
      
      // Generate unique username if needed
      const timestamp = Date.now();
      const uniqueUsername = formData.username.includes('_') ? 
        formData.username : `${formData.username}_${timestamp}`;
      
      const subscriptionData = {
        id: newSubscriptionId,
        username: uniqueUsername,
        mobile: formData.mobile.trim(),
        data_limit_gb: formData.dataLimit,
        duration_days: formData.duration,
        price_toman: totalPrice,
        notes: formData.notes?.trim() || `Plan: ${planConfig?.name_en || formData.selectedPlan.name}`,
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

      // If price is 0, create VPN user immediately using new service
      if (totalPrice === 0) {
        try {
          console.log('MULTI STEP FORM: Creating VPN user for free subscription using new service');
          
          // Find primary panel for this plan or use first available
          let primaryPanel = null;
          if (planConfig && planConfig.plan_panel_mappings && planConfig.plan_panel_mappings.length > 0) {
            const primaryPanelMapping = planConfig.plan_panel_mappings.find((mapping: any) => mapping.is_primary);
            primaryPanel = primaryPanelMapping ? primaryPanelMapping.panel_servers : planConfig.plan_panel_mappings[0].panel_servers;
          }
          
          // If no panel found, use default based on plan type
          const panelType = primaryPanel?.type || (formData.selectedPlan.id === 'pro' ? 'marzneshin' : 'marzban');
          
          const result = await UserCreationService.createSubscription(
            uniqueUsername,
            formData.dataLimit,
            formData.duration,
            panelType as 'marzban' | 'marzneshin',
            data.id,
            `Free subscription via discount: ${appliedDiscount?.code || 'N/A'} - Plan: ${planConfig?.name_en || formData.selectedPlan.name}`
          );
          
          console.log('MULTI STEP FORM: VPN creation response:', result);
          
          if (result.success && result.data) {
            console.log('MULTI STEP FORM: Free subscription completed successfully');
            
            // Set result to skip payment step
            const subscriptionResult: SubscriptionResponse = {
              username: result.data.username,
              subscription_url: result.data.subscription_url,
              expire: result.data.expire,
              data_limit: result.data.data_limit
            };
            
            setResult(subscriptionResult);
            
            toast({
              title: language === 'fa' ? 'موفق' : 'Success',
              description: language === 'fa' ? 
                'اشتراک رایگان با موفقیت ایجاد شد' : 
                'Free subscription created successfully'
            });
            
            return data.id;
          } else {
            console.warn('MULTI STEP FORM: VPN user creation failed:', result.error);
            
            toast({
              title: language === 'fa' ? 'موفق جزئی' : 'Partial Success',
              description: language === 'fa' ? 
                'سفارش ثبت شد اما ایجاد VPN با خطا مواجه شد. لطفاً با پشتیبانی تماس بگیرید.' :
                'Subscription saved but VPN creation failed. Please contact support.',
              variant: 'destructive'
            });
          }
          
        } catch (vpnError) {
          console.error('MULTI STEP FORM: VPN creation failed for free subscription:', vpnError);
          toast({
            title: language === 'fa' ? 'موفق جزئی' : 'Partial Success',
            description: language === 'fa' ? 
              'سفارش ثبت شد اما ایجاد VPN با خطا مواجه شد. لطفاً با پشتیبانی تماس بگیرید.' :
              'Subscription saved but VPN creation failed. Please contact support.',
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
    console.log('Handle next called for step:', currentStep);
    
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
      
      // If we got a result (free subscription), redirect directly to delivery page
      if (result) {
        navigate(`/subscription-delivery?id=${newSubscriptionId}`);
        return;
      }
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
    console.log('MULTI STEP FORM: Payment successful, redirecting to delivery page');
    
    toast({
      title: language === 'fa' ? 'تبریک!' : 'Congratulations!',
      description: language === 'fa' ? 
        'پرداخت شما با موفقیت انجام شد' : 
        'Your payment was successful'
    });

    // Redirect directly to delivery page instead of going to step 4
    navigate(`/subscription-delivery?id=${subscriptionId}`);
  };

  const calculateTotalPrice = (): number => {
    if (!formData.selectedPlan) {
      console.warn('MULTI STEP FORM: No plan selected for price calculation');
      return 0;
    }
    
    // Use the selected plan's price per GB from the database or fallback to selectedPlan
    const planConfig = availablePlans.find(p => p.id === formData.selectedPlan?.id || p.plan_id === formData.selectedPlan?.plan_id);
    const pricePerGB = planConfig?.price_per_gb || formData.selectedPlan.pricePerGB || formData.selectedPlan.price_per_gb || 0;
    
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
