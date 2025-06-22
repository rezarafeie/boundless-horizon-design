
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, RefreshCw, AlertCircle, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import Navigation from '@/components/Navigation';
import FooterSection from '@/components/FooterSection';

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

      if (error) {
        console.error('DELIVERY_PAGE: Refresh error:', error);
        throw error;
      }

      console.log('DELIVERY_PAGE: Refresh response from STRICTLY assigned panel:', data);

      if (data.success && data.subscription) {
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
        throw new Error(data.error || 'Failed to fetch subscription from panel');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
        <Navigation />
        <div className="pt-20 flex items-center justify-center min-h-[80vh]">
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
        <Navigation />
        <div className="pt-20 flex items-center justify-center min-h-[80vh]">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
      <Navigation />
      <div className="pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {language === 'fa' ? 'تحویل اشتراک' : 'Subscription Delivery'}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {language === 'fa' ? 
                'اطلاعات کامل اشتراک و پیکربندی شما' : 
                'Complete subscription information and configuration'
              }
            </p>
          </div>

          {/* Subscription Status */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(subscription.status)}
                  {language === 'fa' ? 'وضعیت اشتراک' : 'Subscription Status'}
                </CardTitle>
                <Badge className={getStatusColor(subscription.status)}>
                  {subscription.status === 'active' && (language === 'fa' ? 'فعال' : 'Active')}
                  {subscription.status === 'pending' && (language === 'fa' ? 'در انتظار' : 'Pending')}
                  {subscription.status === 'expired' && (language === 'fa' ? 'منقضی' : 'Expired')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {language === 'fa' ? 'نام کاربری' : 'Username'}
                  </label>
                  <p className="font-mono text-lg">{subscription.username}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {language === 'fa' ? 'حجم داده' : 'Data Limit'}
                  </label>
                  <p className="text-lg">{subscription.data_limit_gb} GB</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {language === 'fa' ? 'مدت زمان' : 'Duration'}
                  </label>
                  <p className="text-lg">{subscription.duration_days} {language === 'fa' ? 'روز' : 'days'}</p>
                </div>
              </div>

              {/* Plan and Panel Information */}
              {subscription.subscription_plans && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    {language === 'fa' ? 'اطلاعات پلن و پنل' : 'Plan & Panel Information'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">
                        {language === 'fa' ? 'پلن:' : 'Plan:'}
                      </span>{' '}
                      {language === 'fa' ? subscription.subscription_plans.name_fa : subscription.subscription_plans.name_en}
                    </div>
                    {subscription.subscription_plans.panel_servers && (
                      <>
                        <div>
                          <span className="font-medium">
                            {language === 'fa' ? 'پنل:' : 'Panel:'}
                          </span>{' '}
                          {subscription.subscription_plans.panel_servers.name}
                        </div>
                        <div>
                          <span className="font-medium">
                            {language === 'fa' ? 'آدرس پنل:' : 'Panel URL:'}
                          </span>{' '}
                          <a 
                            href={subscription.subscription_plans.panel_servers.panel_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                          >
                            {subscription.subscription_plans.panel_servers.panel_url}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div>
                          <span className="font-medium">
                            {language === 'fa' ? 'وضعیت پنل:' : 'Panel Status:'}
                          </span>{' '}
                          <Badge variant={subscription.subscription_plans.panel_servers.health_status === 'online' ? 'default' : 'destructive'}>
                            {subscription.subscription_plans.panel_servers.health_status}
                          </Badge>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Expiry countdown */}
              {subscription.expire_at && countdown && (
                <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">
                      {language === 'fa' ? 'زمان باقی‌مانده:' : 'Time Remaining:'}
                    </span>
                    <span className="font-mono">{countdown}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configuration */}
          {subscription.subscription_url ? (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{language === 'fa' ? 'پیکربندی VPN' : 'VPN Configuration'}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshSubscription}
                    disabled={refreshing}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {language === 'fa' ? 'بروزرسانی' : 'Refresh'}
                  </Button>
                </CardTitle>
                <CardDescription>
                  {language === 'fa' ? 
                    'لینک پیکربندی VPN شما آماده است' : 
                    'Your VPN configuration link is ready'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {language === 'fa' ? 'لینک اشتراک' : 'Subscription Link'}
                      </label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(subscription.subscription_url!)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadConfig}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <code className="text-xs break-all text-gray-800 dark:text-gray-200 block">
                      {subscription.subscription_url}
                    </code>
                  </div>

                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                      <div className="text-sm text-green-800 dark:text-green-200">
                        <p className="font-semibold mb-1">
                          {language === 'fa' ? 'پیکربندی آماده است!' : 'Configuration Ready!'}
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
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-6">
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

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>
                {language === 'fa' ? 'راهنمای استفاده' : 'Usage Instructions'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">
                    {language === 'fa' ? '۱. نصب برنامه' : '1. Install App'}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    {language === 'fa' ? 
                      'برنامه‌های پیشنهادی: V2rayNG (اندروید)، V2rayN (ویندوز)، Qv2ray (لینوکس/مک)' : 
                      'Recommended apps: V2rayNG (Android), V2rayN (Windows), Qv2ray (Linux/Mac)'
                    }
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">
                    {language === 'fa' ? '۲. وارد کردن پیکربندی' : '2. Import Configuration'}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    {language === 'fa' ? 
                      'لینک اشتراک را کپی کرده و در برنامه VPN وارد کنید' : 
                      'Copy the subscription link and import it into your VPN app'
                    }
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">
                    {language === 'fa' ? '۳. اتصال' : '3. Connect'}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    {language === 'fa' ? 
                      'پس از وارد کردن پیکربندی، روی اتصال کلیک کنید' : 
                      'After importing the configuration, click connect'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
      <FooterSection />
    </div>
  );
};

export default DeliveryPage;
