
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Check, Star } from 'lucide-react';
import MarzbanSubscriptionForm from './MarzbanSubscriptionForm';

interface FormData {
  plan: 'lite' | 'pro' | '';
  email: string;
  username: string;
  dataVolume: string;
  duration: string;
  protocol: string;
  location: string;
  promoCode: string;
}

const ModernSubscriptionForm = () => {
  const { t, language } = useLanguage();
  const isRTL = language === 'fa';
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    plan: '',
    email: '',
    username: '',
    dataVolume: '',
    duration: '',
    protocol: '',
    location: '',
    promoCode: ''
  });

  const plans = [
    {
      id: 'lite',
      name: language === 'fa' ? 'شبکه بدون مرز لایت' : 'Boundless Network Lite',
      nameShort: t('pricing.lite'),
      price: language === 'fa' ? "۹۹,۰۰۰" : "$12",
      period: t('pricing.monthly'),
      description: language === 'fa' ? "گزینه سبک برای کاربران با نیاز به اتصال پایه، مکان‌های کمتر و سرعت متوسط" : "A lightweight access option for users who need basic connection with fewer locations and moderate speed",
      features: [
        language === 'fa' ? "سرعت متوسط" : "Moderate speed",
        language === 'fa' ? "مکان‌های محدود سرور" : "Limited server locations",
        language === 'fa' ? "مناسب برای مرور پایه و پیام‌رسانی" : "Suitable for basic browsing and messaging"
      ],
      locations: [
        language === 'fa' ? "آلمان" : "Germany",
        language === 'fa' ? "فنلاند" : "Finland", 
        language === 'fa' ? "هلند" : "Netherlands"
      ],
      popular: false
    },
    {
      id: 'pro',
      name: language === 'fa' ? 'شبکه بدون مرز پرو' : 'Boundless Network Pro',
      nameShort: t('pricing.pro'),
      price: language === 'fa' ? "۱۹۹,۰۰۰" : "$24",
      period: t('pricing.monthly'),
      description: language === 'fa' ? "پلن پرمیوم با دسترسی کامل جهانی، بالاترین سرعت و اتصالات پایدار - به‌ویژه بهینه‌سازی شده برای استریم، کار از راه دور و بازی" : "A premium connection plan with full global access, highest speed, and stable connections — especially optimized for streaming, remote work, and gaming",
      features: [
        language === 'fa' ? "اتصالات تونل پرسرعت" : "High-speed tunnel connections",
        language === 'fa' ? "دسترسی کامل به مکان‌ها" : "Full location access",
        language === 'fa' ? "عملکرد قابل اعتماد با پروتکل‌های مقاوم در برابر سانسور" : "Reliable performance with censorship-resistant protocols"
      ],
      locations: [
        { country: language === 'fa' ? "آلمان" : "Germany", servers: ["GermanyDirect", "GermanyTunnel"] },
        { country: language === 'fa' ? "هلند" : "Netherlands", servers: ["NetherlandsDirect", "NetherlandsTunnel"] },
        { country: language === 'fa' ? "ترکیه" : "Turkey", servers: ["TurkeyDirect", "TurkeyTunnel"] },
        { country: language === 'fa' ? "انگلیس" : "UK", servers: ["UkDirect", "UkTunnel"] },
        { country: language === 'fa' ? "آمریکا" : "US", servers: ["UsDirect", "UsTunnel"] },
        { country: language === 'fa' ? "لهستان" : "Poland", servers: ["PolandTunnel"] },
        { country: language === 'fa' ? "فنلاند" : "Finland", servers: ["FinlandTunnel"] }
      ],
      popular: true
    }
  ];

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handlePlanSelect = (planId: 'lite' | 'pro') => {
    setFormData({ ...formData, plan: planId });
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              currentStep >= step 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {currentStep > step ? <Check className="w-5 h-5" /> : step}
            </div>
            {step < 3 && (
              <div className={`w-16 h-px transition-colors ${
                currentStep > step ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStepTitles = () => {
    const titles = [
      t('subscription.plan-selection'),
      t('subscription.user-info'),
      t('subscription.config')
    ];
    
    return (
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-foreground mb-2">
          {titles[currentStep - 1]}
        </h3>
        <p className="text-muted-foreground">
          {language === 'fa' ? `مرحله ${currentStep} از ۳` : `Step ${currentStep} of 3`}
        </p>
      </div>
    );
  };

  if (currentStep === 3 && formData.plan) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            {t('subscription.title')}
          </h2>
          <p className="text-xl text-muted-foreground">
            {t('subscription.subtitle')}
          </p>
        </div>

        {renderStepIndicator()}
        {renderStepTitles()}

        <MarzbanSubscriptionForm 
          preSelectedPlan={formData.plan}
          initialData={{
            email: formData.email,
            username: formData.username,
            dataVolume: formData.dataVolume,
            duration: formData.duration,
            protocol: formData.protocol,
            location: formData.location,
            promoCode: formData.promoCode
          }}
          onBack={prevStep}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          {t('subscription.title')}
        </h2>
        <p className="text-xl text-muted-foreground">
          {t('subscription.subtitle')}
        </p>
      </div>

      {renderStepIndicator()}
      {renderStepTitles()}

      <Card className="p-8">
        {/* Step 1: Plan Selection */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {plans.map((plan) => (
                <Card 
                  key={plan.id}
                  className={`relative p-6 cursor-pointer transition-all duration-300 ${
                    formData.plan === plan.id
                      ? 'border-2 border-primary shadow-lg' 
                      : 'border border-border hover:border-primary/50 hover:shadow-md'
                  } ${plan.popular ? 'bg-primary/5' : 'bg-background'}`}
                  onClick={() => handlePlanSelect(plan.id as 'lite' | 'pro')}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        <Star className="w-3 h-3 mr-1" />
                        {t('pricing.most-popular')}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {plan.nameShort}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {plan.description}
                    </p>
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-foreground">
                        {plan.price}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {language === 'fa' ? 'تومان' : ''}
                      </span>
                      <div className="text-sm text-muted-foreground mt-1">{plan.period}</div>
                    </div>
                  </div>
                  
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-4 border-t border-border">
                    <p className="text-sm font-medium text-foreground mb-2">
                      {language === 'fa' ? 'مکان‌های سرور موجود:' : 'Available Server Locations:'}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      {Array.isArray(plan.locations[0]) ? (
                        plan.locations.map((location: any, idx: number) => (
                          <div key={idx} className="mb-1">
                            <strong>{location.country}:</strong> {location.servers.join(', ')}
                          </div>
                        ))
                      ) : (
                        plan.locations.join(', ')
                      )}
                    </div>
                  </div>

                  {formData.plan === plan.id && (
                    <div className="absolute top-4 right-4">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: User Information */}
        {currentStep === 2 && (
          <div className="space-y-6 max-w-md mx-auto">
            <div className="space-y-2">
              <Label htmlFor="email">{t('subscription.email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                placeholder={language === 'fa' ? 'ایمیل خود را وارد کنید' : 'Enter your email'}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">{t('subscription.username')}</Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => updateFormData('username', e.target.value)}
                placeholder={language === 'fa' ? 'نام کاربری مورد نظر' : 'Desired username'}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promo">{t('subscription.promo-code')}</Label>
              <Input
                id="promo"
                type="text"
                value={formData.promoCode}
                onChange={(e) => updateFormData('promoCode', e.target.value)}
                placeholder={language === 'fa' ? 'کد تخفیف (اختیاری)' : 'Promo code (optional)'}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className={`flex justify-between items-center mt-8 pt-6 border-t border-border ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`${currentStep === 1 ? 'invisible' : ''}`}
          >
            <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180 ml-2' : 'mr-2'}`} />
            {t('subscription.previous')}
          </Button>

          <Button
            onClick={nextStep}
            disabled={currentStep === 1 && !formData.plan}
            className="bg-primary hover:bg-primary/90"
          >
            {currentStep === 2 ? t('subscription.confirm') : t('subscription.next')}
            <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180 mr-2' : 'ml-2'}`} />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ModernSubscriptionForm;
