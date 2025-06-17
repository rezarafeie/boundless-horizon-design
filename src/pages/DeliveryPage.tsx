import { useState, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { CheckCircle, Copy, Download, AlertCircle, ArrowLeft, Loader, RefreshCw, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import QRCodeCanvas from 'qrcode';
import Navigation from '@/components/Navigation';
import ZarinpalVerificationHandler from '@/components/ZarinpalVerificationHandler';

interface SubscriptionData {
  username: string;
  subscription_url: string | null;
  expire: number;
  data_limit: number;
  status: string;
  subscriptionId?: string;
  paymentMethod?: string;
  authority?: string;
}

const DeliveryPage = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPendingMessage, setShowPendingMessage] = useState(false);

  // Check if this is a Zarinpal callback
  const isZarinpalCallback = searchParams.get('Authority') && searchParams.get('Status');

  // If this is a Zarinpal callback, show verification handler
  if (isZarinpalCallback) {
    return <ZarinpalVerificationHandler />;
  }

  const createVPNUserIfNeeded = async (subscriptionId: string, subscription: any) => {
    try {
      // Check if VPN user already created
      if (subscription.marzban_user_created || subscription.subscription_url) {
        return subscription.subscription_url;
      }

      console.log('Creating VPN user for subscription:', subscriptionId);
      
      const { data, error } = await supabase.functions.invoke('marzneshin-create-user', {
        body: {
          username: subscription.username,
          dataLimitGB: subscription.data_limit_gb,
          durationDays: subscription.duration_days,
          notes: `Created for subscription ID: ${subscriptionId}`
        }
      });

      if (error || !data?.success) {
        console.error('VPN user creation failed:', error || data?.error);
        throw new Error(data?.error || 'Failed to create VPN user');
      }

      console.log('VPN user created successfully:', data.data);
      
      // Update subscription with real URL from panel
      if (data.data?.subscription_url) {
        await supabase
          .from('subscriptions')
          .update({ 
            subscription_url: data.data.subscription_url,
            marzban_user_created: true
          })
          .eq('id', subscriptionId);

        return data.data.subscription_url;
      }

      return null;
    } catch (error) {
      console.error('VPN user creation failed:', error);
      return null;
    }
  };

  useEffect(() => {
    const loadSubscriptionData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check different sources for subscription data
        let data: SubscriptionData | null = null;

        // 1. From URL state (navigation)
        if (location.state?.subscriptionData) {
          console.log('Found subscription data in location state:', location.state.subscriptionData);
          data = location.state.subscriptionData;
        }
        
        // 2. From URL parameters (redirect from payment gateways)
        else if (searchParams.get('subscriptionData')) {
          try {
            const encodedData = searchParams.get('subscriptionData');
            data = JSON.parse(decodeURIComponent(encodedData!));
            console.log('Decoded subscription data from URL:', data);
          } catch (parseError) {
            console.error('Failed to parse subscription data from URL:', parseError);
          }
        }
        
        // 3. From localStorage (fallback)
        else if (localStorage.getItem('deliverySubscriptionData')) {
          try {
            data = JSON.parse(localStorage.getItem('deliverySubscriptionData')!);
            console.log('Found subscription data in localStorage:', data);
          } catch (parseError) {
            console.error('Failed to parse subscription data from localStorage:', parseError);
          }
        }

        // 4. Handle payment method specific parameters
        const paymentMethod = searchParams.get('payment');
        const subscriptionId = searchParams.get('subscriptionId');
        const orderId = searchParams.get('orderId');

        if ((paymentMethod === 'zarinpal' || paymentMethod === 'crypto') && (subscriptionId || orderId)) {
          console.log('Handling payment callback:', { paymentMethod, subscriptionId, orderId });
          
          // For payment callbacks, try to fetch subscription from database
          const id = subscriptionId || orderId;
          if (id) {
            try {
              const { data: subscription, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('id', id)
                .single();

              if (subscription && !error) {
                // Try to create VPN user if needed and subscription is active
                let subscriptionUrl = subscription.subscription_url;
                if (subscription.status === 'active' && !subscriptionUrl) {
                  subscriptionUrl = await createVPNUserIfNeeded(id, subscription);
                }

                data = {
                  username: subscription.username,
                  subscription_url: subscriptionUrl,
                  expire: subscription.expire_at ? new Date(subscription.expire_at).getTime() : Date.now() + (subscription.duration_days * 24 * 60 * 60 * 1000),
                  data_limit: subscription.data_limit_gb * 1073741824,
                  status: subscription.status || 'active',
                  subscriptionId: subscription.id
                };
                console.log('Fetched subscription from database:', data);

                // If it's a pending manual payment, show special handling
                if (subscription.status === 'pending' && subscription.admin_decision === 'pending') {
                  setShowPendingMessage(true);
                }
              }
            } catch (fetchError) {
              console.error('Failed to fetch subscription from database:', fetchError);
            }
          }
        }

        // 5. Check for pending Zarinpal payment
        const pendingSubscriptionId = localStorage.getItem('pendingZarinpalSubscription');
        if (pendingSubscriptionId && !data) {
          try {
            const { data: subscription, error } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('id', pendingSubscriptionId)
              .single();

            if (subscription && !error) {
              data = {
                username: subscription.username,
                subscription_url: subscription.subscription_url,
                expire: subscription.expire_at ? new Date(subscription.expire_at).getTime() : Date.now() + (subscription.duration_days * 24 * 60 * 60 * 1000),
                data_limit: subscription.data_limit_gb * 1073741824,
                status: subscription.status || 'payment_pending',
                subscriptionId: subscription.id,
                paymentMethod: 'zarinpal'
              };
            }
          } catch (fetchError) {
            console.error('Failed to fetch pending subscription:', fetchError);
          }
        }

        if (data) {
          setSubscriptionData(data);
          if (data.subscription_url) {
            await generateQRCode(data.subscription_url);
          }
        } else {
          setError(language === 'fa' ? 'اطلاعات اشتراک یافت نشد' : 'No subscription data found');
        }
      } catch (error) {
        console.error('Error loading subscription data:', error);
        setError(language === 'fa' ? 'خطا در بارگذاری اطلاعات' : 'Error loading subscription data');
      } finally {
        setIsLoading(false);
      }
    };

    loadSubscriptionData();
  }, [location.state, searchParams, language]);

  // Auto-refresh for pending payments
  useEffect(() => {
    if (subscriptionData?.status === 'pending' && showPendingMessage) {
      const interval = setInterval(async () => {
        await refreshSubscription();
      }, 10000); // Check every 10 seconds

      return () => clearInterval(interval);
    }
  }, [subscriptionData?.status, showPendingMessage]);

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
    if (!subscriptionData?.subscription_url) return;
    
    const blob = new Blob([subscriptionData.subscription_url], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${subscriptionData.username}-subscription.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const refreshSubscription = async () => {
    if (!subscriptionData) return;

    setIsRefreshing(true);
    try {
      // Try to refresh subscription data from database
      const searchKey = subscriptionData.subscriptionId || subscriptionData.username;
      const searchField = subscriptionData.subscriptionId ? 'id' : 'username';
      
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq(searchField, searchKey)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (subscription && !error) {
        // Try to create VPN user if needed and subscription is active
        let subscriptionUrl = subscription.subscription_url;
        if (subscription.status === 'active' && !subscriptionUrl) {
          subscriptionUrl = await createVPNUserIfNeeded(subscription.id, subscription);
        }

        const updatedData = {
          username: subscription.username,
          subscription_url: subscriptionUrl,
          expire: subscription.expire_at ? new Date(subscription.expire_at).getTime() : Date.now() + (subscription.duration_days * 24 * 60 * 60 * 1000),
          data_limit: subscription.data_limit_gb * 1073741824,
          status: subscription.status || 'active',
          subscriptionId: subscription.id
        };
        
        setSubscriptionData(updatedData);
        localStorage.setItem('deliverySubscriptionData', JSON.stringify(updatedData));
        
        // Check if subscription is now approved
        if (subscription.status === 'active' && showPendingMessage) {
          setShowPendingMessage(false);
          toast({
            title: language === 'fa' ? '🎉 تایید شد!' : '🎉 Approved!',
            description: language === 'fa' ? 
              'اشتراک شما تایید شد و فعال گردید' : 
              'Your subscription has been approved and activated',
          });
        }
        
        if (updatedData.subscription_url) {
          await generateQRCode(updatedData.subscription_url);
        }
        
        toast({
          title: language === 'fa' ? 'بروزرسانی شد' : 'Refreshed',
          description: language === 'fa' ? 
            'اطلاعات اشتراک بروزرسانی شد' : 
            'Subscription data updated',
        });
      }
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در بروزرسانی' : 'Failed to refresh',
        variant: 'destructive'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
        <Navigation />
        <div className="pt-20 flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Loader className="w-12 h-12 animate-spin mx-auto text-blue-600" />
                <h2 className="text-xl font-semibold">
                  {language === 'fa' ? 'در حال بارگذاری...' : 'Loading...'}
                </h2>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !subscriptionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
        <Navigation />
        <div className="pt-20 flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md mx-4 border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {language === 'fa' ? 'خطا' : 'Error'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{error}</p>
              <div className="flex gap-2">
                <Button onClick={() => navigate('/subscription')} variant="outline" className="flex-1">
                  {language === 'fa' ? 'اشتراک جدید' : 'New Subscription'}
                </Button>
                <Button onClick={() => navigate('/')} className="flex-1">
                  {language === 'fa' ? 'صفحه اصلی' : 'Home'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-500', text: language === 'fa' ? 'فعال' : 'Active' },
      pending: { color: 'bg-yellow-500', text: language === 'fa' ? 'در انتظار تایید' : 'Pending Approval' },
      payment_pending: { color: 'bg-blue-500', text: language === 'fa' ? 'در انتظار پرداخت' : 'Payment Pending' },
      paid: { color: 'bg-blue-500', text: language === 'fa' ? 'پرداخت شده' : 'Paid' },
      expired: { color: 'bg-red-500', text: language === 'fa' ? 'منقضی' : 'Expired' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge className={`${config.color} text-white`}>{config.text}</Badge>;
  };

  // Special handling for pending manual payments
  if (showPendingMessage && subscriptionData.status === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
        <Navigation />
        <div className="pt-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Clock className="w-8 h-8 text-yellow-600" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {language === 'fa' ? 'در انتظار تایید' : 'Awaiting Approval'}
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                {language === 'fa' ? 
                  'پرداخت دستی شما دریافت شد و در حال بررسی است' : 
                  'Your manual payment has been received and is under review'
                }
              </p>
            </div>

            {/* Pending Status Card */}
            <div className="max-w-2xl mx-auto">
              <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                <CardHeader>
                  <CardTitle className="text-center text-yellow-800 dark:text-yellow-200">
                    {language === 'fa' ? '⏳ در حال بررسی' : '⏳ Under Review'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center space-y-4">
                    <div className="bg-white/50 dark:bg-gray-800/50 p-6 rounded-lg">
                      <div className="space-y-4">
                        <div className="flex items-center justify-center gap-4 text-2xl">
                          <span>📋</span>
                          <span>👨‍💼</span>
                          <span>✅</span>
                        </div>
                        <div className="space-y-2">
                          <p className="font-semibold">
                            {language === 'fa' ? 'وضعیت درخواست شما:' : 'Your Request Status:'}
                          </p>
                          <ol className="text-left space-y-2 text-sm">
                            <li className="flex items-center gap-2">
                              <span className="text-green-500">✓</span>
                              {language === 'fa' ? 'پرداخت دستی ثبت شد' : 'Manual payment submitted'}
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="text-yellow-500">⏳</span>
                              {language === 'fa' ? 'در حال بررسی توسط ادمین' : 'Under admin review'}
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="text-gray-400">⏳</span>
                              {language === 'fa' ? 'تایید و فعال‌سازی اشتراک' : 'Approval & subscription activation'}
                            </li>
                          </ol>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-white/30 p-3 rounded">
                        <span className="font-medium">{language === 'fa' ? 'نام کاربری:' : 'Username:'}</span>
                        <p className="font-mono">{subscriptionData.username}</p>
                      </div>
                      <div className="bg-white/30 p-3 rounded">
                        <span className="font-medium">{language === 'fa' ? 'وضعیت:' : 'Status:'}</span>
                        <div className="mt-1">{getStatusBadge(subscriptionData.status)}</div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-blue-800 dark:text-blue-200 text-sm">
                        {language === 'fa' ? 
                          '💡 صفحه به طور خودکار هر 10 ثانیه بروزرسانی می‌شود. همچنین ایمیل تایید نیز برای شما ارسال خواهد شد.' : 
                          '💡 This page automatically refreshes every 10 seconds. You will also receive a confirmation email once approved.'
                        }
                      </p>
                    </div>

                    <Button
                      onClick={refreshSubscription}
                      disabled={isRefreshing}
                      className="w-full"
                      variant="outline"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 
                        (language === 'fa' ? 'در حال بررسی...' : 'Checking...') :
                        (language === 'fa' ? 'بررسی مجدد وضعیت' : 'Check Status Again')
                      }
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Back Button */}
            <div className="mt-8 text-center">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {language === 'fa' ? 'بازگشت به صفحه اصلی' : 'Back to Home'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle payment pending status for Zarinpal
  if (subscriptionData.status === 'payment_pending' && subscriptionData.paymentMethod === 'zarinpal') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
        <Navigation />
        <div className="pt-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Clock className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {language === 'fa' ? 'در انتظار پرداخت' : 'Awaiting Payment'}
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                {language === 'fa' ? 
                  'لطفا پرداخت خود را در تب باز شده تکمیل کنید' : 
                  'Please complete your payment in the opened tab'
                }
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                <CardHeader>
                  <CardTitle className="text-center text-blue-800 dark:text-blue-200">
                    {language === 'fa' ? '💳 پرداخت زرین‌پال' : '💳 Zarinpal Payment'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center space-y-4">
                    <div className="bg-white/50 dark:bg-gray-800/50 p-6 rounded-lg">
                      <div className="space-y-4">
                        <div className="flex items-center justify-center gap-4 text-2xl">
                          <span>💳</span>
                          <span>🔄</span>
                          <span>✅</span>
                        </div>
                        <p className="text-sm">
                          {language === 'fa' ? 
                            'پس از تکمیل پرداخت، به طور خودکار به این صفحه برگردانده خواهید شد.' : 
                            'After completing payment, you will be automatically redirected back to this page.'
                          }
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-white/30 p-3 rounded">
                        <span className="font-medium">{language === 'fa' ? 'نام کاربری:' : 'Username:'}</span>
                        <p className="font-mono">{subscriptionData.username}</p>
                      </div>
                      <div className="bg-white/30 p-3 rounded">
                        <span className="font-medium">{language === 'fa' ? 'وضعیت:' : 'Status:'}</span>
                        <div className="mt-1">{getStatusBadge(subscriptionData.status)}</div>
                      </div>
                    </div>

                    <Button
                      onClick={refreshSubscription}
                      disabled={isRefreshing}
                      className="w-full"
                      variant="outline"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 
                        (language === 'fa' ? 'در حال بررسی...' : 'Checking...') :
                        (language === 'fa' ? 'بررسی وضعیت پرداخت' : 'Check Payment Status')
                      }
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
      <Navigation />
      <div className="pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {language === 'fa' ? 'اشتراک آماده است!' : 'Subscription Ready!'}
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              {language === 'fa' ? 
                'اشتراک VPN شما با موفقیت ایجاد شد' : 
                'Your VPN subscription has been successfully created'
              }
            </p>
          </div>

          {/* Subscription Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Details */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>
                    {language === 'fa' ? 'جزئیات اشتراک' : 'Subscription Details'}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(subscriptionData.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshSubscription}
                      disabled={isRefreshing}
                    >
                      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        {language === 'fa' ? 'نام کاربری' : 'Username'}
                      </Label>
                      <p className="font-mono text-lg font-bold">{subscriptionData.username}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        {language === 'fa' ? 'وضعیت' : 'Status'}
                      </Label>
                      <div className="mt-1">{getStatusBadge(subscriptionData.status)}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        {language === 'fa' ? 'حجم داده' : 'Data Limit'}
                      </Label>
                      <p className="font-bold">{Math.round(subscriptionData.data_limit / 1073741824)} GB</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        {language === 'fa' ? 'تاریخ انقضا' : 'Expiry Date'}
                      </Label>
                      <p className="font-bold">
                        {new Date(subscriptionData.expire).toLocaleDateString(
                          language === 'fa' ? 'fa-IR' : 'en-US'
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Connection Info */}
              {subscriptionData.subscription_url ? (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {language === 'fa' ? 'لینک اتصال' : 'Connection Link'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-muted p-3 rounded-lg">
                      <code className="text-xs break-all">{subscriptionData.subscription_url}</code>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => copyToClipboard(subscriptionData.subscription_url!)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        {language === 'fa' ? 'کپی' : 'Copy'}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={downloadConfig}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {language === 'fa' ? 'دانلود' : 'Download'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                  <CardContent className="pt-6">
                    <div className="text-center space-y-2">
                      <AlertCircle className="w-8 h-8 mx-auto text-yellow-600" />
                      <p className="text-yellow-800 dark:text-yellow-200">
                        {language === 'fa' ? 
                          'اشتراک در حال پردازش است. لینک اتصال به زودی ایجاد خواهد شد.' : 
                          'Subscription is being processed. Connection link will be available soon.'
                        }
                      </p>
                      <Button
                        onClick={refreshSubscription}
                        disabled={isRefreshing}
                        variant="outline"
                        size="sm"
                        className="mt-2"
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {language === 'fa' ? 'بروزرسانی' : 'Refresh'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - QR Code */}
            <div className="space-y-6">
              {qrCodeDataUrl && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-center">
                      {language === 'fa' ? 'کد QR' : 'QR Code'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center space-y-4">
                      <div className="flex justify-center">
                        <div className="p-4 bg-white rounded-lg shadow-lg">
                          <img src={qrCodeDataUrl} alt="Subscription QR Code" className="w-64 h-64" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {language === 'fa' ? 
                          'این کد را با اپ V2Ray اسکن کنید' : 
                          'Scan this QR code with your V2Ray app'
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === 'fa' ? 'راهنمای استفاده' : 'How to Use'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                      <p>
                        {language === 'fa' ? 
                          'یک اپ V2Ray یا VLESS دانلود کنید' : 
                          'Download a V2Ray or VLESS client app'
                        }
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                      <p>
                        {language === 'fa' ? 
                          'لینک اتصال را کپی کنید یا کد QR را اسکن کنید' : 
                          'Copy the connection link or scan the QR code'
                        }
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                      <p>
                        {language === 'fa' ? 
                          'اتصال را فعال کنید و از اینترنت آزاد لذت ببرید' : 
                          'Activate the connection and enjoy free internet'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Back Button */}
          <div className="mt-8 text-center">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {language === 'fa' ? 'بازگشت به صفحه اصلی' : 'Back to Home'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryPage;
