
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, User, Settings, CreditCard, Shield, Zap, Globe, Server, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MarzneshinApiService } from '@/services/marzneshinApi';

interface SubscriptionPlan {
  id: 'lite' | 'pro';
  name: string;
  nameEn: string;
  nameFa: string;
  description: string;
  descriptionEn: string;
  descriptionFa: string;
  pricePerGB: number;
  apiType: 'marzban' | 'marzneshin';
  icon: React.ComponentType<any>;
  features: string[];
  featuresEn: string[];
  featuresFa: string[];
  servers: string[];
  serversEn: string[];
  serversFa: string[];
}

interface FormData {
  selectedPlan: SubscriptionPlan | null;
  username: string;
  mobile: string;
  email: string;
  dataLimit: number;
  duration: number;
  notes: string;
  isTrial: boolean;
}

interface SubscriptionResult {
  username: string;
  subscription_url: string;
  expire: number;
  data_limit: number;
}

const SubscriptionSteps = ({ mode = 'paid' }: { mode?: 'paid' | 'trial' }) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubscriptionResult | null>(null);
  const [formData, setFormData] = useState<FormData>({
    selectedPlan: null,
    username: '',
    mobile: '',
    email: '',
    dataLimit: mode === 'trial' ? 1 : 10,
    duration: mode === 'trial' ? 1 : 30,
    notes: '',
    isTrial: mode === 'trial'
  });

  const plans: SubscriptionPlan[] = [
    {
      id: 'lite',
      name: 'شبکه بدون مرز لایت',
      nameEn: 'Bedoon Marz Lite',
      nameFa: 'شبکه بدون مرز لایت',
      description: 'Lightweight access with basic connections and limited locations',
      descriptionEn: 'Lightweight access with basic connections and limited locations',
      descriptionFa: 'دسترسی سبک با اتصالات پایه و مکان‌های محدود',
      pricePerGB: mode === 'trial' ? 0 : 2500,
      apiType: 'marzban',
      icon: Shield,
      features: ['Moderate speed', 'Limited server locations', 'Basic browsing support'],
      featuresEn: ['Moderate speed', 'Limited server locations', 'Basic browsing support'],
      featuresFa: ['سرعت متوسط', 'مکان‌های محدود سرور', 'پشتیبانی مرور پایه'],
      servers: ['Germany', 'Finland', 'Netherlands'],
      serversEn: ['Germany', 'Finland', 'Netherlands'],
      serversFa: ['آلمان', 'فنلاند', 'هلند']
    },
    {
      id: 'pro',
      name: 'شبکه بدون مرز پرو',
      nameEn: 'Bedoon Marz Pro',
      nameFa: 'شبکه بدون مرز پرو',
      description: 'Premium connection with full global access and highest performance',
      descriptionEn: 'Premium connection with full global access and highest performance',
      descriptionFa: 'اتصال پریمیوم با دسترسی جهانی کامل و بالاترین کارایی',
      pricePerGB: mode === 'trial' ? 0 : 4000,
      apiType: 'marzneshin',
      icon: Zap,
      features: ['High-speed connections', 'Full location access', 'Optimized for streaming & gaming'],
      featuresEn: ['High-speed connections', 'Full location access', 'Optimized for streaming & gaming'],
      featuresFa: ['اتصالات پرسرعت', 'دسترسی کامل مکان‌ها', 'بهینه برای استریم و بازی'],
      servers: ['Germany', 'Netherlands', 'Turkey', 'UK', 'US', 'Poland', 'Finland'],
      serversEn: ['Germany', 'Netherlands', 'Turkey', 'UK', 'US', 'Poland', 'Finland'],
      serversFa: ['آلمان', 'هلند', 'ترکیه', 'انگلستان', 'آمریکا', 'لهستان', 'فنلاند']
    }
  ];

  const totalSteps = mode === 'trial' ? 2 : 3;
  const progress = (currentStep / totalSteps) * 100;

  const generateUsername = () => {
    const prefix = mode === 'trial' ? 'trial_' : 'user_';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5);
    return `${prefix}${timestamp}_${random}`;
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateStep = () => {
    if (currentStep === 1 && !formData.selectedPlan) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'لطفاً یک پلن انتخاب کنید' : 'Please select a plan',
        variant: 'destructive'
      });
      return false;
    }

    if (currentStep === 2) {
      if (!formData.username || !formData.mobile) {
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: language === 'fa' ? 'لطفاً فیلدهای ضروری را پر کنید' : 'Please fill required fields',
          variant: 'destructive'
        });
        return false;
      }
    }

    return true;
  };

  const createMarzbanUser = async (): Promise<SubscriptionResult> => {
    const username = formData.username || generateUsername();
    const FIXED_UUID = '70f64bea-a84c-4feb-ac0e-fb796657790f';
    const MARZBAN_INBOUND_TAGS = ['VLESSTCP', 'Israel', 'fanland', 'USAC', 'info_protocol', 'Dubai'];

    try {
      const tokenResponse = await fetch('https://file.shopifysb.xyz:8000/api/admin/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          username: 'bnets',
          password: 'reza1234',
          grant_type: 'password'
        })
      });

      if (!tokenResponse.ok) throw new Error('Authentication failed');
      
      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      const expireTimestamp = Math.floor(Date.now() / 1000) + (formData.duration * 86400);
      const dataLimitBytes = formData.dataLimit * 1073741824;

      const userData = {
        username: username,
        status: 'active',
        expire: expireTimestamp,
        data_limit: dataLimitBytes,
        data_limit_reset_strategy: 'no_reset',
        inbounds: { vless: MARZBAN_INBOUND_TAGS },
        proxies: { vless: { id: FIXED_UUID } },
        note: `${mode === 'trial' ? 'Free Trial' : 'Subscription'} - ${formData.notes} - Mobile: ${formData.mobile}`,
        next_plan: {
          add_remaining_traffic: false,
          data_limit: 0,
          expire: 0,
          fire_on_either: true
        }
      };

      const userResponse = await fetch('https://file.shopifysb.xyz:8000/api/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(userData)
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        throw new Error(errorData.detail || 'Failed to create user');
      }

      const responseData = await userResponse.json();
      return {
        username: responseData.username,
        subscription_url: responseData.subscription_url,
        expire: responseData.expire,
        data_limit: responseData.data_limit
      };
    } catch (error) {
      console.error('Marzban API Error:', error);
      throw error;
    }
  };

  const createMarzneshinUser = async (): Promise<SubscriptionResult> => {
    try {
      const result = await MarzneshinApiService.createUser({
        username: formData.username || generateUsername(),
        dataLimitGB: formData.dataLimit,
        durationDays: formData.duration,
        notes: `${mode === 'trial' ? 'Free Trial' : 'Subscription'} - ${formData.notes}`
      });

      return {
        username: result.username,
        subscription_url: result.subscription_url,
        expire: result.expire || Math.floor(Date.now() / 1000) + (formData.duration * 86400),
        data_limit: result.data_limit
      };
    } catch (error) {
      console.error('Marzneshin API Error:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    // Check trial usage limit
    if (mode === 'trial') {
      const lastTrialDate = localStorage.getItem('lastTrialDate');
      const today = new Date().toDateString();
      
      if (lastTrialDate === today) {
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: language === 'fa' ? 
            'شما امروز از آزمایش رایگان استفاده کرده‌اید' : 
            "You've already claimed a trial today",
          variant: 'destructive'
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let result: SubscriptionResult;

      if (formData.selectedPlan?.apiType === 'marzneshin') {
        result = await createMarzneshinUser();
      } else {
        result = await createMarzbanUser();
      }

      if (mode === 'trial') {
        localStorage.setItem('lastTrialDate', new Date().toDateString());
      }

      setResult(result);
      setCurrentStep(totalSteps + 1); // Success step

      toast({
        title: language === 'fa' ? 'موفق' : 'Success',
        description: language === 'fa' ? 
          'اشتراک شما با موفقیت ایجاد شد' : 
          'Your subscription has been created successfully',
      });

    } catch (error) {
      console.error('Subscription creation error:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: error instanceof Error ? error.message : (
          language === 'fa' ? 
            'خطا در ایجاد اشتراک' : 
            'Failed to create subscription'
        ),
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: language === 'fa' ? 'کپی شد' : 'Copied',
      description: language === 'fa' ? 
        'لینک اشتراک کپی شد' : 
        'Subscription link copied to clipboard',
    });
  };

  // Success Step
  if (currentStep === totalSteps + 1 && result) {
    return (
      <Card className="max-w-2xl mx-auto bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl text-green-800 dark:text-green-200">
            {language === 'fa' ? '🎉 شبکه بدون مرز آماده است!' : '🎉 Bedoon Marz Ready!'}
          </CardTitle>
          <CardDescription className="text-green-600 dark:text-green-400 text-lg">
            {language === 'fa' ? 
              `پیکربندی ${formData.selectedPlan?.nameFa} شما ایجاد شد` : 
              `Your ${formData.selectedPlan?.nameEn} configuration is ready`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <Label className="text-gray-600 dark:text-gray-400">
                {language === 'fa' ? 'نام کاربری' : 'Username'}
              </Label>
              <p className="font-mono text-lg font-bold">{result.username}</p>
            </div>
            <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <Label className="text-gray-600 dark:text-gray-400">
                {language === 'fa' ? 'تاریخ انقضا' : 'Expiry Date'}
              </Label>
              <p className="font-bold">{new Date(result.expire * 1000).toLocaleDateString()}</p>
            </div>
            <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <Label className="text-gray-600 dark:text-gray-400">
                {language === 'fa' ? 'حجم' : 'Volume'}
              </Label>
              <p className="font-bold">{Math.round(result.data_limit / 1073741824)} GB</p>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'fa' ? 'لینک پیکربندی' : 'Configuration Link'}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(result.subscription_url)}
              >
                {language === 'fa' ? 'کپی' : 'Copy'}
              </Button>
            </div>
            <code className="text-xs break-all text-gray-800 dark:text-gray-200 block p-2 bg-white dark:bg-gray-900 rounded">
              {result.subscription_url}
            </code>
          </div>

          <div className="flex justify-center pt-4">
            <Button onClick={() => window.open('https://t.me/getbnbot', '_blank')} size="lg">
              {language === 'fa' ? 'دریافت پشتیبانی' : 'Get Support'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          {mode === 'trial' ? (
            language === 'fa' ? 'دریافت آزمایش رایگان' : 'Get Free Trial'
          ) : (
            language === 'fa' ? 'خرید اشتراک شبکه بدون مرز' : 'Purchase Bedoon Marz Subscription'
          )}
        </CardTitle>
        <CardDescription className="text-center">
          {language === 'fa' ? `مرحله ${currentStep} از ${totalSteps}` : `Step ${currentStep} of ${totalSteps}`}
        </CardDescription>
        <Progress value={progress} className="mt-4" />
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: Plan Selection */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">
              {language === 'fa' ? 'انتخاب پلن' : 'Choose Your Plan'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map((plan) => {
                const IconComponent = plan.icon;
                const isSelected = formData.selectedPlan?.id === plan.id;
                
                return (
                  <Card 
                    key={plan.id}
                    className={`cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-primary shadow-lg scale-105' 
                        : 'hover:shadow-md hover:scale-102'
                    }`}
                    onClick={() => handleInputChange('selectedPlan', plan)}
                  >
                    <CardHeader className="text-center pb-2">
                      <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                        <IconComponent className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg">
                        {language === 'fa' ? plan.nameFa : plan.nameEn}
                      </CardTitle>
                      <CardDescription>
                        {language === 'fa' ? plan.descriptionFa : plan.descriptionEn}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">
                            {language === 'fa' ? 'ویژگی‌ها:' : 'Features:'}
                          </Label>
                          <ul className="text-sm space-y-1 mt-1">
                            {(language === 'fa' ? plan.featuresFa : plan.featuresEn).map((feature, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <Check className="w-3 h-3 text-green-600" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">
                            {language === 'fa' ? 'سرورهای موجود:' : 'Available Servers:'}
                          </Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(language === 'fa' ? plan.serversFa : plan.serversEn).map((server, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {server}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {mode === 'paid' && (
                          <div className="text-center pt-2">
                            <Badge variant="secondary" className="text-lg">
                              {plan.pricePerGB.toLocaleString()} 
                              {language === 'fa' ? ' تومان/گیگ' : ' Toman/GB'}
                            </Badge>
                          </div>
                        )}

                        {isSelected && (
                          <div className="flex items-center justify-center pt-2">
                            <CheckCircle className="w-6 h-6 text-primary" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: User Information */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {language === 'fa' ? 'اطلاعات کاربری' : 'User Information'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">
                  {language === 'fa' ? 'نام کاربری' : 'Username'} *
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value.toLowerCase())}
                    placeholder={language === 'fa' ? 'نام کاربری' : 'Username'}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleInputChange('username', generateUsername())}
                  >
                    {language === 'fa' ? 'تولید' : 'Generate'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile">
                  {language === 'fa' ? 'شماره موبایل' : 'Mobile Number'} *
                </Label>
                <Input
                  id="mobile"
                  value={formData.mobile}
                  onChange={(e) => handleInputChange('mobile', e.target.value)}
                  placeholder="09123456789"
                />
              </div>
            </div>

            {mode === 'paid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataLimit">
                    {language === 'fa' ? 'حجم داده (گیگابایت)' : 'Data Volume (GB)'}
                  </Label>
                  <Input
                    id="dataLimit"
                    type="number"
                    min="1"
                    max="500"
                    value={formData.dataLimit}
                    onChange={(e) => handleInputChange('dataLimit', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">
                    {language === 'fa' ? 'مدت زمان (روز)' : 'Duration (Days)'}
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    max="180"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">
                {language === 'fa' ? 'یادداشت (اختیاری)' : 'Notes (Optional)'}
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder={language === 'fa' ? 'توضیحات اضافی' : 'Additional notes'}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Step 3: Confirmation (Paid only) */}
        {currentStep === 3 && mode === 'paid' && formData.selectedPlan && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              {language === 'fa' ? 'تأیید و پرداخت' : 'Confirm & Payment'}
            </h3>
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">
                {language === 'fa' ? 'خلاصه سفارش' : 'Order Summary'}
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{language === 'fa' ? 'پلن:' : 'Plan:'}</span>
                  <span className="font-medium">
                    {language === 'fa' ? formData.selectedPlan.nameFa : formData.selectedPlan.nameEn}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{language === 'fa' ? 'حجم:' : 'Volume:'}</span>
                  <span className="font-medium">{formData.dataLimit} GB</span>
                </div>
                <div className="flex justify-between">
                  <span>{language === 'fa' ? 'مدت زمان:' : 'Duration:'}</span>
                  <span className="font-medium">
                    {formData.duration} {language === 'fa' ? 'روز' : 'days'}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold text-blue-800 dark:text-blue-200 pt-2 border-t">
                  <span>{language === 'fa' ? 'مجموع:' : 'Total:'}</span>
                  <span>
                    {(formData.dataLimit * formData.selectedPlan.pricePerGB).toLocaleString()}
                    {language === 'fa' ? ' تومان' : ' Toman'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            {language === 'fa' ? 'قبلی' : 'Previous'}
          </Button>

          {currentStep < totalSteps ? (
            <Button onClick={() => { if (validateStep()) nextStep(); }}>
              {language === 'fa' ? 'بعدی' : 'Next'}
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="min-w-32"
            >
              {isSubmitting ? (
                language === 'fa' ? 'در حال پردازش...' : 'Processing...'
              ) : mode === 'trial' ? (
                language === 'fa' ? 'دریافت آزمایش رایگان' : 'Get Free Trial'
              ) : (
                language === 'fa' ? 'پرداخت و ایجاد' : 'Pay & Create'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionSteps;
