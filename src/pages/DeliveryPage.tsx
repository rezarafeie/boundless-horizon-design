import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Copy, Download, RefreshCw, AlertCircle, CheckCircle, Clock, ExternalLink, QrCode, Smartphone, Monitor, ChevronDown, ChevronRight, Shield, MessageCircle, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import Navigation from '@/components/Navigation';
import FooterSection from '@/components/FooterSection';
import QRCodeCanvas from 'qrcode';

interface SubscriptionData {
  id: string;
  username: string;
  mobile: string;
  data_limit_gb: number;
  duration_days: number;
  status: string;
  subscription_url: string | null;
  expire_at: string | null;
  created_at: string;
  plan_id: string;
  marzban_user_created: boolean;
  price_toman: number;
  notes: string | null;
  subscription_plans?: {
    id: string;
    name_en: string;
    name_fa: string;
    assigned_panel_id: string | null;
    panel_servers?: {
      id: string;
      name: string;
      panel_url: string;
      type: string;
      health_status: string;
    } | null;
  } | null;
}

const DeliveryPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [showGuides, setShowGuides] = useState<{[key: string]: boolean}>({});

  const subscriptionId = searchParams.get('id');

  useEffect(() => {
    if (!subscriptionId) {
      navigate('/');
      return;
    }
    fetchSubscription();
  }, [subscriptionId, navigate]);

  // Countdown timer
  useEffect(() => {
    if (subscription?.expire_at) {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const expiry = new Date(subscription.expire_at!).getTime();
        const diff = expiry - now;

        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setCountdown(`${days}d ${hours}h ${minutes}m`);
        } else {
          setCountdown('Expired');
        }
      }, 60000);

      return () => clearInterval(timer);
    }
  }, [subscription?.expire_at]);

  const fetchSubscription = async () => {
    if (!subscriptionId) return;

    try {
      console.log('DELIVERY_PAGE: Fetching subscription with STRICT plan-to-panel binding:', subscriptionId);
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans!plan_id (
            id,
            name_en,
            name_fa,
            assigned_panel_id,
            panel_servers!assigned_panel_id (
              id,
              name,
              panel_url,
              type,
              health_status
            )
          )
        `)
        .eq('id', subscriptionId)
        .single();

      if (error) {
        console.error('DELIVERY_PAGE: Error fetching subscription:', error);
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: language === 'fa' ? 'خطا در بارگذاری اطلاعات اشتراک' : 'Failed to load subscription data',
          variant: 'destructive'
        });
        return;
      }

      console.log('DELIVERY_PAGE: Subscription fetched with STRICT binding:', {
        subscriptionId: data.id,
        planId: data.plan_id,
        planName: data.subscription_plans?.name_en,
        assignedPanelId: data.subscription_plans?.assigned_panel_id,
        panelName: data.subscription_plans?.panel_servers?.name,
        panelUrl: data.subscription_plans?.panel_servers?.panel_url,
        status: data.status
      });

      setSubscription(data);
    } catch (error) {
      console.error('DELIVERY_PAGE: Error:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در اتصال به سرور' : 'Connection error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshSubscription = async () => {
    if (!subscription?.subscription_plans?.panel_servers) {
      console.error('DELIVERY_PAGE: Cannot refresh - no panel assigned to plan');
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'پنل اختصاصی برای این پلن یافت نشد' : 
          'No assigned panel found for this plan',
        variant: 'destructive'
      });
      return;
    }

    setRefreshing(true);
    try {
      console.log('DELIVERY_PAGE: Refreshing subscription using STRICTLY assigned panel:', {
        subscriptionId: subscription.id,
        username: subscription.username,
        planName: subscription.subscription_plans.name_en,
        assignedPanelId: subscription.subscription_plans.assigned_panel_id,
        panelName: subscription.subscription_plans.panel_servers.name,
        panelUrl: subscription.subscription_plans.panel_servers.panel_url
      });

      const { data, error } = await supabase.functions.invoke('get-subscription-from-panel', {
        body: {
          username: subscription.username,
          panelType: subscription.subscription_plans.panel_servers.type,
          panelUrl: subscription.subscription_plans.panel_servers.panel_url,
          panelId: subscription.subscription_plans.panel_servers.id
        }
      });

      console.log('DELIVERY_PAGE: Raw response from get-subscription-from-panel:', data);

      if (error) {
        console.error('DELIVERY_PAGE: Refresh error:', error);
        throw new Error(`Function call failed: ${error.message}`);
      }

      if (!data.success) {
        console.error('DELIVERY_PAGE: Panel response error:', data.error);
        throw new Error(data.error || 'Failed to fetch subscription from panel');
      }

      if (data.subscription && data.subscription.subscription_url) {
        console.log('DELIVERY_PAGE: Got subscription data:', data.subscription);
        
        // Update subscription with fresh data from the STRICTLY assigned panel
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            subscription_url: data.subscription.subscription_url,
            expire_at: data.subscription.expire_at,
            status: 'active',
            marzban_user_created: true
          })
          .eq('id', subscription.id);

        if (updateError) {
          console.error('DELIVERY_PAGE: Update error:', updateError);
          throw updateError;
        }

        // Refresh the local data
        await fetchSubscription();
        
        toast({
          title: language === 'fa' ? 'موفق' : 'Success',
          description: language === 'fa' ? 
            'اطلاعات اشتراک بروزرسانی شد' : 
            'Subscription data updated successfully'
        });
      } else {
        console.error('DELIVERY_PAGE: No subscription data in response:', data);
        throw new Error('No subscription data received from panel');
      }
    } catch (error) {
      console.error('DELIVERY_PAGE: Refresh failed:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: error instanceof Error ? error.message : 
          (language === 'fa' ? 'خطا در بروزرسانی اطلاعات' : 'Failed to refresh data'),
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: language === 'fa' ? 'کپی شد' : 'Copied',
      description: language === 'fa' ? 'لینک کپی شد' : 'Link copied to clipboard'
    });
  };

  const downloadConfig = () => {
    if (!subscription?.subscription_url) return;
    
    const blob = new Blob([subscription.subscription_url], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${subscription.username}-config.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateQRCode = async (url: string) => {
    try {
      const qrDataUrl = await QRCodeCanvas.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#1f2937',
          light: '#ffffff'
        }
      });
      setQrCodeDataUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'expired': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const toggleGuide = (platform: string) => {
    setShowGuides(prev => ({ ...prev, [platform]: !prev[platform] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900">
        <Navigation />
        <div className="pt-16 pb-8 flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
              {language === 'fa' ? 'در حال بارگذاری...' : 'Loading...'}
            </p>
          </div>
        </div>
        <FooterSection />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900">
        <Navigation />
        <div className="pt-16 pb-8 flex items-center justify-center min-h-[80vh]">
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {language === 'fa' ? 'اشتراک یافت نشد' : 'Subscription Not Found'}
              </h2>
              <p className="text-gray-600 mb-4">
                {language === 'fa' ? 
                  'اشتراک مورد نظر یافت نشد یا حذف شده است' : 
                  'The requested subscription was not found or has been removed'
                }
              </p>
              <Button onClick={() => navigate('/')}>
                {language === 'fa' ? 'بازگشت به صفحه اصلی' : 'Back to Home'}
              </Button>
            </CardContent>
          </Card>
        </div>
        <FooterSection />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900">
      <Navigation />
      <div className="pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Hero Header */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {language === 'fa' ? '🎉 اشتراک آماده است!' : '🎉 Subscription Ready!'}
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              {language === 'fa' ? 
                'اشتراک VPN شما با موفقیت ایجاد شد و آماده استفاده است' : 
                'Your VPN subscription has been successfully created and is ready to use'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* 🔐 Subscription Summary */}
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <CardHeader className="border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Shield className="w-6 h-6 text-blue-600" />
                      🔐 {language === 'fa' ? 'خلاصه اشتراک' : 'Subscription Summary'}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(subscription.status)}>
                        {getStatusIcon(subscription.status)}
                        <span className="ml-1">
                          {subscription.status === 'active' && (language === 'fa' ? 'فعال' : 'Active')}
                          {subscription.status === 'pending' && (language === 'fa' ? 'در انتظار' : 'Pending')}
                          {subscription.status === 'expired' && (language === 'fa' ? 'منقضی' : 'Expired')}
                        </span>
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshSubscription}
                        disabled={refreshing}
                        className="h-8"
                      >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {language === 'fa' ? 'نام کاربری' : 'Username'}
                        </div>
                        <div className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">
                          {subscription.username}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                            {language === 'fa' ? 'حجم داده' : 'Data Limit'}
                          </div>
                          <div className="text-lg font-semibold">{subscription.data_limit_gb} GB</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                            {language === 'fa' ? 'مدت زمان' : 'Duration'}
                          </div>
                          <div className="text-lg font-semibold">{subscription.duration_days} {language === 'fa' ? 'روز' : 'days'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {subscription.subscription_plans && (
                        <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                            {language === 'fa' ? 'پلن' : 'Plan'}
                          </div>
                          <div className="font-semibold text-purple-600 dark:text-purple-400">
                            {language === 'fa' ? subscription.subscription_plans.name_fa : subscription.subscription_plans.name_en}
                          </div>
                          {subscription.subscription_plans.panel_servers && (
                            <div className="text-xs text-gray-500 mt-1">
                              📍 {subscription.subscription_plans.panel_servers.name}
                            </div>
                          )}
                        </div>
                      )}

                      {countdown && (
                        <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-lg">
                          <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                            <Clock className="w-4 h-4" />
                            <div>
                              <div className="text-sm font-medium">
                                {language === 'fa' ? 'زمان باقی‌مانده' : 'Time Remaining'}
                              </div>
                              <div className="font-mono font-bold">{countdown}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 🔗 Subscription URL */}
              {subscription.subscription_url ? (
                <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  <CardHeader className="border-b border-gray-100 dark:border-gray-700">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Zap className="w-6 h-6 text-green-600" />
                      🔗 {language === 'fa' ? 'لینک اشتراک (Sub Link)' : 'Subscription URL (Sub Link)'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'fa' ? 
                        'لینک اشتراک خود را کپی کرده یا کد QR را اسکن کنید' : 
                        'Copy your subscription link or scan the QR code'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {language === 'fa' ? 'لینک اشتراک' : 'Subscription Link'}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(subscription.subscription_url!)}
                              className="h-8"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={downloadConfig}
                              className="h-8"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <code className="text-xs break-all text-gray-800 dark:text-gray-200 block bg-white dark:bg-gray-900 p-3 rounded border">
                          {subscription.subscription_url}
                        </code>
                      </div>

                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <p className="font-semibold text-green-800 dark:text-green-200 mb-1">
                              {language === 'fa' ? '✅ پیکربندی آماده است!' : '✅ Configuration Ready!'}
                            </p>
                            <p className="text-green-700 dark:text-green-300">
                              {language === 'fa' ? 
                                'لینک پیکربندی را در برنامه VPN خود وارد کنید' : 
                                'Import the configuration link into your VPN app'
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-3">
                          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <p className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                              🛡️ {language === 'fa' ? 'نکته امنیتی' : 'Security Note'}
                            </p>
                            <p className="text-blue-700 dark:text-blue-300">
                              {language === 'fa' ? 
                                'این لینک را با دیگران به اشتراک نگذارید' : 
                                'Do not share this link with others'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                  <CardContent className="text-center py-8">
                    <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {language === 'fa' ? 'در حال آماده‌سازی...' : 'Preparing Configuration...'}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {language === 'fa' ? 
                        'پیکربندی VPN شما در حال آماده‌سازی است. لطفاً چند دقیقه صبر کنید.' : 
                        'Your VPN configuration is being prepared. Please wait a few minutes.'
                      }
                    </p>
                    <Button onClick={refreshSubscription} disabled={refreshing}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                      {language === 'fa' ? 'بررسی مجدد' : 'Check Again'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* 🧩 Full Configuration */}
              {subscription.subscription_url && (
                <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  <CardHeader className="border-b border-gray-100 dark:border-gray-700">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Monitor className="w-6 h-6 text-purple-600" />
                      🧩 {language === 'fa' ? 'پیکربندی کامل' : 'Full Configuration'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <Tabs defaultValue="subscription" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="subscription">
                          {language === 'fa' ? 'لینک اشتراک' : 'Subscription'}
                        </TabsTrigger>
                        <TabsTrigger value="vless">VLESS</TabsTrigger>
                        <TabsTrigger value="vmess">VMess</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="subscription" className="space-y-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Subscription URL</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(subscription.subscription_url!)}
                            >
                              <Copy className="w-4 h-4 mr-1" />
                              {language === 'fa' ? 'کپی' : 'Copy'}
                            </Button>
                          </div>
                          <code className="text-xs break-all block bg-white dark:bg-gray-900 p-3 rounded border">
                            {subscription.subscription_url}
                          </code>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="vless">
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <p className="text-sm text-purple-700 dark:text-purple-300">
                            {language === 'fa' ? 
                              'پیکربندی VLESS از طریق لینک اشتراک در دسترس است' : 
                              'VLESS configuration is available through the subscription link'
                            }
                          </p>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="vmess">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            {language === 'fa' ? 
                              'پیکربندی VMess از طریق لینک اشتراک در دسترس است' : 
                              'VMess configuration is available through the subscription link'
                            }
                          </p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}

              {/* 🎓 Setup Guides */}
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <CardHeader className="border-b border-gray-100 dark:border-gray-700">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Smartphone className="w-6 h-6 text-indigo-600" />
                    📓 {language === 'fa' ? 'راهنمای نصب' : 'Setup Guides'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {[
                      { platform: 'android', name: 'Android', icon: '📱', app: 'V2rayNG' },
                      { platform: 'ios', name: 'iOS', icon: '📱', app: 'FairVPN' },
                      { platform: 'windows', name: 'Windows', icon: '💻', app: 'V2rayN' },
                      { platform: 'macos', name: 'macOS', icon: '💻', app: 'V2rayU' },
                      { platform: 'linux', name: 'Linux', icon: '🐧', app: 'Qv2ray' }
                    ].map((item) => (
                      <Collapsible key={item.platform} open={showGuides[item.platform]} onOpenChange={() => toggleGuide(item.platform)}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-start p-4 h-auto">
                            <div className="flex items-center gap-3 w-full">
                              <span className="text-2xl">{item.icon}</span>
                              <div className="text-left flex-1">
                                <div className="font-semibold">{item.name}</div>
                                <div className="text-sm text-gray-500">{language === 'fa' ? 'برنامه پیشنهادی:' : 'Recommended app:'} {item.app}</div>
                              </div>
                              {showGuides[item.platform] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                            </div>
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-4">
                          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                            <div className="text-sm space-y-2">
                              <div className="flex items-start gap-2">
                                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                                <p>
                                  {language === 'fa' ? 
                                    `برنامه ${item.app} را دانلود و نصب کنید` : 
                                    `Download and install ${item.app}`
                                  }
                                </p>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                                <p>
                                  {language === 'fa' ? 
                                    'لینک اشتراک را کپی کنید' : 
                                    'Copy the subscription link'
                                  }
                                </p>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                                <p>
                                  {language === 'fa' ? 
                                    'در برنامه، گزینه "Add Subscription" را انتخاب کنید' : 
                                    'In the app, select "Add Subscription"'
                                  }
                                </p>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">4</span>
                                <p>
                                  {language === 'fa' ? 
                                    'لینک را وارد کرده و اتصال برقرار کنید' : 
                                    'Paste the link and connect'
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - QR Code & Apps */}
            <div className="space-y-6">
              
              {/* QR Code */}
              {qrCodeDataUrl && (
                <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  <CardHeader className="text-center border-b border-gray-100 dark:border-gray-700">
                    <CardTitle className="flex items-center justify-center gap-2">
                      <QrCode className="w-6 h-6 text-gray-600" />
                      {language === 'fa' ? 'کد QR' : 'QR Code'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="text-center space-y-4">
                      <div className="flex justify-center">
                        <div className="p-4 bg-white rounded-xl shadow-inner border-2 border-gray-100">
                          <img src={qrCodeDataUrl} alt="Subscription QR Code" className="w-48 h-48" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {language === 'fa' ? 
                          'این کد را با اپ V2Ray اسکن کنید' : 
                          'Scan this QR code with your V2Ray app'
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 📱 Apps Section */}
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <CardHeader className="border-b border-gray-100 dark:border-gray-700">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Smartphone className="w-6 h-6 text-green-600" />
                    📱 {language === 'fa' ? 'دانلود برنامه‌ها' : 'Download Apps'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Button className="w-full justify-start bg-green-600 hover:bg-green-700" size="lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📱</span>
                        <div className="text-left">
                          <div className="font-semibold">Android</div>
                          <div className="text-sm opacity-90">V2rayNG</div>
                        </div>
                      </div>
                    </Button>
                    
                    <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700" size="lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📱</span>
                        <div className="text-left">
                          <div className="font-semibold">iOS</div>
                          <div className="text-sm opacity-90">FairVPN</div>
                        </div>
                      </div>
                    </Button>
                    
                    <Button className="w-full justify-start bg-purple-600 hover:bg-purple-700" size="lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">💻</span>
                        <div className="text-left">
                          <div className="font-semibold">Windows</div>
                          <div className="text-sm opacity-90">V2rayN</div>
                        </div>
                      </div>
                    </Button>
                    
                    <Button className="w-full justify-start bg-gray-600 hover:bg-gray-700" size="lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">💻</span>
                        <div className="text-left">
                          <div className="font-semibold">macOS</div>
                          <div className="text-sm opacity-90">V2rayU</div>
                        </div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 🛠️ Support Section */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                <CardHeader className="border-b border-blue-100 dark:border-blue-800">
                  <CardTitle className="flex items-center gap-2 text-xl text-blue-700 dark:text-blue-300">
                    <MessageCircle className="w-6 h-6" />
                    🛠️ {language === 'fa' ? 'پشتیبانی' : 'Support'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <p className="text-gray-600 dark:text-gray-300">
                      {language === 'fa' ? 'مشکلی دارید؟ با پشتیبانی تماس بگیرید' : 'Having issues? Contact support'}
                    </p>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                      <MessageCircle className="w-5 h-5 mr-2" />
                      {language === 'fa' ? 'پشتیبانی تلگرام' : 'Telegram Support'}
                    </Button>
                    <p className="text-xs text-gray-500">
                      @bnets_support
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      </div>
      <FooterSection />
    </div>
  );
};

export default DeliveryPage;
