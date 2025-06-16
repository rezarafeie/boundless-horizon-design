
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Zap, Star, Globe } from 'lucide-react';
import { SubscriptionPlan } from '@/types/subscription';
import { useLanguage } from '@/contexts/LanguageContext';

interface PlanSelectorProps {
  selectedPlan: SubscriptionPlan | null;
  onPlanSelect: (plan: SubscriptionPlan) => void;
  dataLimit: number;
}

const PlanSelector = ({ selectedPlan, onPlanSelect, dataLimit }: PlanSelectorProps) => {
  const { language } = useLanguage();

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

  const calculatePrice = (plan: SubscriptionPlan) => {
    return dataLimit * plan.pricePerGB;
  };

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
