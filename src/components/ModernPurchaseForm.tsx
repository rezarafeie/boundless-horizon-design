
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle, ArrowRight, ArrowLeft, Star, Shield, Zap } from 'lucide-react';

interface PlanOption {
  id: 'lite' | 'pro';
  name: string;
  nameEn: string;
  nameFa: string;
  description: string;
  descriptionEn: string;
  descriptionFa: string;
  price: string;
  priceEn: string;
  priceFa: string;
  features: string[];
  featuresEn: string[];
  featuresFa: string[];
  servers: string[];
  serversEn: string[];
  serversFa: string[];
  popular?: boolean;
  icon: React.ComponentType<any>;
}

const ModernPurchaseForm = () => {
  const { language, t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [formData, setFormData] = useState({
    username: '',
    dataLimit: '1',
    duration: '30',
    notes: ''
  });

  const isRTL = language === 'fa';
  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const plans: PlanOption[] = [
    {
      id: 'lite',
      name: 'Boundless Network Lite',
      nameEn: 'Boundless Network Lite',
      nameFa: 'شبکه بدون مرز لایت',
      description: 'A lightweight access option for users who need basic connection with fewer locations and moderate speed',
      descriptionEn: 'A lightweight access option for users who need basic connection with fewer locations and moderate speed',
      descriptionFa: 'گزینه دسترسی سبک برای کاربرانی که به اتصال پایه با مکان‌های کمتر و سرعت متوسط نیاز دارند',
      price: '$12',
      priceEn: '$12',
      priceFa: '۹۹,۰۰۰ تومان',
      features: ['Moderate speed', 'Limited server locations', 'Suitable for basic browsing', '24/7 support'],
      featuresEn: ['Moderate speed', 'Limited server locations', 'Suitable for basic browsing', '24/7 support'],
      featuresFa: ['سرعت متوسط', 'مکان‌های سرور محدود', 'مناسب برای مرور پایه', 'پشتیبانی ۲۴/۷'],
      servers: ['Germany', 'Finland', 'Netherlands'],
      serversEn: ['Germany', 'Finland', 'Netherlands'],
      serversFa: ['آلمان', 'فنلاند', 'هلند'],
      icon: Shield
    },
    {
      id: 'pro',
      name: 'Boundless Network Pro',
      nameEn: 'Boundless Network Pro',
      nameFa: 'شبکه بدون مرز پرو',
      description: 'A premium connection plan with full global access, highest speed, and stable connections — especially optimized for streaming, remote work, and gaming',
      descriptionEn: 'A premium connection plan with full global access, highest speed, and stable connections — especially optimized for streaming, remote work, and gaming',
      descriptionFa: 'پلن اتصال پریمیوم با دسترسی کامل جهانی، بالاترین سرعت و اتصالات پایدار — به‌ویژه برای استریمینگ، کار از راه دور و بازی بهینه‌سازی شده',
      price: '$24',
      priceEn: '$24',
      priceFa: '۱۹۹,۰۰۰ تومان',
      features: ['High-speed connections', 'Full location access', 'Optimized for streaming', 'Priority support'],
      featuresEn: ['High-speed connections', 'Full location access', 'Optimized for streaming', 'Priority support'],
      featuresFa: ['اتصالات پرسرعت', 'دسترسی کامل مکان‌ها', 'بهینه برای استریمینگ', 'پشتیبانی اولویت‌دار'],
      servers: ['Germany (Direct/Tunnel)', 'Netherlands (Direct/Tunnel)', 'Turkey (Direct/Tunnel)', 'UK (Direct/Tunnel)', 'US (Direct/Tunnel)', 'Poland (Tunnel)', 'Finland (Tunnel)'],
      serversEn: ['Germany (Direct/Tunnel)', 'Netherlands (Direct/Tunnel)', 'Turkey (Direct/Tunnel)', 'UK (Direct/Tunnel)', 'US (Direct/Tunnel)', 'Poland (Tunnel)', 'Finland (Tunnel)'],
      serversFa: ['آلمان (مستقیم/تونل)', 'هلند (مستقیم/تونل)', 'ترکیه (مستقیم/تونل)', 'انگلیس (مستقیم/تونل)', 'آمریکا (مستقیم/تونل)', 'لهستان (تونل)', 'فنلاند (تونل)'],
      popular: true,
      icon: Zap
    }
  ];

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    // Handle form submission
    console.log('Form submitted:', { selectedPlan, formData });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">{t('purchase.plan-selection')}</h3>
              <p className="text-muted-foreground">
                {language === 'fa' ? 'پلن مناسب خود را انتخاب کنید' : 'Choose the plan that fits your needs'}
              </p>
            </div>
            
            <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan} className="space-y-4">
              {plans.map((plan) => {
                const IconComponent = plan.icon;
                return (
                  <div key={plan.id} className="relative">
                    <RadioGroupItem value={plan.id} id={plan.id} className="sr-only" />
                    <Label
                      htmlFor={plan.id}
                      className={`block cursor-pointer rounded-xl border-2 p-6 transition-all hover:border-primary ${
                        selectedPlan === plan.id ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <IconComponent className="w-6 h-6 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">
                              {language === 'fa' ? plan.nameFa : plan.nameEn}
                            </h4>
                            {plan.popular && (
                              <Badge className="bg-primary text-primary-foreground">
                                <Star className="w-3 h-3 mr-1" />
                                {t('pricing.most-popular')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {language === 'fa' ? plan.descriptionFa : plan.descriptionEn}
                          </p>
                          <div className="text-2xl font-bold mb-3">
                            {language === 'fa' ? plan.priceFa : plan.priceEn}
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                              {language === 'fa' ? '/ ماه' : '/ month'}
                            </span>
                          </div>
                          <div className="space-y-1 mb-3">
                            {(language === 'fa' ? plan.featuresFa : plan.featuresEn).map((feature, idx) => (
                              <div key={idx} className="flex items-center text-sm">
                                <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                                {feature}
                              </div>
                            ))}
                          </div>
                          <div className="text-sm">
                            <div className="font-medium mb-1">
                              {language === 'fa' ? 'سرورهای موجود:' : 'Available Servers:'}
                            </div>
                            <div className="text-muted-foreground">
                              {(language === 'fa' ? plan.serversFa : plan.serversEn).join(', ')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">{t('purchase.user-info')}</h3>
              <p className="text-muted-foreground">
                {language === 'fa' ? 'اطلاعات اشتراک خود را وارد کنید' : 'Enter your subscription details'}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="username">
                  {language === 'fa' ? 'نام کاربری' : 'Username'}
                </Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder={language === 'fa' ? 'نام کاربری خود را وارد کنید' : 'Enter your username'}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dataLimit">
                  {language === 'fa' ? 'حجم داده (گیگابایت)' : 'Data Limit (GB)'}
                </Label>
                <Input
                  id="dataLimit"
                  type="number"
                  value={formData.dataLimit}
                  onChange={(e) => setFormData({ ...formData, dataLimit: e.target.value })}
                  placeholder="1"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="duration">
                  {language === 'fa' ? 'مدت زمان (روز)' : 'Duration (Days)'}
                </Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="30"
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">
                  {language === 'fa' ? 'یادداشت (اختیاری)' : 'Notes (Optional)'}
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={language === 'fa' ? 'یادداشت اضافی...' : 'Additional notes...'}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        const selectedPlanData = plans.find(p => p.id === selectedPlan);
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">{t('purchase.final-step')}</h3>
              <p className="text-muted-foreground">
                {language === 'fa' ? 'اطلاعات اشتراک خود را بررسی کنید' : 'Review your subscription details'}
              </p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'fa' ? 'خلاصه سفارش' : 'Order Summary'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>{language === 'fa' ? 'پلن:' : 'Plan:'}</span>
                  <span className="font-medium">
                    {selectedPlanData ? (language === 'fa' ? selectedPlanData.nameFa : selectedPlanData.nameEn) : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{language === 'fa' ? 'نام کاربری:' : 'Username:'}</span>
                  <span className="font-medium">{formData.username}</span>
                </div>
                <div className="flex justify-between">
                  <span>{language === 'fa' ? 'حجم داده:' : 'Data Limit:'}</span>
                  <span className="font-medium">{formData.dataLimit} GB</span>
                </div>
                <div className="flex justify-between">
                  <span>{language === 'fa' ? 'مدت زمان:' : 'Duration:'}</span>
                  <span className="font-medium">{formData.duration} {language === 'fa' ? 'روز' : 'days'}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>{language === 'fa' ? 'قیمت کل:' : 'Total Price:'}</span>
                    <span>
                      {selectedPlanData ? (language === 'fa' ? selectedPlanData.priceFa : selectedPlanData.priceEn) : ''}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
          {t('purchase.title')}
        </h2>
        <p className="text-xl text-muted-foreground">
          {language === 'fa' ? 'دسترسی امن و سریع به شبکه را تجربه کنید' : 'Experience secure and fast network access'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm font-medium mb-2">
          <span>{t('purchase.step1')}</span>
          <span>{t('purchase.step2')}</span>
          <span>{t('purchase.step3')}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Form Content */}
      <Card className="p-8">
        {renderStepContent()}
        
        {/* Navigation Buttons */}
        <div className={`flex justify-between mt-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className={isRTL ? 'ml-auto' : ''}
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-2 rotate-180' : 'mr-2'}`} />
            {t('common.back')}
          </Button>
          
          {currentStep === totalSteps ? (
            <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">
              {t('common.submit')}
              <CheckCircle className={`w-4 h-4 ${isRTL ? 'mr-2' : 'ml-2'}`} />
            </Button>
          ) : (
            <Button 
              onClick={handleNext}
              disabled={currentStep === 1 && !selectedPlan}
              className="bg-primary hover:bg-primary/90"
            >
              {t('common.continue')}
              <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ModernPurchaseForm;
