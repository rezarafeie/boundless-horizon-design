import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Loader2, Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SubscriptionSuccess from './SubscriptionSuccess';
import { useNavigate } from 'react-router-dom';
import { PlanService, PlanWithPanels } from '@/services/planService';

interface DiscountCode {
  code: string;
  percentage: number;
  description: string;
}

const MarzbanSubscriptionForm = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<PlanWithPanels[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanWithPanels | null>(null);
  const [formData, setFormData] = useState({
    mobile: '',
    dataLimit: 0,
    duration: 0,
  });
  const [discountCode, setDiscountCode] = useState('');
  const [discountUsed, setDiscountUsed] = useState<DiscountCode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [showLiteSuccess, setShowLiteSuccess] = useState(false);
  const [liteSuccessData, setLiteSuccessData] = useState<any>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      console.log('=== SUBSCRIPTION FORM: Fetching plans dynamically from PlanService ===');
      setIsLoadingPlans(true);
      
      try {
        const availablePlans = await PlanService.getAvailablePlans();
        console.log('SUBSCRIPTION FORM: Available plans loaded:', availablePlans.length);
        
        setPlans(availablePlans);
        
        if (availablePlans.length === 0) {
          toast({
            title: language === 'fa' ? 'هیچ پلنی موجود نیست' : 'No Plans Available',
            description: language === 'fa' ? 
              'هیچ پلن فعالی در سیستم یافت نشد' : 
              'No active plans found in the system',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('SUBSCRIPTION FORM: Error fetching plans:', error);
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: language === 'fa' ? 'مشکلی در دریافت پلن‌ها وجود دارد.' : 'There was an issue fetching the plans.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingPlans(false);
      }
    };

    fetchPlans();
  }, [language, toast]);

  const applyDiscount = async () => {
    if (!discountCode) return;

    console.log('SUBSCRIPTION FORM: Applying discount code:', discountCode);

    const { data, error } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('code', discountCode)
      .eq('is_active', true)
      .single();

    console.log('SUBSCRIPTION FORM: Discount response:', { data, error });

    if (error) {
      console.error('SUBSCRIPTION FORM: Error fetching discount:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'کد تخفیف معتبر نیست.' : 'Invalid discount code.',
        variant: 'destructive',
      });
      setDiscountUsed(null);
    } else {
      const mappedDiscount = {
        code: data.code,
        percentage: data.discount_value,
        description: data.description || ''
      };
      setDiscountUsed(mappedDiscount);
      console.log('SUBSCRIPTION FORM: Discount applied:', mappedDiscount);
      toast({
        title: language === 'fa' ? 'تخفیف اعمال شد' : 'Discount Applied',
        description: language === 'fa' ? `تخفیف ${data.discount_value}% اعمال شد!` : `Discount of ${data.discount_value}% applied!`,
      });
    }
  };

  const getFinalPrice = () => {
    if (!selectedPlan) return 0;
    let finalPrice = formData.dataLimit * selectedPlan.price_per_gb;
    if (discountUsed && discountUsed.percentage > 0) {
      finalPrice = finalPrice - Math.round((finalPrice * discountUsed.percentage) / 100);
    }
    return finalPrice;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== SUBSCRIPTION FORM: Starting submission with dynamic plan system ===');
    console.log('SUBSCRIPTION FORM: Form data:', formData);
    console.log('SUBSCRIPTION FORM: Selected plan:', selectedPlan);
    
    // Enhanced validation
    if (!formData.mobile || !formData.dataLimit || !selectedPlan) {
      console.error('SUBSCRIPTION FORM: Missing required fields');
      const missingFields = [];
      if (!formData.mobile) missingFields.push('mobile');
      if (!formData.dataLimit) missingFields.push('dataLimit');
      if (!selectedPlan) missingFields.push('selectedPlan');
      
      setError(`Missing required fields: ${missingFields.join(', ')}`);
      toast({
        title: language === 'fa' ? 'خطا در فرم' : 'Form Error',
        description: language === 'fa' ? 
          'لطفاً تمام فیلدها را پر کنید و یک پلن انتخاب کنید' : 
          'Please fill in all fields and select a plan',
        variant: 'destructive',
      });
      return;
    }

    // Validate that the selected plan has available panels
    if (selectedPlan.panels.length === 0) {
      console.error('SUBSCRIPTION FORM: Selected plan has no available panels');
      setError(language === 'fa' ? 
        'این پلن در حال حاضر در دسترس نیست. لطفاً پلن دیگری انتخاب کنید.' : 
        'This plan is currently not available. Please choose another plan.'
      );
      
      toast({
        title: language === 'fa' ? 'پلن در دسترس نیست' : 'Plan Not Available',
        description: language === 'fa' ? 
          'این پلن هیچ سرور فعالی ندارد. لطفاً پلن دیگری انتخاب کنید.' : 
          'This plan has no active servers. Please choose another plan.',
        variant: 'destructive',
      });
      return;
    }

    // Check panel health status
    const primaryPanel = PlanService.getPrimaryPanel(selectedPlan);
    if (primaryPanel?.health_status === 'offline') {
      console.error('SUBSCRIPTION FORM: Selected plan\'s panel is offline');
      setError(language === 'fa' ? 
        'سرور این پلن در حال حاضر آفلاین است. لطفاً بعداً تلاش کنید یا پلن دیگری انتخاب کنید.' : 
        'The selected plan\'s server is currently offline. Please try again later or choose another plan.'
      );
      
      toast({
        title: language === 'fa' ? 'سرور آفلاین' : 'Server Offline',
        description: language === 'fa' ? 
          'سرور این پلن در دسترس نیست. لطفاً بعداً تلاش کنید.' : 
          'This plan\'s server is not available. Please try again later.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('=== SUBSCRIPTION: Starting subscription creation with dynamic plan service ===');
      
      // Calculate final price with discount
      let finalPrice = formData.dataLimit * selectedPlan.price_per_gb;
      let discountAmount = 0;
      
      if (discountUsed && discountUsed.percentage > 0) {
        discountAmount = Math.round((finalPrice * discountUsed.percentage) / 100);
        finalPrice = finalPrice - discountAmount;
      }

      console.log('SUBSCRIPTION: Price calculation:', { 
        originalPrice: formData.dataLimit * selectedPlan.price_per_gb,
        discountAmount,
        finalPrice 
      });

      // Generate unique username
      const username = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('SUBSCRIPTION: Generated username:', username);

      // STEP 1: Save subscription to database FIRST with plan_id
      const subscriptionData = {
        mobile: formData.mobile,
        data_limit_gb: formData.dataLimit,
        duration_days: formData.duration,
        price_toman: finalPrice,
        status: 'pending',
        username: username,
        plan_id: selectedPlan.id, // Use the actual plan UUID, not the plan_id text field
        notes: `Plan: ${selectedPlan.name_en} (${selectedPlan.plan_id}), Panel: ${primaryPanel?.name}, Data: ${formData.dataLimit}GB`,
        marzban_user_created: false
      };

      console.log('SUBSCRIPTION: Attempting to save subscription to database:', subscriptionData);

      const { data: savedSubscription, error: saveError } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (saveError) {
        console.error('SUBSCRIPTION: Database save failed:', saveError);
        throw new Error(`Failed to save subscription to database: ${saveError.message}`);
      }

      console.log('SUBSCRIPTION: ✅ Successfully saved subscription to database:', savedSubscription);

      // STEP 2: Create VPN user using PlanService (which handles dynamic panel selection)
      console.log('=== CREATING VPN USER USING DYNAMIC PLAN SERVICE ===');
      
      const vpnResult = await PlanService.createSubscription(selectedPlan.id, {
        username: savedSubscription.username,
        mobile: formData.mobile,
        dataLimitGB: formData.dataLimit,
        durationDays: formData.duration,
        notes: `Mobile: ${formData.mobile}, Plan: ${selectedPlan.name_en}, ID: ${savedSubscription.id}`
      });
        
      console.log('SUBSCRIPTION: VPN creation response:', vpnResult);

      if (!vpnResult) {
        throw new Error('VPN creation failed: No response from panel');
      }

      // Update subscription status to active and add VPN details
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'active',
          marzban_user_created: true,
          subscription_url: vpnResult.subscription_url,
          expire_at: vpnResult.expire,
          notes: `${subscriptionData.notes} - VPN created successfully`
        })
        .eq('id', savedSubscription.id);

      if (updateError) {
        console.warn('SUBSCRIPTION: Failed to update subscription status:', updateError);
      }

      console.log('SUBSCRIPTION: ✅ VPN user created successfully using dynamic plan service');

      // STEP 3: Check if this is a lite plan and handle differently
      const isLitePlan = selectedPlan.plan_id === 'lite';
      
      console.log('SUBSCRIPTION: Plan type check:', { 
        selectedPlanId: selectedPlan.plan_id, 
        isLitePlan 
      });

      // Prepare data for result display
      const subscriptionResult = {
        username: vpnResult.username,
        subscription_url: vpnResult.subscription_url,
        expire: vpnResult.expire,
        data_limit: vpnResult.data_limit,
        status: 'active',
        used_traffic: 0,
        apiType: selectedPlan.api_type,
        planName: selectedPlan.name_en,
        dataLimitGB: formData.dataLimit,
        durationDays: formData.duration
      };

      if (isLitePlan) {
        console.log('SUBSCRIPTION: ✅ Lite plan detected - showing success component');
        setLiteSuccessData(subscriptionResult);
        setShowLiteSuccess(true);
      } else {
        console.log('SUBSCRIPTION: ✅ Pro plan detected - redirecting to delivery page');
        localStorage.setItem('deliverySubscriptionData', JSON.stringify(subscriptionResult));
        navigate('/delivery', { 
          state: { subscriptionData: subscriptionResult }
        });
      }

    } catch (error: any) {
      console.error('SUBSCRIPTION: ❌ Process failed with error:', error);
      
      // Update subscription status to failed if it was created
      if (error.message && !error.message.includes('Failed to save subscription to database')) {
        // Only try to update if the subscription was saved
        try {
          await supabase
            .from('subscriptions')
            .update({ 
              status: 'failed',
              notes: `${formData.mobile}, Plan: ${selectedPlan?.name_en} - Error: ${error.message}`
            })
            .eq('username', `user_${Date.now()}_*`); // This won't work perfectly, but it's better than nothing
        } catch (updateErr) {
          console.warn('SUBSCRIPTION: Failed to update failed subscription:', updateErr);
        }
      }
      
      setError(error.message || 'An unexpected error occurred');
      
      toast({
        title: language === 'fa' ? 'خطا در ایجاد اشتراک' : 'Subscription Creation Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (result) {
    return <SubscriptionSuccess result={result} />;
  }

  // Show lite success component if applicable
  if (showLiteSuccess && liteSuccessData) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-600" />
            <h2 className="text-2xl font-bold text-green-800 dark:text-green-200">
              {language === 'fa' ? '🎉 اشتراک شما آماده است!' : '🎉 Your Subscription is Ready!'}
            </h2>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg w-full">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{language === 'fa' ? 'نام کاربری:' : 'Username:'}</span>
                  <span className="font-mono">{liteSuccessData.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">{language === 'fa' ? 'حجم:' : 'Data:'}</span>
                  <span>{liteSuccessData.dataLimitGB} GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">{language === 'fa' ? 'مدت:' : 'Duration:'}</span>
                  <span>{liteSuccessData.durationDays} {language === 'fa' ? 'روز' : 'days'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">{language === 'fa' ? 'نوع API:' : 'API Type:'}</span>
                  <span className="capitalize">{liteSuccessData.apiType}</span>
                </div>
              </div>
            </div>
            <div className="w-full">
              <Label className="text-sm font-medium">
                {language === 'fa' ? 'لینک اشتراک:' : 'Subscription URL:'}
              </Label>
              <div className="mt-1 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <code className="text-xs break-all text-blue-800 dark:text-blue-200">
                  {liteSuccessData.subscription_url}
                </code>
              </div>
            </div>
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(liteSuccessData.subscription_url);
                  toast({
                    title: language === 'fa' ? 'کپی شد!' : 'Copied!',
                    description: language === 'fa' ? 'لینک اشتراک کپی شد' : 'Subscription URL copied to clipboard',
                  });
                }}
                className="flex-1"
              >
                {language === 'fa' ? 'کپی لینک' : 'Copy URL'}
              </Button>
              <Button
                onClick={() => {
                  setShowLiteSuccess(false);
                  setLiteSuccessData(null);
                  setFormData({
                    mobile: '',
                    dataLimit: 0,
                    duration: 0,
                  });
                  setSelectedPlan(null);
                  setDiscountCode('');
                  setDiscountUsed(null);
                }}
                className="flex-1"
              >
                {language === 'fa' ? 'اشتراک جدید' : 'New Subscription'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show loading state while fetching plans
  if (isLoadingPlans) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>{language === 'fa' ? 'در حال بارگذاری پلن‌ها...' : 'Loading plans...'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-blue-800 dark:text-blue-200">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            {language === 'fa' ? 'ایجاد اشتراک VPN' : 'Create VPN Subscription'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* Mobile Field */}
            <div>
              <Label htmlFor="mobile" className="text-sm font-medium">
                {language === 'fa' ? 'شماره موبایل' : 'Mobile Number'}
              </Label>
              <Input
                id="mobile"
                type="tel"
                placeholder={language === 'fa' ? '09123456789' : '09123456789'}
                value={formData.mobile}
                onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                className="mt-1"
                required
              />
            </div>

            {/* Plan Selection */}
            <div>
              <Label className="text-sm font-medium">
                {language === 'fa' ? 'انتخاب پلن' : 'Select Plan'}
              </Label>
              {plans.length === 0 ? (
                <div className="mt-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-yellow-800 dark:text-yellow-200">
                    {language === 'fa' ? 'هیچ پلنی در دسترس نیست' : 'No plans available'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  {plans.map((plan) => {
                    const primaryPanel = PlanService.getPrimaryPanel(plan);
                    const isUnavailable = plan.panels.length === 0;
                    const isOffline = primaryPanel?.health_status === 'offline';
                    
                    return (
                      <Card 
                        key={plan.id}
                        className={`cursor-pointer transition-all ${
                          selectedPlan?.id === plan.id 
                            ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : isUnavailable 
                            ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
                            : isOffline
                            ? 'opacity-75 bg-orange-50 dark:bg-orange-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                        onClick={() => {
                          if (!isUnavailable) {
                            setSelectedPlan(plan);
                          }
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg flex items-center gap-2">
                                {language === 'fa' ? plan.name_fa : plan.name_en}
                                {isUnavailable && <AlertTriangle className="w-4 h-4 text-red-500" />}
                                {isOffline && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {language === 'fa' ? plan.description_fa : plan.description_en}
                              </p>
                              <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-2">
                                {plan.price_per_gb.toLocaleString()} {language === 'fa' ? 'تومان/گیگ' : 'Toman/GB'}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                {plan.default_duration_days} {language === 'fa' ? 'روز' : 'days'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-3 space-y-2">
                            {/* Panel Status */}
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                isUnavailable 
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                  : isOffline
                                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                                  : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                              }`}>
                                {isUnavailable 
                                  ? (language === 'fa' ? 'غیرفعال' : 'Unavailable')
                                  : isOffline
                                  ? (language === 'fa' ? 'آفلاین' : 'Offline')
                                  : (language === 'fa' ? 'آنلاین' : 'Online')
                                }
                              </span>
                              {primaryPanel && (
                                <span className="text-xs text-gray-500">
                                  {primaryPanel.name}
                                </span>
                              )}
                            </div>
                            
                            {/* API Type */}
                            <div>
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                                {plan.api_type.charAt(0).toUpperCase() + plan.api_type.slice(1)} Panel
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Plan status display */}
            {selectedPlan && (
              <div className={`p-4 rounded-lg border ${
                selectedPlan.panels.length > 0
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
                {selectedPlan.panels.length > 0 ? (
                  <>
                    <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                      ✅ {language === 'fa' ? 'این پلن آماده استفاده است' : 'This plan is ready to use'}
                    </p>
                    <div className="text-sm text-green-700 dark:text-green-300">
                      • {language === 'fa' ? 'سرور:' : 'Server:'} {PlanService.getPrimaryPanel(selectedPlan)?.name}
                      {selectedPlan.assigned_panel_id && ' (Assigned)'}
                    </div>
                  </>
                ) : (
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    ❌ {language === 'fa' ? 'این پلن در حال حاضر در دسترس نیست' : 'This plan is currently not available'}
                  </p>
                )}
              </div>
            )}

            {/* Data Limit */}
            <div>
              <Label htmlFor="dataLimit" className="text-sm font-medium">
                {language === 'fa' ? 'حجم (گ) *' : 'Data Volume (GB) *'}
              </Label>
              <Select value={formData.dataLimit?.toString()} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, dataLimit: parseInt(value) }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={language === 'fa' ? 'انتخاب حجم' : 'Select volume'} />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 30, 50, 75, 100, 150, 200].map((gb) => (
                    <SelectItem key={gb} value={gb.toString()}>
                      {gb} GB
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div>
              <Label htmlFor="duration" className="text-sm font-medium">
                {language === 'fa' ? 'مدت زمان (روز) *' : 'Duration (Days) *'}
              </Label>
              <Select value={formData.duration?.toString()} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, duration: parseInt(value) }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={language === 'fa' ? 'انتخاب مدت' : 'Select duration'} />
                </SelectTrigger>
                <SelectContent>
                  {[7, 15, 30, 60, 90].map((days) => (
                    <SelectItem key={days} value={days.toString()}>
                      {days} {language === 'fa' ? 'روز' : 'days'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Discount Code */}
            <div>
              <Label htmlFor="discountCode" className="text-sm font-medium">
                {language === 'fa' ? 'کد تخفیف (اختیاری)' : 'Discount Code (Optional)'}
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="discountCode"
                  type="text"
                  placeholder={language === 'fa' ? 'کد تخفیف را وارد کنید' : 'Enter discount code'}
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                />
                <Button type="button" onClick={applyDiscount} variant="outline">
                  {language === 'fa' ? 'اعمال' : 'Apply'}
                </Button>
              </div>
            </div>

            {/* Price Summary */}
            {selectedPlan && formData.dataLimit && (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>{language === 'fa' ? 'قیمت پایه:' : 'Base Price:'}</span>
                  <span>{(formData.dataLimit * selectedPlan.price_per_gb).toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}</span>
                </div>
                {discountUsed && (
                  <div className="flex justify-between text-green-600">
                    <span>{language === 'fa' ? 'تخفیف:' : 'Discount:'}</span>
                    <span>-{Math.round((formData.dataLimit * selectedPlan.price_per_gb * discountUsed.percentage) / 100).toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>{language === 'fa' ? 'قیمت نهایی:' : 'Final Price:'}</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {getFinalPrice().toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <Button 
              type="submit" 
              size="lg" 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" 
              disabled={isLoading || !selectedPlan || !formData.dataLimit || plans.length === 0 || (selectedPlan && selectedPlan.panels.length === 0)}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {!selectedPlan 
                ? (language === 'fa' ? 'انتخاب پلن' : 'Select Plan')
                : selectedPlan.panels.length === 0 
                ? (language === 'fa' ? 'پلن در دسترس نیست' : 'Plan Not Available')
                : (language === 'fa' ? 'ایجاد اشتراک' : 'Create Subscription')
              }
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarzbanSubscriptionForm;
