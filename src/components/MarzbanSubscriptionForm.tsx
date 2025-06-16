
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, Copy, Download, CheckCircle, AlertCircle, User, Zap, ChevronDown, ChevronUp, Bug } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MarzbanFormData {
  username: string;
  dataLimit: number; // in GB
  duration: number; // in days
  notes: string;
}

interface MarzbanResponse {
  username: string;
  subscription_url: string;
  expire: number;
  data_limit: number;
}

interface DebugInfo {
  endpoint: string;
  status: number;
  request: any;
  response: any;
  error?: string;
}

const MarzbanSubscriptionForm = () => {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const [formData, setFormData] = useState<MarzbanFormData>({
    username: '',
    dataLimit: 10,
    duration: 30,
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<MarzbanResponse | null>(null);
  const [step, setStep] = useState(1);
  const [debugMode, setDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [rateLimitMap, setRateLimitMap] = useState<Map<string, number>>(new Map());

  // Fixed configuration
  const FIXED_INBOUND = 'reza';
  const FIXED_UUID = '70f64bea-a84c-4feb-ac0e-fb796657790f'; // Fixed UUID for Dubai server

  useEffect(() => {
    // Check for debug mode in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    setDebugMode(urlParams.get('debug') === 'true');
  }, []);

  const generateUsername = () => {
    const prefix = 'bnets_';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5);
    return `${prefix}${timestamp}_${random}`;
  };

  const addDebugInfo = (info: DebugInfo) => {
    setDebugInfo(prev => [...prev, info]);
  };

  const checkRateLimit = (): boolean => {
    const clientIP = 'user_ip'; // In a real app, you'd get this from the server
    const now = Date.now();
    const lastRequest = rateLimitMap.get(clientIP) || 0;
    
    if (now - lastRequest < 30000) { // 30 seconds rate limit
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'لطفاً ۳۰ ثانیه صبر کنید قبل از تلاش مجدد' : 
          'Please wait 30 seconds before trying again',
        variant: 'destructive'
      });
      return false;
    }
    
    setRateLimitMap(prev => new Map(prev.set(clientIP, now)));
    return true;
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

    return true;
  };

  const sanitizeInput = (input: string): string => {
    return input.replace(/[<>'"]/g, '').trim();
  };

  const createMarzbanUser = async (formData: MarzbanFormData): Promise<MarzbanResponse> => {
    // Step 1: Get access token
    const tokenEndpoint = 'https://file.shopifysb.xyz:8000/api/admin/token';
    const tokenRequestData = {
      username: 'bnets',
      password: 'reza1234',
      grant_type: 'password'
    };

    try {
      const tokenResponse = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenRequestData)
      });

      addDebugInfo({
        endpoint: tokenEndpoint,
        status: tokenResponse.status,
        request: tokenRequestData,
        response: tokenResponse.ok ? 'Token received' : 'Token failed'
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        addDebugInfo({
          endpoint: tokenEndpoint,
          status: tokenResponse.status,
          request: tokenRequestData,
          response: errorData,
          error: 'Authentication failed'
        });
        throw new Error('Failed to authenticate with Marzban API');
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Step 2: Create user with fixed inbound
      const expireTimestamp = Math.floor(Date.now() / 1000) + (formData.duration * 86400);
      const dataLimitBytes = formData.dataLimit * 1073741824; // Convert GB to bytes

      const userData = {
        username: sanitizeInput(formData.username),
        status: 'active',
        expire: expireTimestamp,
        data_limit: dataLimitBytes,
        data_limit_reset_strategy: 'no_reset',
        inbounds: {
          vless: [FIXED_INBOUND]
        },
        proxies: {
          vless: {
            id: FIXED_UUID
          }
        },
        note: `From bnets.co form - ${sanitizeInput(formData.notes)}`,
        next_plan: {
          add_remaining_traffic: false,
          data_limit: 0,
          expire: 0,
          fire_on_either: true
        }
      };

      const userEndpoint = 'https://file.shopifysb.xyz:8000/api/user';
      const userResponse = await fetch(userEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(userData)
      });

      addDebugInfo({
        endpoint: userEndpoint,
        status: userResponse.status,
        request: userData,
        response: userResponse.ok ? 'User created' : 'User creation failed'
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        addDebugInfo({
          endpoint: userEndpoint,
          status: userResponse.status,
          request: userData,
          response: errorData,
          error: userResponse.status === 409 ? 'User already exists' : 'User creation failed'
        });

        if (userResponse.status === 409) {
          throw new Error(language === 'fa' ? 
            'این نام کاربری قبلاً استفاده شده است. لطفاً نام دیگری انتخاب کنید' : 
            'This username is already taken. Please choose a different one'
          );
        }
        throw new Error(errorData.detail || 'Failed to create user');
      }

      const responseData = await userResponse.json();
      addDebugInfo({
        endpoint: userEndpoint,
        status: userResponse.status,
        request: userData,
        response: responseData
      });

      return {
        username: responseData.username,
        subscription_url: responseData.subscription_url,
        expire: responseData.expire,
        data_limit: responseData.data_limit
      };
    } catch (error) {
      console.error('Marzban API Error:', error);
      throw error;
    }
  };

  const handleInputChange = (field: keyof MarzbanFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!checkRateLimit()) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    setDebugInfo([]); // Clear previous debug info
    
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
        description: error instanceof Error ? error.message : (
          language === 'fa' ? 
            'خطا در ایجاد اشتراک. لطفاً دوباره تلاش کنید' : 
            'Failed to create subscription. Please try again'
        ),
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

  // Debug Component
  const DebugSection = () => {
    if (!debugMode || debugInfo.length === 0) return null;

    return (
      <Card className="mt-6 border-orange-200 dark:border-orange-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bug className="w-4 h-4 text-orange-600" />
              {language === 'fa' ? 'اطلاعات دیباگ' : 'Debug Information'}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDebug(!showDebug)}
            >
              {showDebug ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        {showDebug && (
          <CardContent>
            <div className="space-y-4">
              {debugInfo.map((info, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={info.status >= 200 && info.status < 300 ? "default" : "destructive"}>
                      {info.status}
                    </Badge>
                    <code className="text-blue-600 dark:text-blue-400">{info.endpoint}</code>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <strong>Request:</strong>
                      <pre className="mt-1 bg-white dark:bg-gray-800 p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(info.request, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <strong>Response:</strong>
                      <pre className="mt-1 bg-white dark:bg-gray-800 p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(info.response, null, 2)}
                      </pre>
                    </div>
                  </div>
                  {info.error && (
                    <div className="mt-2">
                      <strong className="text-red-600">Error:</strong>
                      <p className="text-red-600">{info.error}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    );
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

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-blue-700 dark:text-blue-300">
                  {language === 'fa' ? 'سرور: دبی' : 'Server: Dubai'}
                </Badge>
                <Badge variant="outline" className="text-blue-700 dark:text-blue-300">
                  VLESS
                </Badge>
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
        
        <DebugSection />
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
              'اشتراک VLESS سفارشی خود را ایجاد کنید - سرور دبی' : 
              'Create your custom VLESS subscription - Dubai Server'
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

              {/* Server Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-blue-700 dark:text-blue-300">
                    {language === 'fa' ? 'سرور: دبی (VLESS WS)' : 'Server: Dubai (VLESS WS)'}
                  </Badge>
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    {language === 'fa' ? 'بهینه‌شده برای سرعت بالا' : 'Optimized for high speed'}
                  </span>
                </div>
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

      <DebugSection />
    </div>
  );
};

export default MarzbanSubscriptionForm;
