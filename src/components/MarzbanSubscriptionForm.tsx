
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

const MarzbanSubscriptionForm = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
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
        // Map database schema to component interface
        const mappedPlans = data.map(plan => ({
          id: plan.id,
          name: language === 'fa' ? plan.name_fa : plan.name_en,
          description: language === 'fa' ? plan.description_fa || '' : plan.description_en || '',
          pricePerGB: plan.price_per_gb,
          apiType: plan.api_type as 'marzban' | 'marzneshin',
          durationDays: plan.default_duration_days
        }));
        console.log('SUBSCRIPTION FORM: Mapped plans:', mappedPlans);
        setPlans(mappedPlans);
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
      // Map database schema to component interface
      const mappedDiscount = {
        code: data.code,
        percentage: data.discount_value, // Use discount_value as percentage
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
    console.log('SUBSCRIPTION FORM: Selected plan:', selectedPlan);
    
    if (!formData.mobile || !formData.dataLimit || !selectedPlan) {
      console.error('SUBSCRIPTION FORM: Missing required fields');
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'لطفاً تمام فیلدها را پر کنید' : 
          'Please fill in all fields',
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

      // First, save the subscription to database
      const subscriptionData = {
        mobile: formData.mobile,
        data_limit_gb: formData.dataLimit,
        duration_days: formData.duration,
        price_toman: finalPrice,
        status: 'pending',
        username: username,
        notes: `Plan: ${selectedPlan.name}, Data: ${formData.dataLimit}GB, Duration: ${formData.duration} days, API: ${selectedPlan.apiType}`
      };

      console.log('SUBSCRIPTION: Saving to database:', subscriptionData);

      const { data: savedSubscription, error: saveError } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (saveError) {
        console.error('SUBSCRIPTION: Database save error:', saveError);
        throw new Error(`Failed to save subscription: ${saveError.message}`);
      }

      console.log('SUBSCRIPTION: Successfully saved to database:', savedSubscription);

      // Create VPN user via API
      console.log('SUBSCRIPTION: Creating VPN user via API...');
      
      const vpnUserRequest = {
        username: savedSubscription.username,
        data_limit: formData.dataLimit * 1073741824, // Convert GB to bytes
        expire_duration: formData.duration,
        note: `Mobile: ${formData.mobile}, Plan: ${selectedPlan.name}, ID: ${savedSubscription.id}`
      };

      console.log('SUBSCRIPTION: VPN user request data:', vpnUserRequest);

      let vpnResponse;
      if (selectedPlan.apiType === 'marzneshin') {
        console.log('SUBSCRIPTION: Using Marzneshin API');
        const marzneshinResponse = await fetch('/api/marzneshin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vpnUserRequest)
        });
        vpnResponse = await marzneshinResponse.json();
      } else {
        console.log('SUBSCRIPTION: Using Marzban API');
        const marzbanResponse = await fetch('/api/marzban/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vpnUserRequest)
        });
        vpnResponse = await marzbanResponse.json();
      }

      console.log('SUBSCRIPTION: VPN API response:', vpnResponse);

      if (!vpnResponse.success) {
        console.error('SUBSCRIPTION: VPN user creation failed:', vpnResponse.error);
        
        // Update subscription status to failed
        await supabase
          .from('subscriptions')
          .update({ 
            status: 'failed',
            notes: `${subscriptionData.notes} - VPN creation failed: ${vpnResponse.error}`
          })
          .eq('id', savedSubscription.id);
        
        throw new Error(`Failed to create VPN user: ${vpnResponse.error}`);
      }

      console.log('SUBSCRIPTION: VPN user created successfully:', vpnResponse.data);

      // Update subscription with VPN details
      const updateData = {
        subscription_url: vpnResponse.data.subscription_url,
        status: 'active',
        marzban_user_created: true,
        expire_at: new Date(vpnResponse.data.expire * 1000).toISOString()
      };

      console.log('SUBSCRIPTION: Updating subscription with VPN details:', updateData);

      const { error: updateError } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('id', savedSubscription.id);

      if (updateError) {
        console.error('SUBSCRIPTION: Update error:', updateError);
        throw new Error(`Failed to update subscription: ${updateError.message}`);
      }

      console.log('SUBSCRIPTION: Successfully updated subscription with VPN details');

      // Log discount usage if applicable
      if (discountUsed && discountUsed.code) {
        console.log('SUBSCRIPTION: Logging discount usage');
        
        // Get discount ID from database
        const { data: discountRecord } = await supabase
          .from('discount_codes')
          .select('id, current_usage_count')
          .eq('code', discountUsed.code)
          .single();

        if (discountRecord) {
          // Log the discount usage
          await supabase
            .from('discount_usage_logs')
            .insert({
              discount_code_id: discountRecord.id,
              subscription_id: savedSubscription.id,
              discount_amount: discountAmount,
              user_mobile: formData.mobile
            });

          // Update usage count
          await supabase
            .from('discount_codes')
            .update({ 
              current_usage_count: discountRecord.current_usage_count + 1
            })
            .eq('id', discountRecord.id);

          console.log('SUBSCRIPTION: Discount usage logged successfully');
        }
      }

      // Set success result with complete data
      const successResult = {
        username: vpnResponse.data.username,
        subscription_url: vpnResponse.data.subscription_url,
        expire: vpnResponse.data.expire,
        data_limit: vpnResponse.data.data_limit,
        planName: selectedPlan.name,
        subscriptionId: savedSubscription.id
      };

      console.log('SUBSCRIPTION: Process completed successfully, result:', successResult);
      
      // Store data for delivery page
      localStorage.setItem('deliverySubscriptionData', JSON.stringify(successResult));
      
      // Navigate to delivery page with data
      navigate('/delivery', { 
        state: { subscriptionData: successResult }
      });

    } catch (error: any) {
      console.error('SUBSCRIPTION: Process failed with error:', error);
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
                        <p className="text-sm text-gray-500 mt-1">
                          {plan.apiType} - {plan.durationDays} {language === 'fa' ? 'روز' : 'days'}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

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
              disabled={isLoading || !selectedPlan || !formData.dataLimit || plans.length === 0}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {language === 'fa' ? 'ایجاد اشتراک' : 'Create Subscription'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarzbanSubscriptionForm;
