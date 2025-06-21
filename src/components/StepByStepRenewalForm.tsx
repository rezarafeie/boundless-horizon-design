import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, ChevronDown, CheckCircle, Zap, User, Calendar, Database, RefreshCw, Bug, Globe, Loader, Code2, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { SubscriptionPlan, DiscountCode } from '@/types/subscription';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DiscountField from '@/components/DiscountField';

interface UserData {
  username: string;
  data_limit: number;
  data_limit_reset_strategy: string;
  expire: number | null;
  expire_date?: string; // For Marzneshin
  status: string;
  used_traffic: number;
  id?: number; // For Marzneshin
}

interface DebugInfo {
  payment_status: 'PENDING' | 'PAID' | 'FAILED' | 'FREE';
  payment_gateway: string;
  amount_paid: number;
  discount_code?: string;
  renewal_request?: any;
  renewal_response?: any;
  payment_authority?: string;
  error_details?: any;
}

const STEPS = [
  { id: 1, name: 'plan', icon: Settings, titleFa: 'انتخاب پلن', titleEn: 'Select Plan' },
  { id: 2, name: 'search', icon: User, titleFa: 'جستجوی کاربر', titleEn: 'User Search' },
  { id: 3, name: 'renewal', icon: RefreshCw, titleFa: 'تمدید اشتراک', titleEn: 'Renewal Options' },
  { id: 4, name: 'success', icon: CheckCircle, titleFa: 'تکمیل', titleEn: 'Complete' },
];

const StepByStepRenewalForm = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isRTL = language === 'fa';
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Plan selection
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  
  // Step 2: Username search
  const [username, setUsername] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Step 3: API response and user data
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  
  // Step 4: Renewal options
  const [daysToAdd, setDaysToAdd] = useState(30);
  const [dataToAdd, setDataToAdd] = useState(10);
  
  // Payment and discount states
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Debug states
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [renewalDebugOpen, setRenewalDebugOpen] = useState(false);

  // Check if debug mode is enabled via URL params
  const urlParams = new URLSearchParams(window.location.search);
  const debugMode = urlParams.get('debug') === 'true';

  // Merchant ID for Zarinpal
  const MERCHANT_ID = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

  const plans: SubscriptionPlan[] = [
    {
      id: 'lite',
      plan_id: 'lite', // Added missing plan_id
      name: language === 'fa' ? 'شبکه بدون مرز لایت' : 'Boundless Network Lite',
      description: language === 'fa' ? 
        'اتصال پایه با آلمان، فنلاند، هلند - مناسب برای کاربری روزمره' : 
        'Basic connection with Germany, Finland, Netherlands - suitable for daily use',
      pricePerGB: 3200,
      apiType: 'marzban'
    },
    {
      id: 'pro',
      plan_id: 'pro', // Added missing plan_id
      name: language === 'fa' ? 'شبکه بدون مرز پرو' : 'Boundless Network Pro',
      description: language === 'fa' ? 
        'پریمیوم با تمام مکان‌های جهانی و اتصالات تونلی - بهترین عملکرد' : 
        'Premium with all global locations and tunnel connections - best performance',
      pricePerGB: 4200,
      apiType: 'marzneshin'
    }
  ];

  const getLocationsList = (planId: string) => {
    if (planId === 'lite') {
      return language === 'fa' ? 
        ['🇩🇪 آلمان', '🇫🇮 فنلاند', '🇳🇱 هلند'] :
        ['🇩🇪 Germany', '🇫🇮 Finland', '🇳🇱 Netherlands'];
    } else {
      return language === 'fa' ? 
        ['🇺🇸 آمریکا', '🇬🇧 انگلیس', '🇩🇪 آلمان', '🇫🇮 فنلاند', '🇳🇱 هلند', '🇯🇵 ژاپن', '🇸🇬 سنگاپور', '🇦🇺 استرالیا'] :
        ['🇺🇸 USA', '🇬🇧 UK', '🇩🇪 Germany', '🇫🇮 Finland', '🇳🇱 Netherlands', '🇯🇵 Japan', '🇸🇬 Singapore', '🇦🇺 Australia'];
    }
  };

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setCurrentStep(2);
  };

  const searchUser = async () => {
    if (!username.trim() || !selectedPlan) return;
    
    setSearchLoading(true);
    try {
      let response;
      
      if (selectedPlan.apiType === 'marzban') {
        // Marzban API call - you'll need to implement this edge function
        response = await supabase.functions.invoke('marzban-get-user', {
          body: { username }
        });
      } else {
        // Marzneshin API call - you'll need to implement this edge function  
        response = await supabase.functions.invoke('marzneshin-get-user', {
          body: { username }
        });
      }

      console.log('API Response:', response);
      setApiResponse(response);
      
      if (response.data?.success && response.data?.user) {
        setUserData(response.data.user);
        setCurrentStep(3);
      } else {
        setUserData(null);
      }
    } catch (error) {
      console.error('Search error:', error);
      setApiResponse({ error: error.message });
      setUserData(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const formatExpireDate = (timestamp: number | null, expireDate?: string) => {
    // Handle Marzneshin format (ISO string)
    if (expireDate) {
      try {
        const date = new Date(expireDate);
        if (isNaN(date.getTime())) {
          return language === 'fa' ? 'نامحدود' : 'Unlimited';
        }
        return date.toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-US');
      } catch {
        return language === 'fa' ? 'نامحدود' : 'Unlimited';
      }
    }
    
    // Handle Marzban format (UNIX timestamp)
    if (!timestamp || timestamp === 0) {
      return language === 'fa' ? 'نامحدود' : 'Unlimited';
    }
    
    try {
      const date = new Date(timestamp * 1000);
      if (isNaN(date.getTime())) {
        return language === 'fa' ? 'نامحدود' : 'Unlimited';
      }
      return date.toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-US');
    } catch {
      return language === 'fa' ? 'نامحدود' : 'Unlimited';
    }
  };

  const formatDataUsage = (used: number, limit: number) => {
    const usedGB = (used / (1024 * 1024 * 1024)).toFixed(2);
    const limitGB = (limit / (1024 * 1024 * 1024)).toFixed(2);
    return `${usedGB} / ${limitGB} GB`;
  };

  const calculateTotalPrice = () => {
    if (!selectedPlan) return 0;
    const basePrice = dataToAdd * selectedPlan.pricePerGB;
    
    if (appliedDiscount) {
      const discountAmount = (basePrice * appliedDiscount.percentage) / 100;
      return Math.max(0, basePrice - discountAmount);
    }
    
    return basePrice;
  };

  const calculateDiscount = () => {
    if (!selectedPlan || !appliedDiscount) return 0;
    const basePrice = dataToAdd * selectedPlan.pricePerGB;
    return (basePrice * appliedDiscount.percentage) / 100;
  };

  const getOriginalPrice = () => {
    if (!selectedPlan) return 0;
    return dataToAdd * selectedPlan.pricePerGB;
  };

  const handleDiscountApply = (discount: DiscountCode | null) => {
    setAppliedDiscount(discount);
    
    // Update debug info when discount is applied/removed
    if (debugInfo) {
      setDebugInfo({
        ...debugInfo,
        discount_code: discount?.code,
        amount_paid: calculateTotalPrice()
      });
    }
  };

  const validateForm = () => {
    if (!username.trim()) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'نام کاربری وارد نشده است' : 'Username is required',
        variant: 'destructive'
      });
      return false;
    }

    if (!selectedPlan) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'پلن انتخاب نشده است' : 'Plan is not selected',
        variant: 'destructive'
      });
      return false;
    }

    if (daysToAdd < 1 || daysToAdd > 365) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'تعداد روزها باید بین ۱ تا ۳۶۵ باشد' : 'Days must be between 1 and 365',
        variant: 'destructive'
      });
      return false;
    }

    if (dataToAdd < 1 || dataToAdd > 1000) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'مقدار داده باید بین ۱ تا ۱۰۰۰ گیگابایت باشد' : 'Data amount must be between 1 and 1000 GB',
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  const handleRenewal = async () => {
    if (!validateForm()) return;

    const totalPrice = calculateTotalPrice();
    
    // Initialize debug info
    const initialDebugInfo: DebugInfo = {
      payment_status: totalPrice === 0 ? 'FREE' : 'PENDING',
      payment_gateway: 'Zarinpal',
      amount_paid: totalPrice,
      discount_code: appliedDiscount?.code,
      renewal_request: {
        username,
        plan: selectedPlan?.name,
        data_limit: dataToAdd * 1024 * 1024 * 1024, // Convert GB to bytes
        expire_after: daysToAdd
      }
    };
    
    setDebugInfo(initialDebugInfo);
    
    // Handle free renewal (100% discount)
    if (totalPrice === 0) {
      setIsSubmitting(true);
      setLoadingMessage(language === 'fa' ? 'در حال پردازش تمدید رایگان...' : 'Processing free renewal...');
      
      try {
        console.log('Processing free renewal:', {
          username,
          plan: selectedPlan,
          daysToAdd,
          dataToAdd,
          totalPrice: 0,
          discount: appliedDiscount
        });

        // Make actual renewal API call based on plan type
        let renewalResponse;
        if (selectedPlan?.apiType === 'marzneshin') {
          renewalResponse = await supabase.functions.invoke('marzneshin-update-user', {
            body: {
              username,
              dataLimitGB: dataToAdd,
              durationDays: daysToAdd
            }
          });
        } else {
          // For Marzban, we'll implement this later or use existing create-user function
          renewalResponse = await supabase.functions.invoke('marzban-update-user', {
            body: {
              username,
              dataLimitGB: dataToAdd,
              durationDays: daysToAdd
            }
          });
        }

        console.log('Renewal API response:', renewalResponse);

        if (renewalResponse.error) {
          throw new Error(renewalResponse.error.message || 'Renewal API call failed');
        }

        if (!renewalResponse.data?.success) {
          throw new Error(renewalResponse.data?.error || 'Renewal failed on server');
        }

        // Update debug info with successful renewal
        setDebugInfo({
          ...initialDebugInfo,
          payment_status: 'FREE',
          renewal_request: {
            username,
            plan: selectedPlan?.name,
            data_limit_gb: dataToAdd,
            expire_after_days: daysToAdd,
            api_type: selectedPlan?.apiType
          },
          renewal_response: {
            success: true,
            message: 'Free renewal completed successfully',
            api_response: renewalResponse.data,
            timestamp: new Date().toISOString()
          }
        });

        toast({
          title: language === 'fa' ? 'موفقیت' : 'Success',
          description: language === 'fa' ? 'تمدید رایگان با موفقیت انجام شد!' : 'Free renewal completed successfully!',
        });

        setCurrentStep(4);
        setRenewalDebugOpen(true);
      } catch (error) {
        console.error('Free renewal error:', error);
        
        // Update debug info with error
        setDebugInfo({
          ...initialDebugInfo,
          payment_status: 'FAILED',
          renewal_request: {
            username,
            plan: selectedPlan?.name,
            data_limit_gb: dataToAdd,
            expire_after_days: daysToAdd,
            api_type: selectedPlan?.apiType
          },
          error_details: {
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
            error_type: 'renewal_api_error'
          }
        });
        
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: language === 'fa' ? 'خطا در پردازش تمدید رایگان' : 'Error processing free renewal',
          variant: 'destructive'
        });
        
        setRenewalDebugOpen(true);
      } finally {
        setIsSubmitting(false);
        setLoadingMessage('');
      }
      return;
    }

    // Handle paid renewal
    setIsSubmitting(true);
    setLoadingMessage(language === 'fa' ? 'در حال ایجاد پیوند پرداخت...' : 'Creating payment link...');

    try {
      const expireAt = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year from now

      const contractResponse = await supabase.functions.invoke('zarinpal-contract', {
        body: {
          merchant_id: MERCHANT_ID,
          mobile: '09123456789', // You might want to collect this from the user
          expire_at: expireAt,
          max_daily_count: 10,
          max_monthly_count: 50,
          max_amount: totalPrice * 10, // Convert to Rials
          callback_url: `${window.location.origin}/renewal?status=success`
        }
      });

      console.log('Contract response:', contractResponse);

      if (contractResponse.data?.success && contractResponse.data?.data?.code === 100) {
        const authority = contractResponse.data.data.data.authority;
        
        // Update debug info with payment authority
        setDebugInfo({
          ...initialDebugInfo,
          payment_authority: authority,
          renewal_request: {
            username,
            plan: selectedPlan?.name,
            data_limit_gb: dataToAdd,
            expire_after_days: daysToAdd,
            api_type: selectedPlan?.apiType,
            payment_amount: totalPrice
          }
        });
        
        // Store renewal data
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .insert({
            username,
            mobile: '09123456789',
            data_limit_gb: dataToAdd,
            duration_days: daysToAdd,
            price_toman: totalPrice,
            zarinpal_authority: authority,
            status: 'pending',
            notes: `Renewal for ${selectedPlan?.name} - ${dataToAdd}GB for ${daysToAdd} days${appliedDiscount ? ` (Discount: ${appliedDiscount.code})` : ''}`
          })
          .select()
          .single();

        if (subscriptionError) {
          console.error('Subscription creation error:', subscriptionError);
          throw new Error('Failed to create subscription record');
        }

        // Redirect to Zarinpal
        const paymentUrl = `https://www.zarinpal.com/pg/StartPay/${authority}`;
        window.location.href = paymentUrl;

      } else {
        throw new Error(contractResponse.data?.error || 'Payment gateway error');
      }

    } catch (error) {
      console.error('Payment error:', error);
      
      // Update debug info with error
      setDebugInfo({
        ...initialDebugInfo,
        payment_status: 'FAILED',
        renewal_request: {
          username,
          plan: selectedPlan?.name,
          data_limit_gb: dataToAdd,
          expire_after_days: daysToAdd,
          api_type: selectedPlan?.apiType,
          payment_amount: totalPrice
        },
        error_details: {
          message: error instanceof Error ? error.message : 'Payment gateway error',
          timestamp: new Date().toISOString(),
          error_type: 'payment_gateway_error'
        }
      });
      
      toast({
        title: language === 'fa' ? 'خطا در پرداخت' : 'Payment Error',
        description: language === 'fa' ? 'خطا در ایجاد پیوند پرداخت' : 'Error creating payment link',
        variant: 'destructive'
      });
      
      setRenewalDebugOpen(true);
    } finally {
      setIsSubmitting(false);
      setLoadingMessage('');
    }
  };

  const progressPercentage = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="bg-white dark:bg-gray-900 shadow-xl border-0">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {language === 'fa' ? 'تمدید اشتراک' : 'Renewal Subscription'}
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
            {language === 'fa' ? 'اشتراک شبکه بدون مرز خود را تمدید کنید' : 'Renew your Boundless Network subscription'}
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
            {/* Step 1: Plan Selection */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plans.map((plan) => (
                    <Card 
                      key={plan.id}
                      className="cursor-pointer transition-all duration-200 hover:shadow-md border-2 hover:border-primary"
                      onClick={() => handlePlanSelect(plan)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {plan.id === 'pro' ? (
                            <Zap className="w-5 h-5 text-orange-500" />
                          ) : (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          )}
                          {plan.name}
                        </CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">
                            {language === 'fa' ? 'مکان‌های سرور' : 'Server Locations'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {getLocationsList(plan.id).map((location, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {location}
                            </Badge>
                          ))}
                        </div>
                        <Button className="w-full">
                          {language === 'fa' ? 'انتخاب پلن' : 'Select Plan'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Username Search */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">
                    {language === 'fa' ? 'جستجوی حساب کاربری' : 'Search User Account'}
                  </h3>
                  <p className="text-muted-foreground">
                    {language === 'fa' ? 'نام کاربری فعلی خود را وارد کنید' : 'Enter your current username'}
                  </p>
                </div>

                <div className="max-w-md mx-auto space-y-4">
                  <div>
                    <Label htmlFor="username" className="text-base font-medium">
                      {language === 'fa' ? 'نام کاربری' : 'Username'}
                    </Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={language === 'fa' ? 'نام کاربری...' : 'Username...'}
                        className="text-lg p-3"
                      />
                      <Button 
                        onClick={searchUser} 
                        disabled={!username.trim() || searchLoading}
                        size="lg"
                        className="px-6"
                      >
                        {searchLoading ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <Search className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: User Info and Renewal Options */}
            {currentStep === 3 && userData && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">
                    {language === 'fa' ? 'اطلاعات حساب و تمدید' : 'Account Info & Renewal'}
                  </h3>
                  <p className="text-muted-foreground">
                    {language === 'fa' ? 'تنظیمات تمدید اشتراک خود را انتخاب کنید' : 'Choose your renewal settings'}
                  </p>
                </div>

                {/* Current User Info */}
                <Card className="bg-muted/30">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      {username}
                      <Badge variant={userData.status === 'active' ? 'default' : 'secondary'}>
                        {userData.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          {language === 'fa' ? 'تاریخ انقضا' : 'Expiry Date'}
                        </Label>
                        <p className="font-medium">{formatExpireDate(userData.expire, userData.expire_date)}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          {language === 'fa' ? 'مصرف داده' : 'Data Usage'}
                        </Label>
                        <p className="font-medium">{formatDataUsage(userData.used_traffic, userData.data_limit)}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          {language === 'fa' ? 'نوع پلن' : 'Plan Type'}
                        </Label>
                        <p className="font-medium">{selectedPlan?.name}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Renewal Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="days" className="flex items-center gap-2 mb-3 text-base font-medium">
                      <Calendar className="w-5 h-5" />
                      {language === 'fa' ? 'روزهای اضافه' : 'Days to Add'}
                    </Label>
                    <Input
                      id="days"
                      type="number"
                      min="1"
                      max="365"
                      value={daysToAdd}
                      onChange={(e) => setDaysToAdd(Number(e.target.value))}
                      className="text-lg p-3"
                    />
                  </div>
                  <div>
                    <Label htmlFor="data" className="flex items-center gap-2 mb-3 text-base font-medium">
                      <Database className="w-5 h-5" />
                      {language === 'fa' ? 'گیگابایت اضافه' : 'GB to Add'}
                    </Label>
                    <Input
                      id="data"
                      type="number"
                      min="1"
                      max="1000"
                      value={dataToAdd}
                      onChange={(e) => setDataToAdd(Number(e.target.value))}
                      className="text-lg p-3"
                    />
                  </div>
                </div>

                {/* Discount Code Field */}
                <DiscountField
                  onDiscountApply={handleDiscountApply}
                  appliedDiscount={appliedDiscount}
                />

                {/* Price Summary */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {appliedDiscount && (
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{language === 'fa' ? 'قیمت اصلی' : 'Original Price'}</span>
                          <span className="line-through">
                            {getOriginalPrice().toLocaleString()} 
                            {language === 'fa' ? ' تومان' : ' Toman'}
                          </span>
                        </div>
                      )}
                      
                      {appliedDiscount && (
                        <div className="flex items-center justify-between text-sm text-green-600">
                          <span>
                            {language === 'fa' ? 'تخفیف' : 'Discount'} ({appliedDiscount.percentage}%)
                          </span>
                          <span>
                            -{calculateDiscount().toLocaleString()} 
                            {language === 'fa' ? ' تومان' : ' Toman'}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t pt-3 text-lg">
                        <span className="font-semibold">
                          {language === 'fa' ? 'مجموع قیمت' : 'Total Price'}
                        </span>
                        <span className="text-2xl font-bold text-primary">
                          {calculateTotalPrice() === 0 ? (
                            language === 'fa' ? 'رایگان' : 'FREE'
                          ) : (
                            `${calculateTotalPrice().toLocaleString()} ${language === 'fa' ? 'تومان' : 'Toman'}`
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Renewal Button */}
                <Button 
                  onClick={handleRenewal} 
                  size="xl" 
                  className="w-full"
                  disabled={isSubmitting}
                  variant="hero-primary"
                >
                  <RefreshCw className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'} ${isSubmitting ? 'animate-spin' : ''}`} />
                  {isSubmitting ? (
                    language === 'fa' ? 'در حال پردازش...' : 'Processing...'
                  ) : calculateTotalPrice() === 0 ? (
                    language === 'fa' ? 'تمدید رایگان' : 'Free Renewal'
                  ) : (
                    language === 'fa' ? 
                      `پرداخت و تمدید - ${calculateTotalPrice().toLocaleString()} تومان` :
                      `Pay & Renew - ${calculateTotalPrice().toLocaleString()} Toman`
                  )}
                </Button>
              </div>
            )}

            {/* Step 4: Success or Debug Info */}
            {currentStep === 4 && (
              <div className="text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {language === 'fa' ? 'تمدید موفق!' : 'Renewal Successful!'}
                </h3>
                <p className="text-muted-foreground">
                  {language === 'fa' ? 
                    'اشتراک شما با موفقیت تمدید شد' : 
                    'Your subscription has been renewed successfully'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          {currentStep >= 2 && currentStep < 4 && (
            <div className="flex justify-between items-center pt-8 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(prev => prev - 1)}
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
                  onClick={() => {
                    if (userData) {
                      setCurrentStep(3);
                    }
                  }}
                  disabled={!userData}
                  className="flex items-center gap-2"
                >
                  {language === 'fa' ? 'بعدی' : 'Next'}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}

              {currentStep === 3 && (
                <div className="w-24" />
              )}
            </div>
          )}

          {/* Debug sections - keep existing debug functionality */}
          {apiResponse && debugMode && (
            <Card className="mt-6 border-orange-200 bg-orange-50 dark:bg-orange-900/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <Bug className="w-5 h-5" />
                  {language === 'fa' ? 'گزارش API' : 'API Debug Log'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Collapsible open={debugOpen} onOpenChange={setDebugOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full flex items-center justify-between">
                      {language === 'fa' ? 'مشاهده پاسخ API' : 'View API Response'}
                      <ChevronDown className={`w-4 h-4 transition-transform ${debugOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <pre className="text-sm overflow-auto">
                        {JSON.stringify(apiResponse, null, 2)}
                      </pre>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          )}

          {debugInfo && (debugMode || renewalDebugOpen) && (
            <Card className="mt-6 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <Code2 className="w-5 h-5" />
                  {language === 'fa' ? 'گزارش عملیات تمدید' : 'Renewal Debug Log'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Collapsible open={renewalDebugOpen} onOpenChange={setRenewalDebugOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full flex items-center justify-between">
                      {language === 'fa' ? 'مشاهده جزئیات کامل' : 'View Full Details'}
                      <ChevronDown className={`w-4 h-4 transition-transform ${renewalDebugOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <pre className="text-sm overflow-auto">
                        {JSON.stringify(debugInfo, null, 2)}
                      </pre>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6">
            <CardContent className="flex items-center gap-3 pt-0">
              <Loader className="w-6 h-6 animate-spin" />
              <span className="text-lg font-medium">{loadingMessage}</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error State */}
      {apiResponse?.error && currentStep === 2 && (
        <Card className="mt-6 border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600 dark:text-red-400">
              {language === 'fa' ? 'کاربر پیدا نشد یا خطا در اتصال به سرور' : 'User not found or server connection error'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StepByStepRenewalForm;
