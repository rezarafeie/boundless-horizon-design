
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, ChevronDown, CheckCircle, Zap, User, Calendar, Database, RefreshCw, Bug, Globe, Loader } from 'lucide-react';
import { SubscriptionPlan, DiscountCode } from '@/types/subscription';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DiscountField from '@/components/DiscountField';

interface UserData {
  username: string;
  data_limit: number;
  data_limit_reset_strategy: string;
  expire: number | null;
  status: string;
  used_traffic: number;
  id?: number; // For Marzneshin
}

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

  // Merchant ID for Zarinpal
  const MERCHANT_ID = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

  const plans: SubscriptionPlan[] = [
    {
      id: 'lite',
      name: language === 'fa' ? 'شبکه بدون مرز لایت' : 'Boundless Network Lite',
      description: language === 'fa' ? 
        'اتصال پایه با آلمان، فنلاند، هلند - مناسب برای کاربری روزمره' : 
        'Basic connection with Germany, Finland, Netherlands - suitable for daily use',
      pricePerGB: 3200,
      apiType: 'marzban'
    },
    {
      id: 'pro',
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

  const formatExpireDate = (timestamp: number | null) => {
    if (!timestamp) return language === 'fa' ? 'نامحدود' : 'Unlimited';
    return new Date(timestamp * 1000).toLocaleDateString();
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
    
    // Handle free renewal (100% discount)
    if (totalPrice === 0) {
      setIsSubmitting(true);
      setLoadingMessage(language === 'fa' ? 'در حال پردازش تمدید رایگان...' : 'Processing free renewal...');
      
      try {
        // Process free renewal directly
        console.log('Processing free renewal:', {
          username,
          plan: selectedPlan,
          daysToAdd,
          dataToAdd,
          totalPrice: 0,
          discount: appliedDiscount
        });

        toast({
          title: language === 'fa' ? 'موفقیت' : 'Success',
          description: language === 'fa' ? 'تمدید رایگان با موفقیت انجام شد!' : 'Free renewal completed successfully!',
        });

        setCurrentStep(4);
      } catch (error) {
        console.error('Free renewal error:', error);
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: language === 'fa' ? 'خطا در پردازش تمدید رایگان' : 'Error processing free renewal',
          variant: 'destructive'
        });
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
      toast({
        title: language === 'fa' ? 'خطا در پرداخت' : 'Payment Error',
        description: language === 'fa' ? 'خطا در ایجاد پیوند پرداخت' : 'Error creating payment link',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
      setLoadingMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-12 px-4">
      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg flex items-center gap-3">
            <Loader className="w-6 h-6 animate-spin" />
            <span className="text-lg font-medium">{loadingMessage}</span>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            {language === 'fa' ? 'تمدید اشتراک' : 'Renewal Subscription'}
          </h1>
          <p className="text-xl text-muted-foreground">
            {language === 'fa' ? 'اشتراک شبکه بدون مرز خود را تمدید کنید' : 'Renew your Boundless Network subscription'}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className={`flex items-center ${step < 4 ? (isRTL ? 'ml-4' : 'mr-4') : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`w-12 h-0.5 ${currentStep > step ? 'bg-primary' : 'bg-muted'} ${isRTL ? 'mr-2' : 'ml-2'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Plan Selection */}
        {currentStep >= 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className={`w-5 h-5 ${currentStep > 1 ? 'text-green-500' : 'text-primary'}`} />
                {language === 'fa' ? 'انتخاب پلن' : 'Select Plan'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentStep === 1 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plans.map((plan) => (
                    <Card 
                      key={plan.id}
                      className="cursor-pointer transition-all duration-200 hover:shadow-md"
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
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{selectedPlan?.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedPlan?.description}</p>
                  </div>
                  <Badge variant="default">
                    {language === 'fa' ? 'انتخاب شده' : 'Selected'}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Username Search */}
        {currentStep >= 2 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className={`w-5 h-5 ${currentStep > 2 ? 'text-green-500' : 'text-primary'}`} />
                {language === 'fa' ? 'جستجوی کاربر' : 'User Search'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentStep === 2 ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="username">
                      {language === 'fa' ? 'نام کاربری فعلی شما' : 'Your Current Username'}
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={language === 'fa' ? 'نام کاربری...' : 'Username...'}
                      />
                      <Button onClick={searchUser} disabled={!username.trim() || searchLoading}>
                        {searchLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                        {language === 'fa' ? 'جستجو' : 'Search'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{username}</p>
                    <p className="text-sm text-muted-foreground">
                      {language === 'fa' ? 'کاربر پیدا شد' : 'User found'}
                    </p>
                  </div>
                  <Badge variant="default" className="text-green-600 border-green-600">
                    {language === 'fa' ? 'تایید شده' : 'Verified'}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Debug Log Card */}
        {apiResponse && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="w-5 h-5 text-orange-500" />
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

        {/* Step 4: User Info and Renewal Options */}
        {userData && currentStep >= 3 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary" />
                {language === 'fa' ? 'اطلاعات فعلی و تمدید' : 'Current Info & Renewal'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current User Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-sm text-muted-foreground">
                    {language === 'fa' ? 'تاریخ انقضا' : 'Expiry Date'}
                  </Label>
                  <p className="font-medium">{formatExpireDate(userData.expire)}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    {language === 'fa' ? 'مصرف داده' : 'Data Usage'}
                  </Label>
                  <p className="font-medium">{formatDataUsage(userData.used_traffic, userData.data_limit)}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    {language === 'fa' ? 'وضعیت' : 'Status'}
                  </Label>
                  <Badge variant={userData.status === 'active' ? 'default' : 'secondary'}>
                    {userData.status}
                  </Badge>
                </div>
              </div>

              {/* Renewal Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="days" className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4" />
                    {language === 'fa' ? 'روزهای اضافه' : 'Days to Add'}
                  </Label>
                  <Input
                    id="days"
                    type="number"
                    min="1"
                    max="365"
                    value={daysToAdd}
                    onChange={(e) => setDaysToAdd(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="data" className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4" />
                    {language === 'fa' ? 'گیگابایت اضافه' : 'GB to Add'}
                  </Label>
                  <Input
                    id="data"
                    type="number"
                    min="1"
                    max="1000"
                    value={dataToAdd}
                    onChange={(e) => setDataToAdd(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Discount Code Field */}
              <DiscountField
                onDiscountApply={handleDiscountApply}
                appliedDiscount={appliedDiscount}
              />

              {/* Price Summary */}
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="space-y-2">
                  {appliedDiscount && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {language === 'fa' ? 'قیمت اصلی' : 'Original Price'}
                      </span>
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

                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="font-medium">
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
                
                <p className="text-sm text-muted-foreground mt-2">
                  {dataToAdd} GB × {selectedPlan?.pricePerGB.toLocaleString()} 
                  {language === 'fa' ? ' تومان' : ' Toman'}
                </p>
              </div>

              {/* Renewal Button */}
              <Button 
                onClick={handleRenewal} 
                size="lg" 
                className="w-full"
                disabled={isSubmitting}
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
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {apiResponse?.error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <CardContent className="pt-6">
              <p className="text-red-600 dark:text-red-400 text-center">
                {language === 'fa' ? 'کاربر پیدا نشد یا خطا در اتصال به سرور' : 'User not found or server connection error'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StepByStepRenewalForm;
