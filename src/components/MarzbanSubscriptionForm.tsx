
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, Copy, Download, CheckCircle, AlertCircle, Globe, Shield, Zap, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MarzbanFormData {
  username: string;
  dataLimit: number; // in GB
  duration: number; // in days
  inbound: string;
  notes: string;
}

interface MarzbanResponse {
  username: string;
  subscription_url: string;
  expire: number;
  data_limit: number;
}

const MarzbanSubscriptionForm = () => {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const [formData, setFormData] = useState<MarzbanFormData>({
    username: '',
    dataLimit: 10,
    duration: 30,
    inbound: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<MarzbanResponse | null>(null);
  const [step, setStep] = useState(1);

  const serverLocations = [
    { value: 'vless_tcp_ws', labelEn: 'VLESSTCP (WS)', labelFa: 'VLESSTCP (WS)' },
    { value: 'vless_dubai_ws', labelEn: 'DUBAI (WS)', labelFa: 'دبی (WS)' },
    { value: 'vless_israel_ws', labelEn: 'ISRAEL (WS)', labelFa: 'اسرائیل (WS)' },
    { value: 'vless_finland_tcp', labelEn: 'FINLAND (TCP)', labelFa: 'فنلاند (TCP)' },
    { value: 'vless_usac_http', labelEn: 'USAC (HTTPUPGRADE)', labelFa: 'آمریکا (HTTPUPGRADE)' },
    { value: 'vless_info_ws', labelEn: 'INFO_PROTOCOL (WS)', labelFa: 'INFO_PROTOCOL (WS)' }
  ];

  const generateUsername = () => {
    const prefix = 'bnets_';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5);
    return `${prefix}${timestamp}_${random}`;
  };

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const validateForm = (): boolean => {
    // Username validation
    const usernameRegex = /^[a-z0-9_]+$/;
    if (!formData.username || !usernameRegex.test(formData.username)) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'نام کاربری فقط می‌تواند شامل حروف انگلیسی کوچک، اعداد و زیرخط باشد' : 
          'Username can only contain lowercase letters, numbers, and underscores',
        variant: 'destructive'
      });
      return false;
    }

    // Data limit validation
    if (formData.dataLimit < 1 || formData.dataLimit > 500) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'حجم داده باید بین ۱ تا ۵۰۰ گیگابایت باشد' : 
          'Data volume must be between 1 and 500 GB',
        variant: 'destructive'
      });
      return false;
    }

    // Duration validation
    if (formData.duration < 1 || formData.duration > 180) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'مدت زمان باید بین ۱ تا ۱۸۰ روز باشد' : 
          'Duration must be between 1 and 180 days',
        variant: 'destructive'
      });
      return false;
    }

    // Server location validation
    if (!formData.inbound) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'لطفاً موقعیت سرور را انتخاب کنید' : 
          'Please select a server location',
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  const createMarzbanUser = async (formData: MarzbanFormData): Promise<MarzbanResponse> => {
    // Step 1: Get access token
    const tokenResponse = await fetch('https://file.shopifysb.xyz:8000/api/admin/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: 'bnets',
        password: 'reza1234',
        grant_type: 'password'
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to authenticate with Marzban API');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Step 2: Create user
    const expireTimestamp = Math.floor(Date.now() / 1000) + (formData.duration * 86400);
    const dataLimitBytes = formData.dataLimit * 1073741824; // Convert GB to bytes
    const userUUID = generateUUID();

    const userData = {
      username: formData.username,
      status: 'active',
      expire: expireTimestamp,
      data_limit: dataLimitBytes,
      data_limit_reset_strategy: 'no_reset',
      inbounds: {
        vless: [formData.inbound]
      },
      proxies: {
        vless: {
          id: userUUID
        }
      },
      note: `From bnets.co form - ${formData.notes}`,
      next_plan: {
        add_remaining_traffic: false,
        data_limit: 0,
        expire: 0,
        fire_on_either: true
      }
    };

    const userResponse = await fetch('https://file.shopifysb.xyz:8000/api/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(userData)
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      throw new Error(errorData.detail || 'Failed to create user');
    }

    const responseData = await userResponse.json();
    return {
      username: responseData.username,
      subscription_url: responseData.subscription_url,
      expire: responseData.expire,
      data_limit: responseData.data_limit
    };
  };

  const handleInputChange = (field: keyof MarzbanFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      const result = await createMarzbanUser(formData);
      setResult(result);
      setStep(2);
      
      toast({
        title: language === 'fa' ? 'موفق' : 'Success',
        description: language === 'fa' ? 
          'اشتراک VPN شما با موفقیت ایجاد شد' : 
          'Your VPN subscription has been created successfully',
      });
    } catch (error) {
      console.error('Marzban API Error:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'خطا در ایجاد اشتراک. لطفاً دوباره تلاش کنید' : 
          'Failed to create subscription. Please try again',
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
      description: language === 'fa' ? 
        'لینک اشتراک کپی شد' : 
        'Subscription link copied to clipboard',
    });
  };

  const downloadConfig = () => {
    if (!result) return;
    
    const blob = new Blob([result.subscription_url], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.username}-subscription.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const autoGenerateUsername = () => {
    const generated = generateUsername();
    setFormData(prev => ({ ...prev, username: generated }));
  };

  // Success page
  if (step === 2 && result) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-green-800 dark:text-green-200">
              {language === 'fa' ? 'اشتراک VPN آماده است!' : 'VPN Subscription Ready!'}
            </CardTitle>
            <CardDescription className="text-green-600 dark:text-green-400">
              {language === 'fa' ? 
                'پیکربندی VLESS شما با موفقیت ایجاد شد' : 
                'Your VLESS configuration has been created successfully'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label>{language === 'fa' ? 'نام کاربری' : 'Username'}</Label>
                <p className="font-mono text-lg">{result.username}</p>
              </div>
              <div>
                <Label>{language === 'fa' ? 'تاریخ انقضا' : 'Expiry Date'}</Label>
                <p>{new Date(result.expire * 1000).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-lg font-semibold">
                {language === 'fa' ? 'لینک اشتراک VLESS' : 'VLESS Subscription Link'}
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
                      onClick={() => copyToClipboard(result.subscription_url)}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      {language === 'fa' ? 'کپی' : 'Copy'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={downloadConfig}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      {language === 'fa' ? 'دانلود' : 'Download'}
                    </Button>
                  </div>
                </div>
                <code className="text-xs break-all text-gray-800 dark:text-gray-200 block p-2 bg-white dark:bg-gray-900 rounded">
                  {result.subscription_url}
                </code>
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
                        '• از V2Ray یا کلاینت‌های سازگار با VLESS استفاده کنید' : 
                        '• Use V2Ray or VLESS-compatible clients'
                      }
                    </li>
                    <li>
                      {language === 'fa' ? 
                        '• این لینک را در مکان امن نگهداری کنید' : 
                        '• Keep this link in a secure place'
                      }
                    </li>
                    <li>
                      {language === 'fa' ? 
                        '• برای پشتیبانی با تلگرام ما تماس بگیرید' : 
                        '• Contact our Telegram support for help'
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

  // Form page
  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="bg-background border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground mb-2">
            {language === 'fa' ? 'خرید اشتراک VPN شبکه بدون مرز' : 'Boundless Network VPN Subscription'}
          </CardTitle>
          <CardDescription>
            {language === 'fa' ? 
              'اشتراک VLESS سفارشی خود را ایجاد کنید' : 
              'Create your custom VLESS subscription'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                {language === 'fa' ? 'اطلاعات کاربری' : 'User Information'}
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="username">
                  {language === 'fa' ? 'نام کاربری' : 'Username'} *
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value.toLowerCase())}
                    placeholder={language === 'fa' ? 'نام کاربری (a-z, 0-9, _)' : 'Username (a-z, 0-9, _)'}
                    className="flex-1"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={autoGenerateUsername}
                  >
                    {language === 'fa' ? 'تولید خودکار' : 'Auto Generate'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">
                  {language === 'fa' ? 'یادداشت (اختیاری)' : 'Notes (Optional)'}
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder={language === 'fa' ? 'شناسه تلگرام، ایمیل یا سایر اطلاعات' : 'Telegram ID, email, or other info'}
                  rows={3}
                />
              </div>
            </div>

            {/* Subscription Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                {language === 'fa' ? 'پیکربندی اشتراک' : 'Subscription Configuration'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataLimit">
                    {language === 'fa' ? 'حجم داده (گیگابایت)' : 'Data Volume (GB)'} *
                  </Label>
                  <Input
                    id="dataLimit"
                    type="number"
                    min="1"
                    max="500"
                    value={formData.dataLimit}
                    onChange={(e) => handleInputChange('dataLimit', parseInt(e.target.value) || 0)}
                    placeholder={language === 'fa' ? '۱۰' : '10'}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">
                    {language === 'fa' ? 'مدت زمان (روز)' : 'Duration (Days)'} *
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    max="180"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
                    placeholder={language === 'fa' ? '۳۰' : '30'}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{language === 'fa' ? 'موقعیت سرور' : 'Server Location'} *</Label>
                <Select value={formData.inbound} onValueChange={(value) => handleInputChange('inbound', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'fa' ? 'سرور را انتخاب کنید' : 'Select server'} />
                  </SelectTrigger>
                  <SelectContent>
                    {serverLocations.map((location) => (
                      <SelectItem key={location.value} value={location.value}>
                        {language === 'fa' ? location.labelFa : location.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
              size="lg"
            >
              {isSubmitting ? (
                language === 'fa' ? 'در حال ایجاد اشتراک...' : 'Creating Subscription...'
              ) : (
                language === 'fa' ? 'ایجاد اشتراک VPN' : 'Create VPN Subscription'
              )}
            </Button>

            {/* Terms */}
            <p className="text-sm text-muted-foreground text-center">
              {language === 'fa' ? 
                'با ایجاد اشتراک، شما با قوانین و مقررات شبکه بدون مرز موافقت می‌کنید' : 
                'By creating a subscription, you agree to Boundless Network terms and conditions'
              }
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarzbanSubscriptionForm;
