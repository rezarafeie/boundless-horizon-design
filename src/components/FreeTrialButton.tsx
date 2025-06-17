
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, Zap, Shield, CheckCircle, AlertCircle, Loader } from 'lucide-react';
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

const FreeTrialButton = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatingTrial, setIsCreatingTrial] = useState(false);
  const [trialResult, setTrialResult] = useState<TrialResult | null>(null);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);

  const trialPlans: TrialPlan[] = [
    {
      id: 'lite',
      name: 'Boundless Network Lite',
      nameEn: 'Boundless Network Lite',
      nameFa: 'شبکه بدون مرز لایت',
      description: 'Lower speed, limited servers',
      descriptionEn: 'Lower speed, limited servers',
      descriptionFa: 'سرعت کمتر، سرورهای محدود',
      apiType: 'marzban',
      icon: Shield
    },
    {
      id: 'pro',
      name: 'Boundless Network Pro',
      nameEn: 'Boundless Network Pro',
      nameFa: 'شبکه بدون مرز پرو',
      description: 'High performance, full server list',
      descriptionEn: 'High performance, full server list',
      descriptionFa: 'کارایی بالا، لیست کامل سرورها',
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
  const handlePlanSelect = async (plan: TrialPlan) => {
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
    // Transform TrialResult to match FreeTrialResult component props
    const freeTrialResultData = {
      username: trialResult.username,
      subscription_url: trialResult.subscription_url,
      planName: language === 'fa' ? trialResult.plan.nameFa : trialResult.plan.nameEn,
      apiType: trialResult.plan.apiType,
      dataLimit: 1, // 1GB for free trial
      duration: 1 // 1 day for free trial
    };

    return (
      <div className="space-y-4">
        <FreeTrialResult result={freeTrialResultData} />
        <Button 
          onClick={() => setTrialResult(null)}
          className="w-full"
        >
          {language === 'fa' ? 'بستن' : 'Close'}
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogTrigger asChild>
        <Button 
          size="xl"
          className="w-full group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 font-semibold"
          disabled={hasUsedTrial}
        >
          <Gift className={`w-4 h-4 group-hover:rotate-12 transition-transform duration-200 ${language === 'fa' ? 'ml-2' : 'mr-2'}`} />
          {hasUsedTrial ? (
            language === 'fa' ? 'امروز استفاده شده' : "Used Today"
          ) : (
            language === 'fa' ? 'دریافت آزمایش رایگان' : 'Get Free Trial'
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            {language === 'fa' ? 'آزمایش رایگان خود را دریافت کنید - انتخاب پلن' : 'Claim Your Free Trial – Choose Plan'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {language === 'fa' ? 
              '۱ روز رایگان با ۱ گیگابایت حجم داده' : 
              '1 free day with 1 GB data volume'
            }
          </DialogDescription>
        </DialogHeader>

        {isCreatingTrial ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader className="w-8 h-8 animate-spin text-primary" />
            <p className="text-center font-medium">
              {language === 'fa' ? 'در حال ایجاد آزمایش رایگان...' : 'Creating your free trial...'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {trialPlans.map((plan) => {
              const IconComponent = plan.icon;
              return (
                <Card 
                  key={plan.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                  onClick={() => handlePlanSelect(plan)}
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
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{language === 'fa' ? 'مدت زمان:' : 'Duration:'}</span>
                        <Badge variant="secondary">
                          {language === 'fa' ? '۱ روز' : '1 Day'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>{language === 'fa' ? 'حجم داده:' : 'Data Volume:'}</span>
                        <Badge variant="secondary">
                          {language === 'fa' ? '۱ گیگابایت' : '1 GB'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-center pt-2">
                        <Button size="sm" className="w-full">
                          {language === 'fa' ? 'انتخاب این پلن' : 'Select This Plan'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {hasUsedTrial && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">
                {language === 'fa' ? 
                  'شما امروز از آزمایش رایگان استفاده کرده‌اید. فردا دوباره امتحان کنید.' : 
                  "You've already claimed your free trial today. Try again tomorrow."
                }
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FreeTrialButton;
