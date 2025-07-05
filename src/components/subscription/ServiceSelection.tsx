import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle } from 'lucide-react';
import { VpnService, VpnServicesService } from '@/services/vpnServicesService';

interface ServiceSelectionProps {
  planId: string;
  selectedService: VpnService | null;
  onServiceSelect: (service: VpnService | null) => void;
}

export const ServiceSelection = ({ planId, selectedService, onServiceSelect }: ServiceSelectionProps) => {
  const { language } = useLanguage();
  const [services, setServices] = useState<VpnService[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (planId) {
      loadServices();
    }
  }, [planId]);

  const loadServices = async () => {
    setLoading(true);
    try {
      const data = await VpnServicesService.getActiveServicesByPlan(planId);
      setServices(data);
    } catch (error) {
      console.error('Failed to load services:', error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (language === 'fa') {
      return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
    } else {
      const usdPrice = (price / 40000).toFixed(2);
      return '$' + usdPrice;
    }
  };

  const handleServiceSelect = (service: VpnService) => {
    onServiceSelect(selectedService?.id === service.id ? null : service);
  };

  const handleCustomPlan = () => {
    onServiceSelect(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{language === 'fa' ? 'هیچ سرویس پیش‌تعریف شده‌ای برای این پلن موجود نیست' : 'No predefined services available for this plan'}</p>
        <p className="text-sm mt-2">
          {language === 'fa' ? 'می‌توانید تنظیمات دلخواه خود را وارد کنید' : 'You can enter your custom preferences'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">
          {language === 'fa' ? 'انتخاب سرویس' : 'Select Service'}
        </h3>
        <p className="text-muted-foreground">
          {language === 'fa' ? 
            'یکی از سرویس‌های از پیش تعریف شده را انتخاب کنید یا سفارشی کنید' : 
            'Choose a predefined service or customize your own'
          }
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card 
            key={service.id} 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedService?.id === service.id 
                ? 'ring-2 ring-primary bg-primary/5' 
                : 'hover:bg-muted/50'
            }`}
            onClick={() => handleServiceSelect(service)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {language === 'fa' ? service.name : (service.name_en || service.name)}
                </CardTitle>
                {selectedService?.id === service.id && (
                  <CheckCircle className="h-5 w-5 text-primary" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {language === 'fa' ? 'مدت:' : 'Duration:'}
                  </span>
                  <span className="font-medium">
                    {service.duration_days} {language === 'fa' ? 'روز' : 'days'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {language === 'fa' ? 'حجم:' : 'Data:'}
                  </span>
                  <span className="font-medium">
                    {service.data_limit_gb} {language === 'fa' ? 'گیگابایت' : 'GB'}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">
                    {language === 'fa' ? 'قیمت:' : 'Price:'}
                  </span>
                  <Badge variant="secondary" className="font-semibold">
                    {formatPrice(service.price_toman)}
                  </Badge>
                </div>
              </div>
              <Button 
                className="w-full mt-3"
                variant={selectedService?.id === service.id ? "default" : "outline"}
                onClick={(e) => {
                  e.stopPropagation();
                  handleServiceSelect(service);
                }}
              >
                {selectedService?.id === service.id 
                  ? (language === 'fa' ? 'انتخاب شده' : 'Selected')
                  : (language === 'fa' ? 'انتخاب این سرویس' : 'Choose This Service')
                }
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center pt-4 border-t">
        <Button 
          variant="ghost" 
          onClick={handleCustomPlan}
          className="text-primary"
        >
          {language === 'fa' ? 'استفاده از پلن سفارشی' : 'Use Custom Plan'}
        </Button>
      </div>
    </div>
  );
};