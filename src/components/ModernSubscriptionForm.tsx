
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FormData {
  plan: string;
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

  const steps = [
    { number: 1, title: t('subscription.step1') },
    { number: 2, title: t('subscription.step2') },
    { number: 3, title: t('subscription.step3') }
  ];

  const liteLocations = [
    { value: 'germany', label: language === 'fa' ? 'آلمان' : 'Germany' },
    { value: 'finland', label: language === 'fa' ? 'فنلاند' : 'Finland' },
    { value: 'netherlands', label: language === 'fa' ? 'هلند' : 'Netherlands' }
  ];

  const proLocations = [
    { value: 'germany-direct', label: language === 'fa' ? 'آلمان - مستقیم' : 'Germany Direct' },
    { value: 'germany-tunnel', label: language === 'fa' ? 'آلمان - تونل' : 'Germany Tunnel' },
    { value: 'netherlands-direct', label: language === 'fa' ? 'هلند - مستقیم' : 'Netherlands Direct' },
    { value: 'netherlands-tunnel', label: language === 'fa' ? 'هلند - تونل' : 'Netherlands Tunnel' },
    { value: 'turkey-direct', label: language === 'fa' ? 'ترکیه - مستقیم' : 'Turkey Direct' },
    { value: 'turkey-tunnel', label: language === 'fa' ? 'ترکیه - تونل' : 'Turkey Tunnel' },
    { value: 'uk-direct', label: language === 'fa' ? 'انگلیس - مستقیم' : 'UK Direct' },
    { value: 'uk-tunnel', label: language === 'fa' ? 'انگلیس - تونل' : 'UK Tunnel' },
    { value: 'us-direct', label: language === 'fa' ? 'آمریکا - مستقیم' : 'US Direct' },
    { value: 'us-tunnel', label: language === 'fa' ? 'آمریکا - تونل' : 'US Tunnel' },
    { value: 'poland-tunnel', label: language === 'fa' ? 'لهستان - تونل' : 'Poland Tunnel' },
    { value: 'finland-tunnel', label: language === 'fa' ? 'فنلاند - تونل' : 'Finland Tunnel' }
  ];

  const plans = [
    {
      id: 'lite',
      name: t('pricing.lite'),
      price: language === 'fa' ? '۹۹,۰۰۰ تومان' : '$12',
      description: language === 'fa' ? 'اتصال سبک با موقعیت‌های محدود و سرعت متعادل' : 'A lightweight access option with limited locations and moderate speed',
      features: [
        language === 'fa' ? 'سرعت متعادل' : 'Moderate speed',
        language === 'fa' ? 'موقعیت‌های سرور محدود' : 'Limited server locations',
        language === 'fa' ? 'مناسب برای مرور و پیام‌رسانی' : 'Suitable for browsing and messaging'
      ],
      locations: liteLocations
    },
    {
      id: 'pro',
      name: t('pricing.pro'),
      price: language === 'fa' ? '۱۹۹,۰۰۰ تومان' : '$24',
      description: language === 'fa' ? 'پلن پریمیوم با دسترسی جهانی کامل، بالاترین سرعت و اتصالات پایدار' : 'A premium connection plan with full global access, highest speed, and stable connections',
      features: [
        language === 'fa' ? 'اتصالات تونل پرسرعت' : 'High-speed tunnel connections',
        language === 'fa' ? 'دسترسی کامل به موقعیت‌ها' : 'Full location access',
        language === 'fa' ? 'عملکرد قابل اعتماد با پروتکل‌های مقاوم در برابر سانسور' : 'Reliable performance with censorship-resistant protocols'
      ],
      locations: proLocations,
      popular: true
    }
  ];

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    console.log('Form submitted:', formData);
    // Handle form submission here
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">{t('subscription.step1')}</h3>
              <p className="text-muted-foreground">
                {language === 'fa' ? 'پلن مناسب خود را انتخاب کنید' : 'Choose the plan that suits you'}
              </p>
            </div>
            
            <div className="grid gap-6">
              {plans.map((plan) => (
                <Card 
                  key={plan.id}
                  className={`p-6 cursor-pointer transition-all duration-300 ${
                    formData.plan === plan.id 
                      ? 'border-primary bg-primary/5 shadow-lg' 
                      : 'border-border hover:border-primary/50 hover:shadow-md'
                  } ${plan.popular ? 'ring-2 ring-primary/20' : ''}`}
                  onClick={() => setFormData({ ...formData, plan: plan.id })}
                >
                  {plan.popular && (
                    <div className="flex justify-center mb-4">
                      <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                        {t('pricing.most-popular')}
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center mb-4">
                    <h4 className="text-xl font-bold mb-2">{plan.name}</h4>
                    <div className="text-2xl font-bold text-primary mb-2">{plan.price}</div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm">
                        <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm font-medium mb-2">
                      {language === 'fa' ? 'موقعیت‌های سرور:' : 'Server Locations:'}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      {plan.locations.map(loc => loc.label).join(', ')}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">{t('subscription.step2')}</h3>
              <p className="text-muted-foreground">
                {language === 'fa' ? 'اطلاعات خود را وارد کنید' : 'Enter your information'}
              </p>
            </div>
            
            <div className="grid gap-4">
              <div>
                <Label htmlFor="email">{t('subscription.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="username">{t('subscription.username')}</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="promo">{t('subscription.promo-code')}</Label>
                <Input
                  id="promo"
                  value={formData.promoCode}
                  onChange={(e) => setFormData({ ...formData, promoCode: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">{t('subscription.step3')}</h3>
              <p className="text-muted-foreground">
                {language === 'fa' ? 'تنظیمات نهایی اشتراک' : 'Final subscription settings'}
              </p>
            </div>
            
            <div className="grid gap-4">
              <div>
                <Label>{t('subscription.data-volume')}</Label>
                <Select value={formData.dataVolume} onValueChange={(value) => setFormData({ ...formData, dataVolume: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50gb">50 GB</SelectItem>
                    <SelectItem value="100gb">100 GB</SelectItem>
                    <SelectItem value="unlimited">{language === 'fa' ? 'نامحدود' : 'Unlimited'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>{t('subscription.duration')}</Label>
                <Select value={formData.duration} onValueChange={(value) => setFormData({ ...formData, duration: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1month">{language === 'fa' ? '۱ ماه' : '1 Month'}</SelectItem>
                    <SelectItem value="3months">{language === 'fa' ? '۳ ماه' : '3 Months'}</SelectItem>
                    <SelectItem value="6months">{language === 'fa' ? '۶ ماه' : '6 Months'}</SelectItem>
                    <SelectItem value="12months">{language === 'fa' ? '۱۲ ماه' : '12 Months'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>{t('subscription.protocol')}</Label>
                <Select value={formData.protocol} onValueChange={(value) => setFormData({ ...formData, protocol: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vless">VLESS</SelectItem>
                    <SelectItem value="vmess">VMess</SelectItem>
                    <SelectItem value="trojan">Trojan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>{t('subscription.location')}</Label>
                <Select value={formData.location} onValueChange={(value) => setFormData({ ...formData, location: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(formData.plan === 'lite' ? liteLocations : proLocations).map((location) => (
                      <SelectItem key={location.value} value={location.value}>
                        {location.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">{t('subscription.title')}</h2>
          <p className="text-xl text-muted-foreground">{t('subscription.subtitle')}</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                  currentStep >= step.number 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : 'border-border text-muted-foreground'
                }`}>
                  {currentStep > step.number ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{step.number}</span>
                  )}
                </div>
                <span className={`mx-3 text-sm font-medium ${
                  currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 ${
                    currentStep > step.number ? 'bg-primary' : 'bg-border'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <Card className="p-8">
          {renderStepContent()}
          
          {/* Navigation Buttons */}
          <div className={`flex justify-between mt-8 pt-6 border-t border-border ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`${isRTL ? 'ml-auto' : ''}`}
            >
              <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-2 rotate-180' : 'mr-2'}`} />
              {language === 'fa' ? 'قبلی' : 'Previous'}
            </Button>
            
            {currentStep < 3 ? (
              <Button onClick={nextStep} disabled={!formData.plan && currentStep === 1}>
                {language === 'fa' ? 'بعدی' : 'Next'}
                <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
              </Button>
            ) : (
              <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">
                {t('subscription.purchase')}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
};

export default ModernSubscriptionForm;
