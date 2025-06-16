
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, Copy, Download, CheckCircle, AlertCircle, Globe, Shield, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionFormData {
  email: string;
  username: string;
  dataVolume: string;
  duration: string;
  protocol: string;
  location: string;
  promoCode: string;
}

interface ConfigResult {
  configUrl: string;
  qrCode: string;
  username: string;
  expiryDate: string;
  dataLimit: string;
}

const SubscriptionForm = () => {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const [formData, setFormData] = useState<SubscriptionFormData>({
    email: '',
    username: '',
    dataVolume: '',
    duration: '',
    protocol: '',
    location: '',
    promoCode: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [configResult, setConfigResult] = useState<ConfigResult | null>(null);
  const [step, setStep] = useState(1);

  const dataVolumeOptions = [
    { value: '10gb', labelEn: '10 GB', labelFa: '۱۰ گیگابایت', price: '$5' },
    { value: '50gb', labelEn: '50 GB', labelFa: '۵۰ گیگابایت', price: '$15' },
    { value: 'unlimited', labelEn: 'Unlimited', labelFa: 'نامحدود', price: '$25' }
  ];

  const durationOptions = [
    { value: '7days', labelEn: '7 Days', labelFa: '۷ روز' },
    { value: '30days', labelEn: '30 Days', labelFa: '۳۰ روز' },
    { value: '90days', labelEn: '90 Days', labelFa: '۹۰ روز' }
  ];

  const protocolOptions = [
    { value: 'vmess', labelEn: 'VMess', labelFa: 'VMess' },
    { value: 'vless', labelEn: 'VLESS', labelFa: 'VLESS' },
    { value: 'trojan', labelEn: 'Trojan', labelFa: 'Trojan' }
  ];

  const locationOptions = [
    { value: 'germany', labelEn: 'Germany', labelFa: 'آلمان' },
    { value: 'netherlands', labelEn: 'Netherlands', labelFa: 'هلند' },
    { value: 'finland', labelEn: 'Finland', labelFa: 'فنلاند' },
    { value: 'turkey', labelEn: 'Turkey', labelFa: 'ترکیه' },
    { value: 'uk', labelEn: 'United Kingdom', labelFa: 'انگلستان' },
    { value: 'usa', labelEn: 'United States', labelFa: 'آمریکا' },
    { value: 'poland', labelEn: 'Poland', labelFa: 'لهستان' }
  ];

  const handleInputChange = (field: keyof SubscriptionFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.username || !formData.dataVolume || 
        !formData.duration || !formData.protocol || !formData.location) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'لطفاً تمام فیلدهای ضروری را پر کنید' : 'Please fill in all required fields',
        variant: 'destructive'
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'لطفاً ایمیل معتبری وارد کنید' : 'Please enter a valid email address',
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  const createMarzbanUser = async (formData: SubscriptionFormData): Promise<ConfigResult> => {
    // Mock API call - replace with actual Marzban API integration
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate API response
    const mockConfig = {
      configUrl: `vmess://eyJ2IjoiMiIsInBzIjoi7J207J287YWM77yM7J207YW47ZqM7Yq4IiwiaWQiOiI1Njg5ZTI0ZS03ZWI4LTQ5MDUtOWNmMy0zZjkwNzg4YzQwZTQiLCJhZGQiOiIxODUuMTQyLjEuMjU1IiwicG9ydCI6IjgwODAiLCJ0eXBlIjoidm1lc3MiLCJuZXQiOiJ3cyIsInBhdGgiOiIvdm1lc3MifQ==`,
      qrCode: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`,
      username: formData.username,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dataLimit: formData.dataVolume
    };

    return mockConfig;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      const result = await createMarzbanUser(formData);
      setConfigResult(result);
      setStep(3);
      
      toast({
        title: language === 'fa' ? 'موفق' : 'Success',
        description: language === 'fa' ? 'اشتراک شما با موفقیت ایجاد شد' : 'Your subscription has been created successfully',
      });
    } catch (error) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در ایجاد اشتراک. لطفاً دوباره تلاش کنید' : 'Failed to create subscription. Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: language === 'fa' ? 'کپی شد' : 'Copied',
      description: language === 'fa' ? 'پیکربندی کپی شد' : 'Configuration copied to clipboard',
    });
  };

  const downloadConfig = () => {
    if (!configResult) return;
    
    const blob = new Blob([configResult.configUrl], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${configResult.username}-config.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (step === 3 && configResult) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-green-800 dark:text-green-200">
              {language === 'fa' ? 'اشتراک شما آماده است!' : 'Your Subscription is Ready!'}
            </CardTitle>
            <CardDescription className="text-green-600 dark:text-green-400">
              {language === 'fa' ? 
                'پیکربندی شبکه شما با موفقیت ایجاد شد' : 
                'Your network configuration has been created successfully'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label>{language === 'fa' ? 'نام کاربری' : 'Username'}</Label>
                <p className="font-mono">{configResult.username}</p>
              </div>
              <div>
                <Label>{language === 'fa' ? 'تاریخ انقضا' : 'Expiry Date'}</Label>
                <p>{configResult.expiryDate}</p>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-lg font-semibold">
                {language === 'fa' ? 'پیکربندی شبکه' : 'Network Configuration'}
              </Label>
              
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {language === 'fa' ? 'لینک پیکربندی' : 'Configuration Link'}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(configResult.configUrl)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={downloadConfig}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <code className="text-xs break-all text-gray-800 dark:text-gray-200">
                  {configResult.configUrl}
                </code>
              </div>

              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg">
                  <QrCode className="w-32 h-32 text-gray-800" />
                  <p className="text-center text-sm text-gray-600 mt-2">
                    {language === 'fa' ? 'QR کد پیکربندی' : 'Configuration QR Code'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-semibold mb-1">
                    {language === 'fa' ? 'نکات مهم' : 'Important Notes'}
                  </p>
                  <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                    <li>
                      {language === 'fa' ? 
                        '• این پیکربندی را در مکان امن نگهداری کنید' : 
                        '• Keep this configuration in a secure place'
                      }
                    </li>
                    <li>
                      {language === 'fa' ? 
                        '• برای پشتیبانی با ما تماس بگیرید' : 
                        '• Contact our support team if you need help'
                      }
                    </li>
                    <li>
                      {language === 'fa' ? 
                        '• از قوانین استفاده پیروی کنید' : 
                        '• Follow our usage policy'
                      }
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button onClick={() => window.open('https://t.me/getbnbot', '_blank')}>
                {language === 'fa' ? 'دریافت پشتیبانی' : 'Get Support'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="bg-background border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground mb-2">
            {language === 'fa' ? 'خرید اشتراک شبکه' : 'Network Subscription Purchase'}
          </CardTitle>
          <CardDescription>
            {language === 'fa' ? 
              'اشتراک شبکه بدون مرز خود را انتخاب کنید' : 
              'Choose your Boundless Network subscription'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                {language === 'fa' ? 'اطلاعات کاربری' : 'User Information'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    {language === 'fa' ? 'ایمیل' : 'Email'} *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder={language === 'fa' ? 'example@email.com' : 'example@email.com'}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="username">
                    {language === 'fa' ? 'نام کاربری' : 'Username'} *
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder={language === 'fa' ? 'نام کاربری دلخواه' : 'Choose username'}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Subscription Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                {language === 'fa' ? 'گزینه‌های اشتراک' : 'Subscription Options'}
              </h3>

              {/* Data Volume */}
              <div className="space-y-3">
                <Label>{language === 'fa' ? 'حجم داده' : 'Data Volume'} *</Label>
                <RadioGroup
                  value={formData.dataVolume}
                  onValueChange={(value) => handleInputChange('dataVolume', value)}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  {dataVolumeOptions.map((option) => (
                    <div key={option.value}>
                      <Label
                        htmlFor={option.value}
                        className="flex items-center space-x-2 space-x-reverse cursor-pointer border rounded-lg p-4 hover:bg-muted/50"
                      >
                        <RadioGroupItem value={option.value} id={option.value} />
                        <div className="flex-1">
                          <div className="font-medium">
                            {language === 'fa' ? option.labelFa : option.labelEn}
                          </div>
                          <Badge variant="secondary" className="mt-1">
                            {option.price}
                          </Badge>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label>{language === 'fa' ? 'مدت زمان' : 'Duration'} *</Label>
                <Select value={formData.duration} onValueChange={(value) => handleInputChange('duration', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'fa' ? 'مدت زمان را انتخاب کنید' : 'Select duration'} />
                  </SelectTrigger>
                  <SelectContent>
                    {durationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {language === 'fa' ? option.labelFa : option.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Network Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                {language === 'fa' ? 'پیکربندی شبکه' : 'Network Configuration'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'fa' ? 'پروتکل' : 'Protocol'} *</Label>
                  <Select value={formData.protocol} onValueChange={(value) => handleInputChange('protocol', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'fa' ? 'پروتکل را انتخاب کنید' : 'Select protocol'} />
                    </SelectTrigger>
                    <SelectContent>
                      {protocolOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {language === 'fa' ? option.labelFa : option.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{language === 'fa' ? 'موقعیت سرور' : 'Server Location'} *</Label>
                  <Select value={formData.location} onValueChange={(value) => handleInputChange('location', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'fa' ? 'موقعیت را انتخاب کنید' : 'Select location'} />
                    </SelectTrigger>
                    <SelectContent>
                      {locationOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {language === 'fa' ? option.labelFa : option.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Promo Code */}
            <div className="space-y-2">
              <Label htmlFor="promoCode">
                {language === 'fa' ? 'کد تخفیف (اختیاری)' : 'Promo Code (Optional)'}
              </Label>
              <Input
                id="promoCode"
                type="text"
                value={formData.promoCode}
                onChange={(e) => handleInputChange('promoCode', e.target.value)}
                placeholder={language === 'fa' ? 'کد تخفیف را وارد کنید' : 'Enter promo code'}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
              size="lg"
            >
              {isSubmitting ? (
                language === 'fa' ? 'در حال پردازش...' : 'Processing...'
              ) : (
                language === 'fa' ? 'خرید اشتراک' : 'Purchase Subscription'
              )}
            </Button>

            {/* Terms */}
            <p className="text-sm text-muted-foreground text-center">
              {language === 'fa' ? 
                'با خرید اشتراک، شما با قوانین و مقررات ما موافقت می‌کنید' : 
                'By purchasing a subscription, you agree to our terms and conditions'
              }
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionForm;
