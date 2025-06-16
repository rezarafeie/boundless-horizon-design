
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Shield, Zap, Loader, CheckCircle, Gift, AlertCircle } from 'lucide-react';
import { MarzneshinApiService } from '@/services/marzneshinApi';

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

const ModernFreeTrialForm = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<TrialPlan | null>(null);
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TrialResult | null>(null);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);

  const trialPlans: TrialPlan[] = [
    {
      id: 'lite',
      name: 'شبکه بدون مرز لایت',
      nameEn: 'Boundless Network Lite',
      nameFa: 'شبکه بدون مرز لایت',
      description: 'سرعت متوسط، سرورهای محدود',
      descriptionEn: 'Moderate speed, limited servers',
      descriptionFa: 'سرعت متوسط، سرورهای محدود',
      apiType: 'marzban',
      icon: Shield
    },
    {
      id: 'pro',
      name: 'شبکه بدون مرز پرو',
      nameEn: 'Boundless Network Pro',
      nameFa: 'شبکه بدون مرز پرو',
      description: 'سرعت بالا، تمام سرورها',
      descriptionEn: 'High speed, all servers',
      descriptionFa: 'سرعت بالا، تمام سرورها',
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
    const trialUsername = username || generateTrialUsername();
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
        username: trialUsername,
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
    const trialUsername = username || generateTrialUsername();

    try {
      const result = await MarzneshinApiService.createUser({
        username: trialUsername,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

    if (!selectedPlan) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'لطفاً یک پلن انتخاب کنید' : 'Please select a plan',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      let trialResult: TrialResult;

      if (selectedPlan.apiType === 'marzban') {
        trialResult = await createMarzbanTrial();
      } else {
        trialResult = await createMarzneshinTrial();
      }

      // Mark trial as used today
      localStorage.setItem('lastTrialDate', new Date().toDateString());
      setHasUsedTrial(true);
      setResult(trialResult);
      
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
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: language === 'fa' ? 'کپی شد' : 'Copied',
      description: language === 'fa' ? 'لینک کپی شد' : 'Link copied to clipboard',
    });
  };

  // Initialize trial usage check
  useState(() => {
    checkTrialUsage();
  });

  if (result) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-green-800 dark:text-green-200">
              {language === 'fa' ? 'آزمایش رایگان شما آماده است!' : 'Your Free Trial is Ready!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-green-700 dark:text-green-300">
                {language === 'fa' ? 'نام کاربری:' : 'Username:'}
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input value={result.username} readOnly className="bg-white dark:bg-gray-800" />
                <Button size="sm" onClick={() => copyToClipboard(result.username)}>
                  {language === 'fa' ? 'کپی' : 'Copy'}
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-green-700 dark:text-green-300">
                {language === 'fa' ? 'لینک اشتراک:' : 'Subscription Link:'}
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input value={result.subscription_url} readOnly className="bg-white dark:bg-gray-800" />
                <Button size="sm" onClick={() => copyToClipboard(result.subscription_url)}>
                  {language === 'fa' ? 'کپی' : 'Copy'}
                </Button>
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>{language === 'fa' ? 'مدت زمان:' : 'Duration:'}</strong> {language === 'fa' ? '۱ روز' : '1 Day'} | 
                <strong className="ml-2">{language === 'fa' ? 'حجم:' : 'Data:'}</strong> {language === 'fa' ? '۱ گیگابایت' : '1 GB'}
              </p>
            </div>
            <Button 
              onClick={() => setResult(null)} 
              variant="outline" 
              className="w-full mt-6"
            >
              {language === 'fa' ? 'آزمایش جدید' : 'New Trial'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mb-4">
          <Gift className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2">
          {language === 'fa' ? 'آزمایش رایگان' : 'Free Trial'}
        </h2>
        <p className="text-muted-foreground">
          {language === 'fa' ? '۱ روز رایگان با ۱ گیگابایت حجم' : '1 free day with 1 GB data'}
        </p>
      </div>

      {hasUsedTrial && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mb-6">
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Plan Selection */}
        <div>
          <Label className="text-lg font-semibold mb-4 block">
            {language === 'fa' ? 'انتخاب پلن' : 'Select Plan'}
          </Label>
          <RadioGroup
            value={selectedPlan?.id || ''}
            onValueChange={(value) => {
              const plan = trialPlans.find(p => p.id === value);
              setSelectedPlan(plan || null);
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {trialPlans.map((plan) => {
              const IconComponent = plan.icon;
              return (
                <Card 
                  key={plan.id} 
                  className={`cursor-pointer transition-all ${
                    selectedPlan?.id === plan.id 
                      ? 'ring-2 ring-primary border-primary' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedPlan(plan)}
                >
                  <CardHeader className="pb-3">
                    <RadioGroupItem value={plan.id} className="sr-only" />
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {language === 'fa' ? plan.nameFa : plan.nameEn}
                        </CardTitle>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                          {language === 'fa' ? 'رایگان' : 'Free'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription>
                      {language === 'fa' ? plan.descriptionFa : plan.descriptionEn}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </RadioGroup>
        </div>

        {/* Username */}
        <div>
          <Label htmlFor="username">
            {language === 'fa' ? 'نام کاربری (اختیاری)' : 'Username (Optional)'}
          </Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={language === 'fa' ? 'نام کاربری دلخواه یا خالی بگذارید' : 'Your preferred username or leave empty'}
          />
        </div>

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
          disabled={!selectedPlan || isLoading || hasUsedTrial}
        >
          {isLoading ? (
            <>
              <Loader className="w-5 h-5 mr-2 animate-spin" />
              {language === 'fa' ? 'در حال ایجاد...' : 'Creating...'}
            </>
          ) : hasUsedTrial ? (
            language === 'fa' ? 'امروز استفاده شده' : 'Used Today'
          ) : (
            <>
              <Gift className="w-5 h-5 mr-2" />
              {language === 'fa' ? 'دریافت آزمایش رایگان' : 'Get Free Trial'}
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default ModernFreeTrialForm;
