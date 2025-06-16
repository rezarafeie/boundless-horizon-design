import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, Copy, Download, CheckCircle, AlertCircle, User, Zap, ChevronDown, ChevronUp, Bug, CreditCard, Phone, Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRCodeCanvas from 'qrcode';
import { supabase } from '@/integrations/supabase/client';

interface MarzbanFormData {
  username: string;
  dataLimit: number; // in GB
  duration: number; // in days
  notes: string;
  mobile: string;
}

interface MarzbanResponse {
  username: string;
  subscription_url: string;
  expire: number;
  data_limit: number;
}

interface PaymanResponse {
  payman_authority: string;
  code: number;
  message?: string;
}

interface DebugInfo {
  endpoint: string;
  status: number;
  request: any;
  response: any;
  error?: string;
  timestamp: string;
  type: 'success' | 'error' | 'info';
}

const MarzbanSubscriptionForm = () => {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const [formData, setFormData] = useState<MarzbanFormData>({
    username: '',
    dataLimit: 10,
    duration: 30,
    notes: '',
    mobile: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<MarzbanResponse | null>(null);
  const [step, setStep] = useState(1); // 1: Form, 2: Payment, 3: Success
  const [debugMode, setDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [rateLimitMap, setRateLimitMap] = useState<Map<string, number>>(new Map());
  const [paymanData, setPaymanData] = useState<PaymanResponse | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [user, setUser] = useState(null);

  // Fixed configuration
  const FIXED_UUID = '70f64bea-a84c-4feb-ac0e-fb796657790f';
  const MERCHANT_ID = '10f6ea92-fb53-468c-bcc9-36ef4d9f539c';
  const PRICE_PER_GB = 3200; // Toman per GB
  const INBOUND_TAGS = ['VLESSTCP', 'Israel', 'fanland', 'USAC', 'info_protocol', 'Dubai'];

  useEffect(() => {
    // Check for debug mode in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    setDebugMode(urlParams.get('debug') === 'true');
    
    // Check for payment callback
    const status = urlParams.get('Status');
    const authority = urlParams.get('Authority');
    if (status && authority) {
      handlePaymentCallback(status, authority);
    }

    // Get current user
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (result?.subscription_url) {
      generateQRCode(result.subscription_url);
    }
  }, [result]);

  const generateQRCode = async (url: string) => {
    try {
      const qrDataUrl = await QRCodeCanvas.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const calculatePrice = () => {
    return formData.dataLimit * PRICE_PER_GB;
  };

  const generateUsername = () => {
    const prefix = 'bnets_';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5);
    return `${prefix}${timestamp}_${random}`;
  };

  const addDebugInfo = (info: Omit<DebugInfo, 'timestamp'>) => {
    const debugEntry: DebugInfo = {
      ...info,
      timestamp: new Date().toISOString()
    };
    setDebugInfo(prev => [...prev, debugEntry]);
    
    // Auto-show debug panel on errors
    if (info.type === 'error') {
      setShowDebug(true);
    }
  };

  const checkRateLimit = (): boolean => {
    const clientIP = 'user_ip';
    const now = Date.now();
    const lastRequest = rateLimitMap.get(clientIP) || 0;
    
    if (now - lastRequest < 30000) {
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

    // Mobile validation
    const mobileRegex = /^09[0-9]{9}$/;
    if (!formData.mobile || !mobileRegex.test(formData.mobile)) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'شماره موبایل باید با 09 شروع شده و 11 رقم باشد' : 
          'Mobile number must start with 09 and be 11 digits',
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

  const createPaymanContract = async (): Promise<string> => {
    setLoadingMessage(language === 'fa' ? 'در حال ایجاد قرارداد پرداخت...' : 'Creating payment contract...');
    
    const expireAt = new Date();
    expireAt.setDate(expireAt.getDate() + 30);
    
    const paymanRequest = {
      merchant_id: MERCHANT_ID,
      mobile: formData.mobile,
      expire_at: Math.floor(expireAt.getTime() / 1000),
      max_daily_count: 100,
      max_monthly_count: 1000,
      max_amount: calculatePrice() * 10, // Convert Toman to Rial
      callback_url: `${window.location.origin}/subscription?payment_callback=1`
    };

    try {
      const { data, error } = await supabase.functions.invoke('zarinpal-contract', {
        body: paymanRequest
      });

      addDebugInfo({
        endpoint: 'zarinpal-contract',
        status: error ? 500 : 200,
        request: paymanRequest,
        response: data || error,
        type: error ? 'error' : 'success'
      });

      if (error) {
        throw new Error(error.message || 'Failed to create contract');
      }

      if (!data.success) {
        const errorDetails = data.details || data.error || 'Unknown error';
        
        let userMessage;
        if (data.status === 502) {
          userMessage = language === 'fa' ? 
            'خطا در برقراری ارتباط با درگاه پرداخت' : 
            'Error connecting to payment gateway';
        } else if (data.status >= 400 && data.status < 500) {
          userMessage = language === 'fa' ? 
            'اطلاعات پرداخت نامعتبر است' : 
            'Invalid payment information';
        } else {
          userMessage = language === 'fa' ? 
            'خطا در سرویس پرداخت' : 
            'Payment service error';
        }

        toast({
          title: language === 'fa' ? 'خطا در ایجاد قرارداد' : 'Contract Creation Error',
          description: userMessage,
          variant: 'destructive'
        });

        throw new Error(userMessage);
      }

      if (!data.data?.data?.payman_authority) {
        throw new Error(language === 'fa' ? 
          'پاسخ نامعتبر از درگاه پرداخت' : 
          'Invalid response from payment gateway');
      }

      return data.data.data.payman_authority;
    } catch (error) {
      console.error('Contract creation error:', error);
      
      if (!error.message.includes('service') && !error.message.includes('gateway')) {
        addDebugInfo({
          endpoint: 'zarinpal-contract',
          status: 0,
          request: paymanRequest,
          response: { error: error.message },
          error: error.message,
          type: 'error'
        });
      }

      throw error;
    }
  };

  const handlePaymentCallback = async (status: string, authority: string) => {
    if (status === 'OK') {
      setIsLoading(true);
      setLoadingMessage(language === 'fa' ? 'در حال تأیید پرداخت...' : 'Verifying payment...');
      
      try {
        // Verify payment
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke('zarinpal-verify', {
          body: {
            merchant_id: MERCHANT_ID,
            authority: authority
          }
        });
        
        addDebugInfo({
          endpoint: 'zarinpal-verify',
          status: verifyError ? 500 : 200,
          request: { merchant_id: MERCHANT_ID, authority },
          response: verifyData || verifyError,
          type: verifyError ? 'error' : 'success'
        });

        if (verifyData?.success && verifyData?.data?.data?.code === 100) {
          // Checkout
          setLoadingMessage(language === 'fa' ? 'در حال تکمیل پرداخت...' : 'Completing payment...');
          
          const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('zarinpal-checkout', {
            body: {
              merchant_id: MERCHANT_ID,
              authority: authority,
              signature: verifyData.data.data.signature
            }
          });

          addDebugInfo({
            endpoint: 'zarinpal-checkout',
            status: checkoutError ? 500 : 200,
            request: { merchant_id: MERCHANT_ID, authority, signature: verifyData.data.data.signature },
            response: checkoutData || checkoutError,
            type: checkoutError ? 'error' : 'success'
          });
          
          if (checkoutData?.success && checkoutData?.data?.data?.code === 100) {
            // Payment successful, create user
            setLoadingMessage(language === 'fa' ? 'در حال ایجاد اشتراک...' : 'Creating subscription...');
            
            const userData = JSON.parse(localStorage.getItem('pendingUserData') || '{}');
            const result = await createMarzbanUser(userData);
            setResult(result);
            setStep(3);
            localStorage.removeItem('pendingUserData');
            
            toast({
              title: language === 'fa' ? 'موفق' : 'Success',
              description: language === 'fa' ? 
                'پرداخت موفق و اشتراک ایجاد شد' : 
                'Payment successful and subscription created',
            });
          } else {
            throw new Error('Payment checkout failed');
          }
        } else {
          throw new Error('Payment verification failed');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        toast({
          title: language === 'fa' ? 'خطا در پرداخت' : 'Payment Error',
          description: language === 'fa' ? 
            'خطا در تأیید پرداخت' : 
            'Payment verification failed',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
        setLoadingMessage('');
      }
    } else {
      toast({
        title: language === 'fa' ? 'پرداخت ناموفق' : 'Payment Failed',
        description: language === 'fa' ? 
          'پرداخت لغو شد یا ناموفق بود' : 
          'Payment was cancelled or failed',
        variant: 'destructive'
      });
    }
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
        response: tokenResponse.ok ? 'Token received' : 'Token failed',
        type: tokenResponse.ok ? 'success' : 'error'
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        addDebugInfo({
          endpoint: tokenEndpoint,
          status: tokenResponse.status,
          request: tokenRequestData,
          response: errorData,
          error: 'Authentication failed',
          type: 'error'
        });
        throw new Error('Failed to authenticate with Marzban API');
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Step 2: Create user with all inbounds
      const expireTimestamp = Math.floor(Date.now() / 1000) + (formData.duration * 86400);
      const dataLimitBytes = formData.dataLimit * 1073741824; // Convert GB to bytes

      const userData = {
        username: sanitizeInput(formData.username),
        status: 'active',
        expire: expireTimestamp,
        data_limit: dataLimitBytes,
        data_limit_reset_strategy: 'no_reset',
        inbounds: {
          vless: INBOUND_TAGS
        },
        proxies: {
          vless: {
            id: FIXED_UUID
          }
        },
        note: `From bnets.co form - ${sanitizeInput(formData.notes)} - Mobile: ${formData.mobile}`,
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
        response: userResponse.ok ? 'User created' : 'User creation failed',
        type: userResponse.ok ? 'success' : 'error'
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        addDebugInfo({
          endpoint: userEndpoint,
          status: userResponse.status,
          request: userData,
          response: errorData,
          error: userResponse.status === 409 ? 'User already exists' : 'User creation failed',
          type: 'error'
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
        response: responseData,
        type: 'success'
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
    
    if (!user) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'لطفاً ابتدا وارد شوید' : 
          'Please sign in first',
        variant: 'destructive'
      });
      return;
    }
    
    if (!checkRateLimit()) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    setIsLoading(true);
    setDebugInfo([]);
    
    try {
      // Store form data for after payment
      localStorage.setItem('pendingUserData', JSON.stringify(formData));
      
      // Create Payman contract
      const paymanAuthority = await createPaymanContract();
      
      // Redirect to Zarinpal payment page
      window.location.href = `https://www.zarinpal.com/pg/StartPayman/${paymanAuthority}/1`;
      
    } catch (error) {
      console.error('Payment initiation error:', error);
      
      // Don't show duplicate toast if already shown in createPaymanContract
      if (!error.message.includes('service') && !error.message.includes('gateway')) {
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: error instanceof Error ? error.message : (
            language === 'fa' ? 
              'خطا در شروع پرداخت. لطفاً دوباره تلاش کنید' : 
              'Failed to initiate payment. Please try again'
          ),
          variant: 'destructive'
        });
      }
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
      setLoadingMessage('');
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

  // Enhanced Debug Component
  const DebugSection = () => {
    if (!debugMode || debugInfo.length === 0) return null;

    return (
      <Card className="mt-6 border-orange-200 dark:border-orange-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bug className="w-4 h-4 text-orange-600" />
              {language === 'fa' ? 'اطلاعات دیباگ' : 'Debug Information'}
              <Badge variant="outline" className="ml-2">
                {debugInfo.length}
              </Badge>
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
                <div 
                  key={index} 
                  className={`p-3 rounded-lg text-xs border-l-4 ${
                    info.type === 'success' 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-500' 
                      : info.type === 'error'
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={info.type === 'success' ? "default" : "destructive"}>
                      HTTP {info.status}
                    </Badge>
                    <code className={`text-xs ${
                      info.type === 'success' ? 'text-green-600 dark:text-green-400' : 
                      info.type === 'error' ? 'text-red-600 dark:text-red-400' : 
                      'text-blue-600 dark:text-blue-400'
                    }`}>
                      {info.endpoint}
                    </code>
                    <span className="text-xs text-gray-500 ml-auto">
                      {new Date(info.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <strong className={info.type === 'error' ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}>
                        {language === 'fa' ? 'درخواست:' : 'Request Body:'}
                      </strong>
                      <pre className="mt-1 bg-white dark:bg-gray-800 p-2 rounded text-xs overflow-auto max-h-32">
                        {JSON.stringify(info.request, null, 2)}
                      </pre>
                    </div>
                    
                    <div>
                      <strong className={info.type === 'error' ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}>
                        {language === 'fa' ? 'پاسخ:' : 'Response:'}
                      </strong>
                      <pre className={`mt-1 bg-white dark:bg-gray-800 p-2 rounded text-xs overflow-auto max-h-32 ${
                        info.type === 'error' ? 'text-red-600' : ''
                      }`}>
                        {JSON.stringify(info.response, null, 2)}
                      </pre>
                    </div>
                  </div>
                  
                  {info.error && (
                    <div className="mt-2">
                      <strong className="text-red-600">
                        {language === 'fa' ? 'خطای سیستم:' : 'System Error:'}
                      </strong>
                      <p className="text-red-600 text-xs mt-1 font-mono">{info.error}</p>
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

  // Loading Overlay
  const LoadingOverlay = () => {
    if (!isLoading) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="p-6 max-w-sm w-full mx-4">
          <CardContent className="text-center space-y-4">
            <Loader className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm font-medium">{loadingMessage}</p>
            <div className="text-xs text-muted-foreground">
              {language === 'fa' ? 'لطفاً صبر کنید...' : 'Please wait...'}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Success page with animation
  if (step === 3 && result) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6 animate-fade-in">
        <LoadingOverlay />
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-4 animate-scale-in">
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400 animate-pulse" />
            </div>
            <CardTitle className="text-2xl text-green-800 dark:text-green-200">
              {language === 'fa' ? '🎉 اشتراک VPN آماده است!' : '🎉 VPN Subscription Ready!'}
            </CardTitle>
            <CardDescription className="text-green-600 dark:text-green-400 text-lg">
              {language === 'fa' ? 
                'پرداخت موفق و پیکربندی VLESS شما ایجاد شد' : 
                'Payment successful and your VLESS configuration is ready'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                <Label className="text-gray-600 dark:text-gray-400">{language === 'fa' ? 'نام کاربری' : 'Username'}</Label>
                <p className="font-mono text-lg font-bold">{result.username}</p>
              </div>
              <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                <Label className="text-gray-600 dark:text-gray-400">{language === 'fa' ? 'تاریخ انقضا' : 'Expiry Date'}</Label>
                <p className="font-bold">{new Date(result.expire * 1000).toLocaleDateString()}</p>
              </div>
              <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                <Label className="text-gray-600 dark:text-gray-400">{language === 'fa' ? 'حجم' : 'Volume'}</Label>
                <p className="font-bold">{Math.round(result.data_limit / 1073741824)} GB</p>
              </div>
            </div>

            {/* QR Code Section */}
            {qrCodeDataUrl && (
              <div className="text-center space-y-4">
                <Label className="text-lg font-semibold">
                  {language === 'fa' ? 'کد QR اشتراک' : 'Subscription QR Code'}
                </Label>
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-lg shadow-lg">
                    <img src={qrCodeDataUrl} alt="Subscription QR Code" className="w-64 h-64" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'fa' ? 
                    'این کد را با اپ V2Ray اسکن کنید' : 
                    'Scan this QR code with your V2Ray app'
                  }
                </p>
              </div>
            )}

            {/* Subscription URL */}
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

            {/* Server Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex flex-wrap gap-2 mb-2">
                {INBOUND_TAGS.map(tag => (
                  <Badge key={tag} variant="outline" className="text-blue-700 dark:text-blue-300">
                    {tag}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {language === 'fa' ? 
                  'تمام سرورها برای شما فعال شده‌اند' : 
                  'All servers are activated for you'
                }
              </p>
            </div>

            {/* Important Notes */}
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
              <Button onClick={() => window.open('https://t.me/getbnbot', '_blank')} size="lg">
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
      <LoadingOverlay />
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
          {!user && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <AlertCircle className="w-5 h-5" />
                <p className="font-medium">
                  {language === 'fa' ? 
                    'برای ادامه باید وارد شوید' : 
                    'You need to sign in to continue'
                  }
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                {language === 'fa' ? 'اطلاعات کاربری' : 'User Information'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      {language === 'fa' ? 'تولید' : 'Generate'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile">
                    {language === 'fa' ? 'شماره موبایل' : 'Mobile Number'} *
                  </Label>
                  <Input
                    id="mobile"
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => handleInputChange('mobile', e.target.value)}
                    placeholder={language === 'fa' ? '09123456789' : '09123456789'}
                    required
                  />
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
                  placeholder={language === 'fa' ? 'توضیحات اضافی' : 'Additional description'}
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

              {/* Price Calculation */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                      {language === 'fa' ? 'محاسبه قیمت' : 'Price Calculation'}
                    </h4>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      {language === 'fa' ? 
                        `${formData.dataLimit} گیگابایت × ${PRICE_PER_GB.toLocaleString()} تومان` : 
                        `${formData.dataLimit} GB × ${PRICE_PER_GB.toLocaleString()} Toman`
                      }
                    </p>
                  </div>
                  <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                    {calculatePrice().toLocaleString()} 
                    {language === 'fa' ? ' تومان' : ' Toman'}
                  </div>
                </div>
              </div>

              {/* Server Info */}
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="flex flex-wrap gap-2 mb-2">
                  {INBOUND_TAGS.map(tag => (
                    <Badge key={tag} variant="outline" className="text-green-700 dark:text-green-300">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {language === 'fa' ? 
                    'تمام سرورها برای شما فعال خواهد شد' : 
                    'All servers will be activated for you'
                  }
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || isLoading || !user}
              size="lg"
            >
              {isSubmitting || isLoading ? (
                <>
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  {loadingMessage || (language === 'fa' ? 'در حال پردازش...' : 'Processing...')}
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  {language === 'fa' ? 
                    `پرداخت ${calculatePrice().toLocaleString()} تومان` : 
                    `Pay ${calculatePrice().toLocaleString()} Toman`
                  }
                </>
              )}
            </Button>

            {/* Terms */}
            <p className="text-sm text-muted-foreground text-center">
              {language === 'fa' ? 
                'با ادامه، شما با قوانین و مقررات شبکه بدون مرز موافقت می‌کنید' : 
                'By continuing, you agree to Boundless Network terms and conditions'
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
