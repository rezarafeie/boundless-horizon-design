
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, Zap, Shield, AlertCircle, Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserCreationService } from '@/services/userCreationService';
import FreeTrialResult from './FreeTrialResult';
import { supabase } from '@/integrations/supabase/client';

interface DatabasePlan {
  id: string;
  plan_id: string;
  name_en: string;
  name_fa: string;
  description_en?: string;
  description_fa?: string;
  api_type: 'marzban' | 'marzneshin';
  is_active: boolean;
  is_visible: boolean;
  assigned_panel_id?: string;
  panel_servers?: {
    id: string;
    name: string;
    type: 'marzban' | 'marzneshin';
    is_active: boolean;
    health_status: 'online' | 'offline' | 'unknown';
  };
}

interface TrialResult {
  username: string;
  subscription_url: string;
  expire: number;
  data_limit: number;
  plan: DatabasePlan;
}

const FreeTrialButton = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatingTrial, setIsCreatingTrial] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [trialResult, setTrialResult] = useState<TrialResult | null>(null);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<DatabasePlan[]>([]);

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

  // Load available plans from database
  const loadAvailablePlans = async () => {
    setIsLoadingPlans(true);
    try {
      console.log('FREE_TRIAL_BUTTON: Loading plans from database...');
      
      const { data: plans, error } = await supabase
        .from('subscription_plans')
        .select(`
          *,
          panel_servers!assigned_panel_id(
            id,
            name,
            type,
            is_active,
            health_status
          )
        `)
        .eq('is_active', true)
        .eq('is_visible', true)
        .not('assigned_panel_id', 'is', null);

      if (error) {
        console.error('FREE_TRIAL_BUTTON: Error loading plans:', error);
        throw error;
      }

      // Filter plans with active assigned panels and ensure proper typing
      const validPlans = (plans || []).filter(plan => 
        plan.panel_servers && plan.panel_servers.is_active
      ).map(plan => ({
        ...plan,
        api_type: plan.api_type as 'marzban' | 'marzneshin',
        panel_servers: plan.panel_servers ? {
          ...plan.panel_servers,
          type: plan.panel_servers.type as 'marzban' | 'marzneshin',
          health_status: plan.panel_servers.health_status as 'online' | 'offline' | 'unknown'
        } : undefined
      }));

      console.log('FREE_TRIAL_BUTTON: Loaded plans:', {
        totalPlans: plans?.length || 0,
        validPlans: validPlans.length,
        planDetails: validPlans.map(p => ({
          id: p.id,
          plan_id: p.plan_id,
          name: p.name_en,
          panelName: p.panel_servers?.name,
          panelHealth: p.panel_servers?.health_status
        }))
      });

      setAvailablePlans(validPlans);
    } catch (error) {
      console.error('FREE_TRIAL_BUTTON: Failed to load plans:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'خطا در بارگذاری پلن‌ها' : 
          'Failed to load plans',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingPlans(false);
    }
  };

  // Generate username for trial
  const generateTrialUsername = (): string => {
    const prefix = 'trial_';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5);
    return `${prefix}${timestamp}_${random}`;
  };

  // Handle plan selection and trial creation
  const handlePlanSelect = async (plan: DatabasePlan) => {
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
      const username = generateTrialUsername();
      
      console.log('FREE_TRIAL_BUTTON: Creating trial with plan:', { username, planId: plan.id });
      
      // Map plan_id to the expected format for UserCreationService
      const planType = plan.plan_id.toLowerCase().includes('lite') ? 'lite' as const : 'plus' as const;
      
      const result = await UserCreationService.createFreeTrial(username, planType, 1, 30);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create free trial');
      }

      // Mark trial as used today
      localStorage.setItem('lastTrialDate', new Date().toDateString());
      setHasUsedTrial(true);
      
      setTrialResult({
        username: result.data.username,
        subscription_url: result.data.subscription_url,
        expire: result.data.expire,
        data_limit: result.data.data_limit,
        plan: plan
      });
      
      toast({
        title: language === 'fa' ? 'موفق' : 'Success',
        description: language === 'fa' ? 
          'آزمایش رایگان شما ایجاد شد!' : 
          'Your free trial has been created!',
      });

    } catch (error) {
      console.error('FREE_TRIAL_BUTTON: Creation failed:', error);
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

  // Load plans when modal opens
  const handleModalOpen = (open: boolean) => {
    setIsModalOpen(open);
    if (open) {
      loadAvailablePlans();
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
      planName: language === 'fa' ? trialResult.plan.name_fa : trialResult.plan.name_en,
      apiType: trialResult.plan.api_type,
      dataLimit: 1, // 1GB for free trial
      duration: 30 // 30 days for free trial
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
    <Dialog open={isModalOpen} onOpenChange={handleModalOpen}>
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
              '۳۰ روز رایگان با ۱ گیگابایت حجم داده' : 
              '30 free days with 1 GB data volume'
            }
          </DialogDescription>
        </DialogHeader>

        {isLoadingPlans ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader className="w-8 h-8 animate-spin text-primary" />
            <p className="text-center font-medium">
              {language === 'fa' ? 'در حال بارگذاری پلن‌ها...' : 'Loading plans...'}
            </p>
          </div>
        ) : isCreatingTrial ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader className="w-8 h-8 animate-spin text-primary" />
            <p className="text-center font-medium">
              {language === 'fa' ? 'در حال ایجاد آزمایش رایگان...' : 'Creating your free trial...'}
            </p>
          </div>
        ) : availablePlans.length === 0 ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">
                {language === 'fa' ? 
                  'هیچ پلن فعالی با پنل اختصاصی یافت نشد' : 
                  'No active plans with assigned panels found'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {availablePlans.map((plan) => {
              // Determine icon based on plan type or name
              let IconComponent = Shield; // default
              if (plan.api_type === 'marzneshin' || plan.name_en.toLowerCase().includes('plus')) {
                IconComponent = Zap;
              }
              
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
                      {language === 'fa' ? plan.name_fa : plan.name_en}
                    </CardTitle>
                    <CardDescription>
                      {language === 'fa' ? plan.description_fa : plan.description_en}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{language === 'fa' ? 'مدت زمان:' : 'Duration:'}</span>
                        <Badge variant="secondary">
                          {language === 'fa' ? '۳۰ روز' : '30 Days'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>{language === 'fa' ? 'حجم داده:' : 'Data Volume:'}</span>
                        <Badge variant="secondary">
                          {language === 'fa' ? '۱ گیگابایت' : '1 GB'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>{language === 'fa' ? 'پنل:' : 'Panel:'}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-600">
                            {plan.panel_servers?.name}
                          </span>
                          <span className={`w-2 h-2 rounded-full ${
                            plan.panel_servers?.health_status === 'online' ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                        </div>
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
