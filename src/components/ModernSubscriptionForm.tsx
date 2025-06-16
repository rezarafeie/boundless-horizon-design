
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Shield, Zap, Loader, CheckCircle } from 'lucide-react';
import { MarzneshinApiService } from '@/services/marzneshinApi';

interface Plan {
  id: 'lite' | 'pro';
  name: string;
  nameEn: string;
  nameFa: string;
  description: string;
  descriptionEn: string;
  descriptionFa: string;
  price: number;
  features: string[];
  featuresEn: string[];
  featuresFa: string[];
  icon: React.ComponentType<any>;
}

interface SubscriptionResult {
  username: string;
  subscription_url: string;
  expire: number;
  data_limit: number;
}

const ModernSubscriptionForm = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    dataLimit: '30',
    duration: '30'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SubscriptionResult | null>(null);

  const plans: Plan[] = [
    {
      id: 'lite',
      name: 'شبکه بدون مرز لایت',
      nameEn: 'Boundless Network Lite',
      nameFa: 'شبکه بدون مرز لایت',
      description: 'سرعت متوسط، سرورهای محدود',
      descriptionEn: 'Moderate speed, limited servers',
      descriptionFa: 'سرعت متوسط، سرورهای محدود',
      price: 15000,
      features: ['آلمان', 'فنلاند', 'هلند'],
      featuresEn: ['Germany', 'Finland', 'Netherlands'],
      featuresFa: ['آلمان', 'فنلاند', 'هلند'],
      icon: Shield
    },
    {
      id: 'pro',
      name: 'شبکه بدون مرز پرو',
      nameEn: 'Boundless Network Pro',
      nameFa: 'شبکه بدون مرز پرو',
      description: 'سرعت بالا، تمام سرورها',
      descriptionEn: 'High speed, all servers',
      descriptionFa: 'سرعت بالا، تمام سرورها',
      price: 25000,
      features: ['آلمان', 'هلند', 'ترکیه', 'انگلستان', 'آمریکا', 'لهستان', 'فنلاند'],
      featuresEn: ['Germany', 'Netherlands', 'Turkey', 'UK', 'US', 'Poland', 'Finland'],
      featuresFa: ['آلمان', 'هلند', 'ترکیه', 'انگلستان', 'آمریکا', 'لهستان', 'فنلاند'],
      icon: Zap
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'لطفاً یک پلن انتخاب کنید' : 'Please select a plan',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create subscription based on selected plan
      const subscriptionData = await MarzneshinApiService.createUser({
        username: formData.username || `user_${Date.now()}`,
        dataLimitGB: parseInt(formData.dataLimit),
        durationDays: parseInt(formData.duration),
        notes: `${selectedPlan.name} - ${formData.email || 'No email'}`
      });

      setResult({
        username: subscriptionData.username,
        subscription_url: subscriptionData.subscription_url,
        expire: subscriptionData.expire || Math.floor(Date.now() / 1000) + (parseInt(formData.duration) * 24 * 60 * 60),
        data_limit: subscriptionData.data_limit
      });

      toast({
        title: language === 'fa' ? 'موفق' : 'Success',
        description: language === 'fa' ? 'اشتراک شما ایجاد شد!' : 'Your subscription has been created!',
      });

    } catch (error) {
      console.error('Subscription creation error:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: error instanceof Error ? error.message : (
          language === 'fa' ? 'خطا در ایجاد اشتراک' : 'Failed to create subscription'
        ),
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: language === 'fa' ? 'کپی شد' : 'Copied',
      description: language === 'fa' ? 'لینک کپی شد' : 'Link copied to clipboard',
    });
  };

  if (result) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-green-800 dark:text-green-200">
              {language === 'fa' ? 'اشتراک شما آماده است!' : 'Your Subscription is Ready!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-green-700 dark:text-green-300">
                {language === 'fa' ? 'نام کاربری:' : 'Username:'}
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input value={result.username} readOnly className="bg-white dark:bg-gray-800" />
                <Button size="sm" onClick={() => copyToClipboard(result.username)}>
                  {language === 'fa' ? 'کپی' : 'Copy'}
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-green-700 dark:text-green-300">
                {language === 'fa' ? 'لینک اشتراک:' : 'Subscription Link:'}
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input value={result.subscription_url} readOnly className="bg-white dark:bg-gray-800" />
                <Button size="sm" onClick={() => copyToClipboard(result.subscription_url)}>
                  {language === 'fa' ? 'کپی' : 'Copy'}
                </Button>
              </div>
            </div>
            <Button 
              onClick={() => setResult(null)} 
              variant="outline" 
              className="w-full mt-6"
            >
              {language === 'fa' ? 'اشتراک جدید' : 'New Subscription'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">
          {language === 'fa' ? 'خرید اشتراک' : 'Purchase Subscription'}
        </h2>
        <p className="text-muted-foreground">
          {language === 'fa' ? 'پلن مورد نظر خود را انتخاب کنید' : 'Choose your preferred plan'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Plan Selection */}
        <div>
          <Label className="text-lg font-semibold mb-4 block">
            {language === 'fa' ? 'انتخاب پلن' : 'Select Plan'}
          </Label>
          <RadioGroup
            value={selectedPlan?.id || ''}
            onValueChange={(value) => {
              const plan = plans.find(p => p.id === value);
              setSelectedPlan(plan || null);
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {plans.map((plan) => {
              const IconComponent = plan.icon;
              return (
                <Card 
                  key={plan.id} 
                  className={`cursor-pointer transition-all ${
                    selectedPlan?.id === plan.id 
                      ? 'ring-2 ring-primary border-primary' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedPlan(plan)}
                >
                  <CardHeader className="pb-3">
                    <RadioGroupItem value={plan.id} className="sr-only" />
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {language === 'fa' ? plan.nameFa : plan.nameEn}
                        </CardTitle>
                        <Badge variant="secondary">
                          {plan.price.toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="mb-3">
                      {language === 'fa' ? plan.descriptionFa : plan.descriptionEn}
                    </CardDescription>
                    <div className="flex flex-wrap gap-1">
                      {(language === 'fa' ? plan.featuresFa : plan.featuresEn).map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </RadioGroup>
        </div>

        {/* User Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="username">
              {language === 'fa' ? 'نام کاربری (اختیاری)' : 'Username (Optional)'}
            </Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              placeholder={language === 'fa' ? 'نام کاربری دلخواه' : 'Your preferred username'}
            />
          </div>
          <div>
            <Label htmlFor="email">
              {language === 'fa' ? 'ایمیل (اختیاری)' : 'Email (Optional)'}
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder={language === 'fa' ? 'your@email.com' : 'your@email.com'}
            />
          </div>
        </div>

        {/* Subscription Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dataLimit">
              {language === 'fa' ? 'حجم داده (گیگابایت)' : 'Data Limit (GB)'}
            </Label>
            <Select value={formData.dataLimit} onValueChange={(value) => setFormData(prev => ({ ...prev, dataLimit: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 GB</SelectItem>
                <SelectItem value="30">30 GB</SelectItem>
                <SelectItem value="50">50 GB</SelectItem>
                <SelectItem value="100">100 GB</SelectItem>
                <SelectItem value="0">{language === 'fa' ? 'نامحدود' : 'Unlimited'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="duration">
              {language === 'fa' ? 'مدت زمان (روز)' : 'Duration (Days)'}
            </Label>
            <Select value={formData.duration} onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{language === 'fa' ? '۷ روز' : '7 Days'}</SelectItem>
                <SelectItem value="30">{language === 'fa' ? '۳۰ روز' : '30 Days'}</SelectItem>
                <SelectItem value="60">{language === 'fa' ? '۶۰ روز' : '60 Days'}</SelectItem>
                <SelectItem value="90">{language === 'fa' ? '۹۰ روز' : '90 Days'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full h-12 text-lg"
          disabled={!selectedPlan || isLoading}
        >
          {isLoading ? (
            <>
              <Loader className="w-5 h-5 mr-2 animate-spin" />
              {language === 'fa' ? 'در حال ایجاد...' : 'Creating...'}
            </>
          ) : (
            language === 'fa' ? 'ایجاد اشتراک' : 'Create Subscription'
          )}
        </Button>
      </form>
    </div>
  );
};

export default ModernSubscriptionForm;
