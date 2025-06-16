
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle, Gift, Shield, Zap, Loader, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MarzneshinApiService } from '@/services/marzneshinApi';
import FreeTrialResult from './FreeTrialResult';

interface TrialPlan {
  id: 'lite' | 'pro';
  name: string;
  nameEn: string;
  nameFa: string;
  description: string;
  descriptionEn: string;
  descriptionFa: string;
  features: string[];
  featuresEn: string[];
  featuresFa: string[];
  servers: string[];
  serversEn: string[];
  serversFa: string[];
  apiType: 'marzban' | 'marzneshin';
  icon: React.ComponentType<any>;
}

interface TrialResult {
  username: string;
  subscription_url: string;
  expire: number;
  data_limit: number;
  plan: TrialPlan;
}

const ModernFreeTrialForm = () => {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [isCreatingTrial, setIsCreatingTrial] = useState(false);
  const [trialResult, setTrialResult] = useState<TrialResult | null>(null);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);

  const isRTL = language === 'fa';

  const trialPlans: TrialPlan[] = [
    {
      id: 'lite',
      name: 'Boundless Network Lite Trial',
      nameEn: 'Boundless Network Lite Trial',
      nameFa: 'آزمایش شبکه بدون مرز لایت',
      description: 'Moderate speed, limited servers',
      descriptionEn: 'Moderate speed, limited servers',
      descriptionFa: 'سرعت متوسط، سرورهای محدود',
      features: ['1 Day Access', '1 GB Data', 'Moderate Speed', 'Basic Support'],
      featuresEn: ['1 Day Access', '1 GB Data', 'Moderate Speed', 'Basic Support'],
      featuresFa: ['۱ روز دسترسی', '۱ گیگابایت حجم', 'سرعت متوسط', 'پشتیبانی پایه'],
      servers: ['Germany', 'Finland', 'Netherlands'],
      serversEn: ['Germany', 'Finland', 'Netherlands'],
      serversFa: ['آلمان', 'فنلاند', 'هلند'],
      apiType: 'marzban',
      icon: Shield
    },
    {
      id: 'pro',
      name: 'Boundless Network Pro Trial',
      nameEn: 'Boundless Network Pro Trial',
      nameFa: 'آزمایش شبکه بدون مرز پرو',
      description: 'High performance, full server list',
      descriptionEn: 'High performance, full server list',
      descriptionFa: 'کارایی بالا، لیست کامل سرورها',
      features: ['1 Day Access', '1 GB Data', 'High Speed', 'Priority Support'],
      featuresEn: ['1 Day Access', '1 GB Data', 'High Speed', 'Priority Support'],
      featuresFa: ['۱ روز دسترسی', '۱ گیگابایت حجم', 'سرعت بالا', 'پشتیبانی اولویت‌دار'],
      servers: ['Germany', 'Netherlands', 'Turkey', 'UK', 'US', 'Poland', 'Finland'],
      serversEn: ['Germany', 'Netherlands', 'Turkey', 'UK', 'US', 'Poland', 'Finland'],
      serversFa: ['آلمان', 'هلند', 'ترکیه', 'انگلیس', 'آمریکا', 'لهستان', 'فنلاند'],
      apiType: 'marzneshin',
      icon: Zap
    }
  ];

  // Check if user has already used trial today
  const checkTrialUsage = (): boolean => {
    const lastTrialDate = localStorage.getItem('lastTrialDate');
    const today = new Date().toDateString();
    
    if (lastTrialDate === today) {
      setHasUsedTrial(true);
      return true;
    }
    
    setHasUsedTrial(false);
    return false;
  };

  // Generate username for trial
  const generateTrialUsername = (): string => {
    const prefix = 'trial_';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5);
    return `${prefix}${timestamp}_${random}`;
  };

  // Create Marzban trial user
  const createMarzbanTrial = async (): Promise<TrialResult> => {
    const username = generateTrialUsername();
    const FIXED_UUID = '70f64bea-a84c-4feb-ac0e-fb796657790f';
    const MARZBAN_INBOUND_TAGS = ['VLESSTCP', 'Israel', 'fanland', 'USAC', 'info_protocol', 'Dubai'];

    try {
      // Get token
      const tokenResponse = await fetch('https://file.shopifysb.xyz:8000/api/admin/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: 'bnets',
          password: 'reza1234',
          grant_type: 'password'
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to authenticate with Marzban API');
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Create user with 1 day expiry and 1GB limit
      const expireTimestamp = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 1 day
      const dataLimitBytes = 1 * 1073741824; // 1GB

      const userData = {
        username: username,
        status: 'active',
        expire: expireTimestamp,
        data_limit: dataLimitBytes,
        data_limit_reset_strategy: 'no_reset',
        inbounds: {
          vless: MARZBAN_INBOUND_TAGS
        },
        proxies: {
          vless: {
            id: FIXED_UUID
          }
        },
        note: 'Free Trial - 1 Day / 1GB',
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
        throw new Error(errorData.detail || 'Failed to create trial user');
      }

      const responseData = await userResponse.json();
      return {
        username: responseData.username,
        subscription_url: responseData.subscription_url,
        expire: responseData.expire,
        data_limit: responseData.data_limit,
        plan: trialPlans[0] // Lite plan
      };
    } catch (error) {
      console.error('Marzban trial creation error:', error);
      throw error;
    }
  };

  // Create Marzneshin trial user
  const createMarzneshinTrial = async (): Promise<TrialResult> => {
    const username = generateTrialUsername();

    try {
      const result = await MarzneshinApiService.createUser({
        username: username,
        dataLimitGB: 1, // 1GB
        durationDays: 1, // 1 day
        notes: 'Free Trial - 1 Day / 1GB'
      });

      return {
        username: result.username,
        subscription_url: result.subscription_url,
        expire: result.expire || Math.floor(Date.now() / 1000) + (24 * 60 * 60),
        data_limit: result.data_limit,
        plan: trialPlans[1] // Pro plan
      };
    } catch (error) {
      console.error('Marzneshin trial creation error:', error);
      throw error;
    }
  };

  // Handle plan selection and trial creation
  const handlePlanSelect = async (planId: string) => {
    const plan = trialPlans.find(p => p.id === planId);
    if (!plan) return;

    if (checkTrialUsage()) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'شما امروز از آزمایش رایگان استفاده کرده‌اید' : 
          "You've already claimed a trial today",
        variant: 'destructive'
      });
      return;
    }

    setIsCreatingTrial(true);

    try {
      let result: TrialResult;

      if (plan.apiType === 'marzban') {
        result = await createMarzbanTrial();
      } else {
        result = await createMarzneshinTrial();
      }

      // Mark trial as used today
      localStorage.setItem('lastTrialDate', new Date().toDateString());
      setHasUsedTrial(true);
      setTrialResult(result);
      
      toast({
        title: language === 'fa' ? 'موفق' : 'Success',
        description: language === 'fa' ? 
          'آزمایش رایگان شما ایجاد شد!' : 
          'Your free trial has been created!',
      });

    } catch (error) {
      console.error('Trial creation error:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: error instanceof Error ? error.message : (
          language === 'fa' ? 
            'خطا در ایجاد آزمایش رایگان' : 
            'Failed to create free trial'
        ),
        variant: 'destructive'
      });
    } finally {
      setIsCreatingTrial(false);
    }
  };

  // Initialize trial usage check
  useState(() => {
    checkTrialUsage();
  });

  if (trialResult) {
    return <FreeTrialResult result={trialResult} onClose={() => setTrialResult(null)} />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <div className="inline-flex items-center rounded-full px-4 py-2 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 backdrop-blur-sm mb-6">
          <Gift className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            {language === 'fa' ? '🎁 آزمایش رایگان' : '🎁 Free Trial'}
          </span>
        </div>
        
        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
          {t('trial.title')}
        </h2>
        <p className="text-xl text-muted-foreground mb-4">
          {t('trial.subtitle')}
        </p>
        <p className="text-muted-foreground">
          {language === 'fa' ? 
            'هیچ کارت اعتباری نیاز نیست • فوری فعال می‌شود • بدون تعهد' : 
            'No credit card required • Instant activation • No commitment'
          }
        </p>
      </div>

      {isCreatingTrial ? (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader className="w-8 h-8 animate-spin text-primary" />
            <p className="text-center font-medium">
              {language === 'fa' ? 'در حال ایجاد آزمایش رایگان...' : 'Creating your free trial...'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-2">{t('trial.select-plan')}</h3>
            <p className="text-muted-foreground">
              {language === 'fa' ? 'نوع آزمایش رایگان خود را انتخاب کنید' : 'Choose your free trial type'}
            </p>
          </div>
          
          <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan} className="space-y-4">
            {trialPlans.map((plan) => {
              const IconComponent = plan.icon;
              return (
                <div key={plan.id} className="relative">
                  <RadioGroupItem value={plan.id} id={plan.id} className="sr-only" />
                  <Label
                    htmlFor={plan.id}
                    className={`block cursor-pointer rounded-xl border-2 p-6 transition-all hover:border-primary ${
                      selectedPlan === plan.id ? 'border-primary bg-primary/5' : 'border-border'
                    } ${hasUsedTrial ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <IconComponent className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">
                            {language === 'fa' ? plan.nameFa : plan.nameEn}
                          </h4>
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            {language === 'fa' ? 'رایگان' : 'FREE'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {language === 'fa' ? plan.descriptionFa : plan.descriptionEn}
                        </p>
                        <div className="space-y-1 mb-3">
                          {(language === 'fa' ? plan.featuresFa : plan.featuresEn).map((feature, idx) => (
                            <div key={idx} className="flex items-center text-sm">
                              <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                              {feature}
                            </div>
                          ))}
                        </div>
                        <div className="text-sm">
                          <div className="font-medium mb-1">
                            {language === 'fa' ? 'سرورهای موجود:' : 'Available Servers:'}
                          </div>
                          <div className="text-muted-foreground">
                            {(language === 'fa' ? plan.serversFa : plan.serversEn).join(', ')}
                          </div>
                        </div>
                        
                        {!hasUsedTrial && (
                          <Button 
                            onClick={() => handlePlanSelect(plan.id)}
                            className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
                            disabled={isCreatingTrial}
                          >
                            <Gift className="w-4 h-4 mr-2" />
                            {language === 'fa' ? 'انتخاب و شروع آزمایش' : 'Select & Start Trial'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>

          {hasUsedTrial && (
            <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                  <AlertCircle className="w-5 h-5" />
                  <p className="font-medium">
                    {language === 'fa' ? 
                      'شما امروز از آزمایش رایگان استفاده کرده‌اید. فردا دوباره امتحان کنید.' : 
                      "You've already claimed your free trial today. Try again tomorrow."
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default ModernFreeTrialForm;
