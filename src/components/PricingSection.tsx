
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from '@/contexts/LanguageContext';
import { Check, Star } from 'lucide-react';

const PricingSection = () => {
  const { t, language } = useLanguage();

  const plans = [
    {
      name: t('pricing.lite'),
      price: language === 'fa' ? "۹۹,۰۰۰" : "$12",
      period: t('pricing.monthly'),
      description: t('pricing.lite-desc'),
      features: [
        language === 'fa' ? "آلمان، فنلاند، هلند" : "Germany, Finland, Netherlands",
        language === 'fa' ? "سرعت متوسط" : "Moderate speed",
        language === 'fa' ? "مناسب برای مرور پایه" : "Suitable for basic browsing",
        language === 'fa' ? "پشتیبانی ۲۴/۷" : "24/7 support"
      ],
      popular: false,
      buttonText: t('pricing.choose-plan')
    },
    {
      name: t('pricing.pro'),
      price: language === 'fa' ? "۱۹۹,۰۰۰" : "$24",
      period: t('pricing.monthly'),
      description: t('pricing.pro-desc'),
      features: [
        language === 'fa' ? "فنلاند، آلمان، هلند، ترکیه، انگلیس، آمریکا" : "Finland, Germany, Netherlands, Turkey, UK, USA",
        language === 'fa' ? "سرعت فوق‌العاده" : "Ultra-fast speed",
        language === 'fa' ? "بهینه برای استریمینگ" : "Optimized for streaming",
        language === 'fa' ? "مسیریابی هوشمند" : "Smart routing",
        language === 'fa' ? "پشتیبانی اولویت‌دار" : "Priority support"
      ],
      popular: true,
      buttonText: t('pricing.most-popular')
    },
    {
      name: t('pricing.pro-plus'),
      price: language === 'fa' ? "۳۹۹,۰۰۰" : "$48",
      period: t('pricing.monthly'),
      description: language === 'fa' ? "Pro + تونل ایرانی" : "Pro + Iranian tunnel",
      features: [
        language === 'fa' ? "همه امکانات Pro" : "All Pro features",
        language === 'fa' ? "تونل ایرانی اختصاصی" : "Dedicated Iranian tunnel",
        language === 'fa' ? "پشتیبانی نیم‌بها" : "Half-price support",
        language === 'fa' ? "سرعت بی‌نظیر" : "Unmatched speed",
        language === 'fa' ? "اولویت کامل" : "Full priority"
      ],
      popular: false,
      buttonText: t('pricing.professional-plan')
    }
  ];

  return (
    <section id="pricing" className="py-24 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            {t('pricing.title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('pricing.subtitle')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative p-8 transition-all duration-300 animate-slide-up ${
                plan.popular 
                  ? 'border-2 border-primary shadow-xl scale-105 bg-primary/5' 
                  : 'border border-border shadow-md hover:shadow-lg bg-background hover:border-primary/50'
              }`}
              style={{animationDelay: `${index * 0.1}s`}}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium">
                    <Star className="w-4 h-4 mr-1" />
                    {t('pricing.most-popular')}
                  </div>
                </div>
              )}
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {plan.name}
                </h3>
                <p className="text-muted-foreground mb-6">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    {language === 'fa' ? 'تومان' : ''}
                  </span>
                  <div className="text-sm text-muted-foreground mt-1">{plan.period}</div>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className={`w-full py-6 text-lg rounded-xl transition-all duration-300 ${
                  plan.popular 
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg' 
                    : 'bg-background border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground'
                }`}
                onClick={() => window.open('https://t.me/getbnbot', '_blank')}
              >
                {plan.buttonText}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
