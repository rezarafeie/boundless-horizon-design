
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { CheckCircle, Globe, Loader } from 'lucide-react';
import { PlanService, PlanWithPanels } from '@/services/planService';

interface PlanSelectorProps {
  selectedPlan: string | null;
  onPlanSelect: (plan: PlanWithPanels) => void;
  dataLimit: number;
}

const PlanSelector = ({ selectedPlan, onPlanSelect, dataLimit }: PlanSelectorProps) => {
  const { language } = useLanguage();
  const [plans, setPlans] = useState<PlanWithPanels[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('PlanSelector - Selected plan ID:', selectedPlan);
    console.log('PlanSelector - Data limit:', dataLimit);
  }, [selectedPlan, dataLimit]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        console.log('PlanSelector - Fetching plans from PlanService...');
        const plansData = await PlanService.getAvailablePlans();
        console.log('PlanSelector - Plans fetched:', plansData);
        setPlans(plansData);
        
        if (plansData.length === 0) {
          console.warn('PlanSelector - No plans available');
        }
      } catch (error) {
        console.error('PlanSelector - Error fetching plans:', error);
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
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const handlePlanSelect = (plan: PlanWithPanels) => {
    console.log('PlanSelector - Plan selected with ULTRA STRICT validation:', {
      planId: plan.id,
      planName: plan.name_en,
      assignedPanelId: plan.assigned_panel_id,
      hasAssignedPanel: !!plan.assigned_panel_id,
      panelCount: plan.panels?.length || 0
    });
    
    // ULTRA STRICT VALIDATION: Ensure plan has assigned panel
    if (!plan.assigned_panel_id) {
      console.error('PlanSelector - ULTRA STRICT REJECTION: Plan has no assigned panel:', plan);
      return;
    }
    
    onPlanSelect(plan);
  };

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
          const isSelected = selectedPlan === plan.id;
          
          return (
            <Card 
              key={plan.id} 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected 
                  ? 'ring-2 ring-blue-500 shadow-lg' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => handlePlanSelect(plan)}
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
                {/* Panel Assignment Info */}
                <div className="text-xs text-gray-500">
                  Panel: {plan.assigned_panel_id ? '✅ Assigned' : '❌ No Panel'}
                </div>
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
                      {plan.available_countries.slice(0, 6).map((country: any) => (
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
                  disabled={!plan.assigned_panel_id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlanSelect(plan);
                  }}
                >
                  {!plan.assigned_panel_id ? (
                    language === 'fa' ? 'پلن غیرفعال' : 'Plan Unavailable'
                  ) : isSelected ? (
                    language === 'fa' ? 'انتخاب شده' : 'Selected'
                  ) : (
                    language === 'fa' ? 'انتخاب پلن' : 'Select Plan'
                  )}
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
