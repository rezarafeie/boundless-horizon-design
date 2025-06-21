
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { CheckCircle, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Country } from '@/data/countries';

interface Plan {
  id: string;
  plan_id: string;
  name_en: string;
  name_fa: string;
  description_en?: string;
  description_fa?: string;
  price_per_gb: number;
  available_countries?: Country[];
}

interface PlanSelectorProps {
  selectedPlan: string | null;
  onPlanSelect: (planId: string) => void;
  dataLimit: number;
}

const PlanSelector = ({ selectedPlan, onPlanSelect, dataLimit }: PlanSelectorProps) => {
  const { language } = useLanguage();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .eq('is_visible', true)
          .order('price_per_gb', { ascending: true });

        if (error) throw error;
        
        // Transform the data to ensure available_countries is properly typed
        const transformedPlans: Plan[] = (data || []).map(plan => ({
          id: plan.id,
          plan_id: plan.plan_id,
          name_en: plan.name_en,
          name_fa: plan.name_fa,
          description_en: plan.description_en,
          description_fa: plan.description_fa,
          price_per_gb: plan.price_per_gb,
          available_countries: Array.isArray(plan.available_countries) ? plan.available_countries as Country[] : []
        }));
        
        setPlans(transformedPlans);
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">
          {language === 'fa' ? 'انتخاب پلن' : 'Select Plan'}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">
          {language === 'fa' ? 'انتخاب پلن اشتراک' : 'Select Subscription Plan'}
        </h2>
        <p className="text-gray-600">
          {language === 'fa' 
            ? 'پلن مناسب خود را انتخاب کنید' 
            : 'Choose the plan that best fits your needs'
          }
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const totalPrice = plan.price_per_gb * dataLimit;
          const isSelected = selectedPlan === plan.plan_id;
          
          return (
            <Card 
              key={plan.id} 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected 
                  ? 'ring-2 ring-blue-500 shadow-lg' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => onPlanSelect(plan.plan_id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {language === 'fa' ? plan.name_fa : plan.name_en}
                    {isSelected && <CheckCircle className="w-5 h-5 text-blue-500" />}
                  </CardTitle>
                </div>
                <CardDescription>
                  {language === 'fa' ? plan.description_fa : plan.description_en}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {language === 'fa' ? 'قیمت هر گیگابایت:' : 'Price per GB:'}
                    </span>
                    <span className="font-semibold">
                      {plan.price_per_gb.toLocaleString()} 
                      {language === 'fa' ? ' تومان' : ' Toman'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {language === 'fa' ? 'قیمت کل:' : 'Total Price:'}
                    </span>
                    <span className="text-lg font-bold text-blue-600">
                      {totalPrice.toLocaleString()} 
                      {language === 'fa' ? ' تومان' : ' Toman'}
                    </span>
                  </div>
                </div>

                {/* Available Countries */}
                {plan.available_countries && plan.available_countries.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Globe className="w-4 h-4" />
                      <span>
                        {language === 'fa' ? 'کشورهای در دسترس:' : 'Available Countries:'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {plan.available_countries.slice(0, 6).map((country: Country) => (
                        <Badge key={country.code} variant="outline" className="text-xs">
                          <span className="mr-1">{country.flag}</span>
                          {country.name}
                        </Badge>
                      ))}
                      {plan.available_countries.length > 6 && (
                        <Badge variant="secondary" className="text-xs">
                          +{plan.available_countries.length - 6} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <Button 
                  variant={isSelected ? "default" : "outline"} 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlanSelect(plan.plan_id);
                  }}
                >
                  {isSelected 
                    ? (language === 'fa' ? 'انتخاب شده' : 'Selected')
                    : (language === 'fa' ? 'انتخاب پلن' : 'Select Plan')
                  }
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {plans.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">
              {language === 'fa' 
                ? 'هیچ پلنی در دسترس نیست' 
                : 'No plans available at the moment'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PlanSelector;
