
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Loader2, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SubscriptionSuccess from './SubscriptionSuccess';
import { useNavigate } from 'react-router-dom';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  pricePerGB: number;
  apiType: 'marzban' | 'marzneshin';
  durationDays?: number;
}

interface DiscountCode {
  code: string;
  percentage: number;
  description: string;
}

interface PlanPanel {
  panel_id: string;
  panel_name: string;
  panel_url: string;
  panel_type: 'marzban' | 'marzneshin';
  is_primary: boolean;
  inbound_ids: string[];
}

const MarzbanSubscriptionForm = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [planPanels, setPlanPanels] = useState<PlanPanel[]>([]);
  const [formData, setFormData] = useState({
    mobile: '',
    dataLimit: 0,
    duration: 0,
  });
  const [discountCode, setDiscountCode] = useState('');
  const [discountUsed, setDiscountUsed] = useState<DiscountCode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      console.log('=== SUBSCRIPTION FORM: Fetching plans ===');
      
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .eq('is_visible', true);

      console.log('SUBSCRIPTION FORM: Plans response:', { data, error, count: data?.length });

      if (error) {
        console.error('SUBSCRIPTION FORM: Error fetching plans:', error);
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: language === 'fa' ? 'مشکلی در دریافت پلن‌ها وجود دارد.' : 'There was an issue fetching the plans.',
          variant: 'destructive',
        });
      } else {
        const mappedPlans = data.map(plan => {
          console.log('SUBSCRIPTION FORM: ✅ Processing plan:', { 
            plan_id: plan.plan_id, 
            api_type: plan.api_type,
            name_fa: plan.name_fa,
            name_en: plan.name_en 
          });
          
          return {
            id: plan.id,
            name: language === 'fa' ? plan.name_fa : plan.name_en,
            description: language === 'fa' ? plan.description_fa || '' : plan.description_en || '',
            pricePerGB: plan.price_per_gb,
            apiType: plan.api_type as 'marzban' | 'marzneshin',
            durationDays: plan.default_duration_days
          };
        });
        console.log('SUBSCRIPTION FORM: ✅ Mapped plans with API types:', mappedPlans);
        setPlans(mappedPlans);
      }
    };

    fetchPlans();
  }, [language, toast]);

  useEffect(() => {
    const fetchPlanPanels = async () => {
      if (!selectedPlan) {
        setPlanPanels([]);
        return;
      }

      console.log('=== SUBSCRIPTION FORM: Fetching panels for plan:', selectedPlan.id);
      
      const { data: mappings, error: mappingError } = await supabase
        .from('plan_panel_mappings')
        .select(`
          panel_id,
          is_primary,
          inbound_ids,
          panel_servers (
            id,
            name,
            panel_url,
            type
          )
        `)
        .eq('plan_id', selectedPlan.id);

      if (mappingError) {
        console.error('SUBSCRIPTION FORM: Error fetching plan panels:', mappingError);
        return;
      }

      const panels = mappings?.map(mapping => ({
        panel_id: mapping.panel_id,
        panel_name: mapping.panel_servers?.name || 'Unknown Panel',
        panel_url: mapping.panel_servers?.panel_url || '',
        panel_type: mapping.panel_servers?.type as 'marzban' | 'marzneshin',
        is_primary: mapping.is_primary,
        inbound_ids: Array.isArray(mapping.inbound_ids) 
          ? mapping.inbound_ids.map(id => String(id))
          : []
      })) || [];

      console.log('SUBSCRIPTION FORM: Plan panels:', panels);
      setPlanPanels(panels);

      if (panels.length === 0) {
        console.warn('SUBSCRIPTION FORM: No panels configured for plan:', selectedPlan.id);
        toast({
          title: language === 'fa' ? 'هشدار پیکربندی' : 'Configuration Warning',
          description: language === 'fa' ? 
            'این پلن هنوز پیکربندی نشده است. لطفاً پلن دیگری انتخاب کنید یا با پشتیبانی تماس بگیرید.' : 
            'This plan is not configured yet. Please select another plan or contact admin.',
          variant: 'destructive',
        });
      } else {
        console.log('SUBSCRIPTION FORM: Plan properly configured with', panels.length, 'panels');
      }
    };

    fetchPlanPanels();
  }, [selectedPlan, language, toast]);

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
    let finalPrice = formData.dataLimit * selectedPlan.pricePerGB;
    if (discountUsed && discountUsed.percentage > 0) {
      finalPrice = finalPrice - Math.round((finalPrice * discountUsed.percentage) / 100);
    }
    return finalPrice;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== SUBSCRIPTION FORM: Starting submission ===');
    console.log('SUBSCRIPTION FORM: Form data:', formData);
    console.log('SUBSCRIPTION FORM: ⚠️ CRITICAL - Selected plan API type check:', {
      id: selectedPlan?.id,
      name: selectedPlan?.name,
      apiType: selectedPlan?.apiType,
      pricePerGB: selectedPlan?.pricePerGB
    });
    
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

    // CRITICAL: Validate API type exists and is correct
    if (!selectedPlan.apiType) {
      console.error('SUBSCRIPTION FORM: ❌ Plan missing API type');
      setError('Selected plan is missing API type configuration');
      toast({
        title: language === 'fa' ? 'خطا در پیکربندی پلن' : 'Plan Configuration Error',
        description: language === 'fa' ? 
          'پلن انتخابی فاقد تنظیمات API است' : 
          'Selected plan is missing API configuration',
        variant: 'destructive',
      });
      return;
    }

    // CRITICAL: Log the exact API type being used
    console.log(`SUBSCRIPTION FORM: 🔥 USING API TYPE: "${selectedPlan.apiType}" for plan "${selectedPlan.name}"`);
    
    if (selectedPlan.apiType !== 'marzban' && selectedPlan.apiType !== 'marzneshin') {
      console.error('SUBSCRIPTION FORM: ❌ Invalid API type:', selectedPlan.apiType);
      setError(`Invalid API type: ${selectedPlan.apiType}`);
      return;
    }

    // Critical validation: Check if plan has panel configurations
    if (planPanels.length === 0) {
      console.error('SUBSCRIPTION FORM: No panels configured for this plan - blocking submission');
      setError(language === 'fa' ? 
        'این پلن هنوز پیکربندی نشده است. لطفاً پلن دیگری انتخاب کنید یا با پشتیبانی تماس بگیرید.' : 
        'This plan has not been configured yet. Please select another plan or contact support.'
      );
      
      toast({
        title: language === 'fa' ? 'خطا در پیکربندی پلن' : 'Plan Configuration Error',
        description: language === 'fa' ? 
          'این پلن هیچ سرور پیکربندی شده‌ای ندارد. نمی‌توان اشتراک ایجاد کرد.' : 
          'This plan has no configured servers. Cannot create subscription.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('=== SUBSCRIPTION: Starting subscription creation process ===');
      
      // Calculate final price with discount
      let finalPrice = formData.dataLimit * selectedPlan.pricePerGB;
      let discountAmount = 0;
      
      if (discountUsed && discountUsed.percentage > 0) {
        discountAmount = Math.round((finalPrice * discountUsed.percentage) / 100);
        finalPrice = finalPrice - discountAmount;
      }

      console.log('SUBSCRIPTION: Price calculation:', { 
        originalPrice: formData.dataLimit * selectedPlan.pricePerGB,
        discountAmount,
        finalPrice 
      });

      // Generate unique username
      const username = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('SUBSCRIPTION: Generated username:', username);

      // STEP 1: Save subscription to database FIRST
      const subscriptionData = {
        mobile: formData.mobile,
        data_limit_gb: formData.dataLimit,
        duration_days: formData.duration,
        price_toman: finalPrice,
        status: 'pending',
        username: username,
        notes: `Plan: ${selectedPlan.name}, Data: ${formData.dataLimit}GB, Duration: ${formData.duration} days, API: ${selectedPlan.apiType}, Panels: ${planPanels.length}`,
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

      if (!savedSubscription) {
        console.error('SUBSCRIPTION: No subscription returned from database insert');
        throw new Error('Failed to save subscription - no data returned from database');
      }

      console.log('SUBSCRIPTION: ✅ Successfully saved subscription to database:', savedSubscription);

      // Show success toast for database save
      toast({
        title: language === 'fa' ? 'اشتراک ثبت شد' : 'Subscription Saved',
        description: language === 'fa' ? 
          'اشتراک شما در پایگاه داده ثبت شد. در حال ایجاد کاربر VPN...' : 
          'Your subscription has been saved to database. Creating VPN user...',
      });

      // STEP 2: Create VPN user using the CORRECT edge function based on plan API type
      console.log(`SUBSCRIPTION: 🔥🔥🔥 CRITICAL: Plan API type is "${selectedPlan.apiType}" - selecting correct edge function`);
      
      let vpnResponse;
      if (selectedPlan.apiType === 'marzban') {
        console.log('SUBSCRIPTION: ✅✅✅ CONFIRMED: Using Marzban edge function for Lite plan');
        const { data, error } = await supabase.functions.invoke('marzban-create-user', {
          body: {
            username: savedSubscription.username,
            dataLimitGB: formData.dataLimit,
            durationDays: formData.duration,
            notes: `Mobile: ${formData.mobile}, Plan: ${selectedPlan.name}, ID: ${savedSubscription.id}`
          }
        });
        
        if (error) {
          console.error('SUBSCRIPTION: Marzban edge function error:', error);
          throw new Error(`Marzban service error: ${error.message}`);
        }
        
        vpnResponse = data;
        console.log('SUBSCRIPTION: ✅ Marzban API response:', vpnResponse);
      } else if (selectedPlan.apiType === 'marzneshin') {
        console.log('SUBSCRIPTION: ✅✅✅ CONFIRMED: Using Marzneshin edge function for Pro plan');
        const { data, error } = await supabase.functions.invoke('marzneshin-create-user', {
          body: {
            username: savedSubscription.username,
            dataLimitGB: formData.dataLimit,
            durationDays: formData.duration,
            notes: `Mobile: ${formData.mobile}, Plan: ${selectedPlan.name}, ID: ${savedSubscription.id}`
          }
        });
        
        if (error) {
          console.error('SUBSCRIPTION: Marzneshin edge function error:', error);
          throw new Error(`Marzneshin service error: ${error.message}`);
        }
        
        vpnResponse = data;
        console.log('SUBSCRIPTION: ✅ Marzneshin API response:', vpnResponse);
      } else {
        console.error('SUBSCRIPTION: ❌❌❌ CRITICAL ERROR: Unknown API type:', selectedPlan.apiType);
        throw new Error(`Unknown API type: ${selectedPlan.apiType}`);
      }

      if (!vpnResponse?.success) {
        console.error('SUBSCRIPTION: VPN user creation failed:', vpnResponse?.error);
        
        // Update subscription status to failed
        await supabase
          .from('subscriptions')
          .update({ 
            status: 'failed',
            notes: `${subscriptionData.notes} - VPN creation failed: ${vpnResponse?.error}`
          })
          .eq('id', savedSubscription.id);
        
        throw new Error(`Failed to create VPN user: ${vpnResponse?.error}`);
      }

      console.log(`SUBSCRIPTION: ✅✅✅ VPN user created successfully using ${selectedPlan.apiType}:`, vpnResponse.data);

      // STEP 3: Update subscription with VPN details
      const updateData = {
        subscription_url: vpnResponse.data.subscription_url,
        status: 'active',
        marzban_user_created: true,
        expire_at: vpnResponse.data.expire ? new Date(vpnResponse.data.expire).toISOString() : null
      };

      console.log('SUBSCRIPTION: Updating subscription with VPN details:', updateData);

      const { error: updateError } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('id', savedSubscription.id);

      if (updateError) {
        console.error('SUBSCRIPTION: Failed to update subscription with VPN details:', updateError);
        // Don't throw error here as VPN user was created successfully
      }

      console.log('SUBSCRIPTION: ✅ Successfully updated subscription with VPN details');

      // STEP 4: Log discount usage if applicable
      if (discountUsed && discountUsed.code) {
        console.log('SUBSCRIPTION: Logging discount usage');
        
        const { data: discountRecord } = await supabase
          .from('discount_codes')
          .select('id, current_usage_count')
          .eq('code', discountUsed.code)
          .single();

        if (discountRecord) {
          await supabase
            .from('discount_usage_logs')
            .insert({
              discount_code_id: discountRecord.id,
              subscription_id: savedSubscription.id,
              discount_amount: discountAmount,
              user_mobile: formData.mobile
            });

          await supabase
            .from('discount_codes')
            .update({ 
              current_usage_count: discountRecord.current_usage_count + 1
            })
            .eq('id', discountRecord.id);

          console.log('SUBSCRIPTION: ✅ Discount usage logged successfully');
        }
      }

      // STEP 5: Prepare data for delivery page with API type information
      const subscriptionResult = {
        username: vpnResponse.data.username,
        subscription_url: vpnResponse.data.subscription_url,
        expire: vpnResponse.data.expire || Date.now() + (formData.duration * 24 * 60 * 60 * 1000),
        data_limit: vpnResponse.data.data_limit || formData.dataLimit * 1073741824,
        status: 'active',
        used_traffic: 0,
        apiType: selectedPlan.apiType // Include API type for delivery page
      };

      console.log(`SUBSCRIPTION: ✅✅✅ Process completed successfully using ${selectedPlan.apiType} API, result:`, subscriptionResult);
      
      // Store data for delivery page
      localStorage.setItem('deliverySubscriptionData', JSON.stringify(subscriptionResult));
      
      // Navigate to delivery page with data
      navigate('/delivery', { 
        state: { subscriptionData: subscriptionResult }
      });

    } catch (error: any) {
      console.error('SUBSCRIPTION: ❌ Process failed with error:', error);
      
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

            {/* Plan Selection - Removed API Type Display */}
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
                  {plans.map((plan) => (
                    <Card 
                      key={plan.id}
                      className={`cursor-pointer transition-all ${
                        selectedPlan?.id === plan.id 
                          ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      <CardContent className="p-4">
                        <h3 className="font-bold text-lg">{plan.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{plan.description}</p>
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-2">
                          {plan.pricePerGB.toLocaleString()} {language === 'fa' ? 'تومان/گیگ' : 'Toman/GB'}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          {plan.durationDays} {language === 'fa' ? 'روز' : 'days'}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Panel status display */}
            {selectedPlan && (
              <>
                {planPanels.length > 0 ? (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                      ✅ {language === 'fa' ? 'سرورهای پیکربندی شده برای این پلن:' : 'Configured servers for this plan:'}
                    </p>
                    {planPanels.map((panel, index) => (
                      <div key={index} className="text-sm text-green-700 dark:text-green-300">
                        • {panel.panel_name} {panel.is_primary && ' - Primary'}
                      </div>
                    ))}
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                      {language === 'fa' ? 
                        'این پلن آماده استفاده است.' : 
                        'This plan is ready to use.'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                      ❌ {language === 'fa' ? 'این پلن پیکربندی نشده است' : 'This plan is not configured'}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {language === 'fa' ? 
                        'هیچ سروری برای این پلن تنظیم نشده است. لطفاً پلن دیگری انتخاب کنید یا با مدیر سیستم تماس بگیرید.' : 
                        'No servers have been configured for this plan. Please select another plan or contact the system administrator.'
                      }
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Data Limit */}
            <div>
              <Label htmlFor="dataLimit" className="text-sm font-medium">
                {language === 'fa' ? 'حجم (گیگابایت)' : 'Data Volume (GB)'}
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
                {language === 'fa' ? 'مدت زمان (روز)' : 'Duration (Days)'}
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
                  <span>{(formData.dataLimit * selectedPlan.pricePerGB).toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}</span>
                </div>
                {discountUsed && (
                  <div className="flex justify-between text-green-600">
                    <span>{language === 'fa' ? 'تخفیف:' : 'Discount:'}</span>
                    <span>-{Math.round((formData.dataLimit * selectedPlan.pricePerGB * discountUsed.percentage) / 100).toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}</span>
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
              disabled={isLoading || !selectedPlan || !formData.dataLimit || plans.length === 0 || (selectedPlan && planPanels.length === 0)}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {!selectedPlan 
                ? (language === 'fa' ? 'انتخاب پلن' : 'Select Plan')
                : planPanels.length === 0 
                ? (language === 'fa' ? 'پلن پیکربندی نشده' : 'Plan Not Configured')
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
