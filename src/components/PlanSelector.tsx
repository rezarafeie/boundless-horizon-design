
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Zap, Star, Globe, Loader } from 'lucide-react';
import { SubscriptionPlan } from '@/types/subscription';
import { useLanguage } from '@/contexts/LanguageContext';

interface PlanSelectorProps {
  selectedPlan: SubscriptionPlan | null;
  onPlanSelect: (plan: SubscriptionPlan) => void;
  dataLimit: number;
}

interface DatabasePlan {
  id: string;
  plan_id: string;
  name_fa: string;
  name_en: string;
  description_fa: string;
  description_en: string;
  price_per_gb: number;
  api_type: string;
  is_active: boolean;
  is_visible: boolean;
}

const PlanSelector = ({ selectedPlan, onPlanSelect, dataLimit }: PlanSelectorProps) => {
  const { language } = useLanguage();

  const { data: databasePlans, isLoading, error } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      console.log('=== PLANS: Fetching plans from database ===');
      
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .eq('is_visible', true)
        .order('price_per_gb', { ascending: true });
      
      console.log('PLANS: Database query result:', { data, error });
      
      if (error) {
        console.error('PLANS: Error fetching plans:', error);
        throw error;
      }
      
      return data as DatabasePlan[];
    },
    retry: 1
  });

  // Convert database plans to SubscriptionPlan format
  const plans: SubscriptionPlan[] = databasePlans?.map(dbPlan => ({
    id: dbPlan.plan_id as 'lite' | 'pro',
    name: language === 'fa' ? dbPlan.name_fa : dbPlan.name_en,
    description: language === 'fa' ? 
      (dbPlan.description_fa || dbPlan.description_en) : 
      (dbPlan.description_en || dbPlan.description_fa),
    pricePerGB: dbPlan.price_per_gb,
    apiType: dbPlan.api_type as 'marzban' | 'marzneshin'
  })) || [];

  const getLocationsList = (planId: string) => {
    if (planId === 'lite') {
      return language === 'fa' ? 
        ['🇩🇪 آلمان', '🇫🇮 فنلاند', '🇳🇱 هلند'] :
        ['🇩🇪 Germany', '🇫🇮 Finland', '🇳🇱 Netherlands'];
    } else {
      return language === 'fa' ? 
        ['🇺🇸 آمریکا', '🇬🇧 انگلیس', '🇩🇪 آلمان', '🇫🇮 فنلاند', '🇳🇱 هلند'] :
        ['🇺🇸 USA', '🇬🇧 UK', '🇩🇪 Germany', '🇫🇮 Finland', '🇳🇱 Netherlands'];
    }
  };

  const calculatePrice = (plan: SubscriptionPlan) => {
    return dataLimit * plan.pricePerGB;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" />
          {language === 'fa' ? 'انتخاب پلن' : 'Choose Plan'}
        </h3>
        <div className="flex items-center justify-center p-8">
          <Loader className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2">
            {language === 'fa' ? 'در حال بارگذاری پلن‌ها...' : 'Loading plans...'}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" />
          {language === 'fa' ? 'انتخاب پلن' : 'Choose Plan'}
        </h3>
        <div className="text-center p-8 text-red-600">
          {language === 'fa' ? 
            'خطا در بارگذاری پلن‌ها. لطفاً صفحه را تازه کنید.' : 
            'Error loading plans. Please refresh the page.'
          }
        </div>
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" />
          {language === 'fa' ? 'انتخاب پلن' : 'Choose Plan'}
        </h3>
        <div className="text-center p-8 text-muted-foreground">
          {language === 'fa' ? 
            'هیچ پلنی در دسترس نیست.' : 
            'No plans available.'
          }
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Star className="w-5 h-5 text-primary" />
        {language === 'fa' ? 'انتخاب پلن' : 'Choose Plan'}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map((plan) => (
          <Card 
            key={plan.id}
            className={`cursor-pointer transition-all duration-200 ${
              selectedPlan?.id === plan.id 
                ? 'ring-2 ring-primary bg-primary/5' 
                : 'hover:shadow-md'
            }`}
            onClick={() => onPlanSelect(plan)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {plan.id === 'pro' ? (
                    <Zap className="w-5 h-5 text-orange-500" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {plan.name}
                </CardTitle>
                {selectedPlan?.id === plan.id && (
                  <Badge variant="default">
                    {language === 'fa' ? 'انتخاب شده' : 'Selected'}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-sm">
                {plan.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Server Locations */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {language === 'fa' ? 'مکان‌های سرور' : 'Server Locations'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {getLocationsList(plan.id).map((location, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {location}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {language === 'fa' ? 'قیمت هر گیگابایت' : 'Price per GB'}
                </span>
                <span className="font-semibold">
                  {plan.pricePerGB.toLocaleString()} 
                  {language === 'fa' ? ' تومان' : ' Toman'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {language === 'fa' ? 'قیمت کل' : 'Total Price'}
                </span>
                <span className="text-lg font-bold text-primary">
                  {calculatePrice(plan).toLocaleString()} 
                  {language === 'fa' ? ' تومان' : ' Toman'}
                </span>
              </div>

              <Button 
                variant={selectedPlan?.id === plan.id ? "default" : "outline"}
                className="w-full"
                onClick={() => onPlanSelect(plan)}
              >
                {selectedPlan?.id === plan.id 
                  ? (language === 'fa' ? 'انتخاب شده' : 'Selected')
                  : (language === 'fa' ? 'انتخاب پلن' : 'Select Plan')
                }
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PlanSelector;
