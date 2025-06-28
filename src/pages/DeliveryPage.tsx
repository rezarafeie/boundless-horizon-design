import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Copy, Download, RefreshCw, AlertCircle, CheckCircle, Clock, ExternalLink, QrCode, Smartphone, Monitor, ChevronDown, ChevronRight, Shield, MessageCircle, Zap, Calendar, RotateCcw, Bookmark, Share2 } from 'lucide-react';
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
  const [timeProgress, setTimeProgress] = useState(0);
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

  // Auto-reload for pending subscriptions
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (subscription?.status === 'pending') {
      console.log('Setting up auto-reload for pending subscription');
      interval = setInterval(() => {
        console.log('Auto-reloading pending subscription...');
        fetchSubscription();
      }, 10000); // Reload every 10 seconds
    }

    return () => {
      if (interval) {
        console.log('Clearing auto-reload interval');
        clearInterval(interval);
      }
    };
  }, [subscription?.status]);

  // Enhanced countdown timer with progress calculation
  useEffect(() => {
    if (subscription?.expire_at && subscription?.created_at) {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const expiry = new Date(subscription.expire_at!).getTime();
        const created = new Date(subscription.created_at).getTime();
        const totalDuration = expiry - created;
        const timeElapsed = now - created;
        const timeRemaining = expiry - now;

        if (timeRemaining > 0) {
          const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
          setCountdown(`${days}d ${hours}h ${minutes}m`);
          
          // Calculate progress (0-100)
          const progress = Math.min(100, Math.max(0, (timeElapsed / totalDuration) * 100));
          setTimeProgress(progress);
        } else {
          setCountdown('Expired');
          setTimeProgress(100);
        }
      }, 60000);

      // Initial calculation
      const now = new Date().getTime();
      const expiry = new Date(subscription.expire_at!).getTime();
      const created = new Date(subscription.created_at).getTime();
      const totalDuration = expiry - created;
      const timeElapsed = now - created;
      const timeRemaining = expiry - now;

      if (timeRemaining > 0) {
        const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        setCountdown(`${days}d ${hours}h ${minutes}m`);
        
        const progress = Math.min(100, Math.max(0, (timeElapsed / totalDuration) * 100));
        setTimeProgress(progress);
      } else {
        setCountdown('Expired');
        setTimeProgress(100);
      }

      return () => clearInterval(timer);
    }
  }, [subscription?.expire_at, subscription?.created_at]);

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
      
      if (data.subscription_url) {
        await generateQRCode(data.subscription_url);
      }
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

  const saveThisPage = () => {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      localStorage.setItem(`subscription_${subscription?.id}`, window.location.href);
      toast({
        title: language === 'fa' ? 'ذخیره شد' : 'Saved',
        description: language === 'fa' ? 'لینک صفحه ذخیره شد' : 'Page saved to bookmarks'
      });
    }
  };

  const shareSubscription = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `VPN Subscription - ${subscription?.username}`,
          text: 'My VPN subscription details',
          url: window.location.href
        });
      } catch (error) {
        copyToClipboard(window.location.href);
      }
    } else {
      copyToClipboard(window.location.href);
    }
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isExpired = subscription?.expire_at ? new Date(subscription.expire_at) < new Date() : false;
  const isPending = subscription?.status === 'pending';

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* 🎯 Hero Header Section */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                {isExpired ? <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" /> : 
                 isPending ? <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" /> :
                 <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {isExpired ? 
                  (language === 'fa' ? '⏰ اشتراک منقضی شده' : '⏰ Subscription Expired') :
                  isPending ?
                  (language === 'fa' ? '⏳ اشتراک در انتظار تایید' : '⏳ Subscription Pending') :
                  (language === 'fa' ? '🎉 اشتراک فعال است!' : '🎉 Subscription Active!')
                }
              </h1>
            </div>
            
            {/* Username Display */}
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-full border">
                <Shield className="w-5 h-5 text-blue-600" />
                <span className="font-mono text-lg font-bold text-blue-700 dark:text-blue-300">
                  {subscription.username}
                </span>
              </div>
            </div>

            {/* Plan Info */}
            <div className="text-gray-600 dark:text-gray-300 text-lg mb-6">
              <span className="font-semibold">
                {language === 'fa' ? subscription.subscription_plans?.name_fa : subscription.subscription_plans?.name_en}
              </span>
              <span className="mx-2">•</span>
              <span>{subscription.data_limit_gb}GB</span>
              <span className="mx-2">•</span>
              <span>{subscription.duration_days} {language === 'fa' ? 'روز' : 'days'}</span>
            </div>

            {/* Progress Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* Time Progress */}
              <div className="p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur rounded-xl border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    ⏱️ {language === 'fa' ? 'زمان باقی‌مانده' : 'Time Remaining'}
                  </span>
                  <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                    {countdown}
                  </span>
                </div>
                <Progress 
                  value={timeProgress} 
                  className="h-2 bg-orange-100 dark:bg-orange-900/30"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {subscription.expire_at && formatDate(subscription.expire_at)}
                </div>
              </div>

              {/* Traffic Progress (Placeholder - would need actual usage data) */}
              <div className="p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur rounded-xl border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    📊 {language === 'fa' ? 'ترافیک باقی‌مانده' : 'Traffic Remaining'}
                  </span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {subscription.data_limit_gb}GB
                  </span>
                </div>
                <Progress 
                  value={0} 
                  className="h-2 bg-blue-100 dark:bg-blue-900/30"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {language === 'fa' ? 'ترافیک کامل در دسترس' : 'Full traffic available'}
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="mt-6">
              <Badge className={`${getStatusColor(subscription.status)} text-lg px-4 py-2`}>
                {getStatusIcon(subscription.status)}
                <span className="ml-2">
                  {isExpired ? (language === 'fa' ? '🔴 منقضی' : '🔴 Expired') : 
                   isPending ? (language === 'fa' ? '🟡 در انتظار' : '🟡 Pending') :
                   subscription.status === 'active' && (language === 'fa' ? '🟢 فعال' : '🟢 Active')}
                </span>
              </Badge>
            </div>

            {/* Auto-reload notice for pending subscriptions */}
            {isPending && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {language === 'fa' ? 
                    '🔄 این صفحه هر 10 ثانیه بروزرسانی می‌شود تا وضعیت اشتراک شما بررسی شود' : 
                    '🔄 This page auto-refreshes every 10 seconds to check your subscription status'
                  }
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* 🔗 Subscription URL & QR Code Section */}
              {subscription.subscription_url ? (
                <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  <CardHeader className="border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Zap className="w-6 h-6 text-green-600" />
                        🔗 {language === 'fa' ? 'لینک اشتراک (Sub Link)' : 'Subscription URL (Sub Link)'}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={saveThisPage}
                          className="h-8"
                        >
                          <Bookmark className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={shareSubscription}
                          className="h-8"
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
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

                      {/* QR Code */}
                      {qrCodeDataUrl && (
                        <div className="flex justify-center">
                          <div className="p-4 bg-white rounded-xl shadow-inner border-2 border-gray-100">
                            <img src={qrCodeDataUrl} alt="Subscription QR Code" className="w-48 h-48 md:w-64 md:h-64" />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {/* 🔐 Individual Protocol Configs Section */}
              {subscription.subscription_url && (
                <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  <CardHeader className="border-b border-gray-100 dark:border-gray-700">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Monitor className="w-6 h-6 text-purple-600" />
                      🔐 {language === 'fa' ? 'پیکربندی‌های پروتکل' : 'Protocol Configurations'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <Tabs defaultValue="subscription" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="subscription">
                          {language === 'fa' ? 'اشتراک' : 'Subscription'}
                        </TabsTrigger>
                        <TabsTrigger value="vless">VLESS</TabsTrigger>
                        <TabsTrigger value="vmess">VMess</TabsTrigger>
                        <TabsTrigger value="trojan">Trojan</TabsTrigger>
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
                          <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                            {language === 'fa' ? 
                              'پیکربندی VLESS از طریق لینک اشتراک در دسترس است' : 
                              'VLESS configuration is available through the subscription link'
                            }
                          </p>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {language === 'fa' ? 
                              'برای دسترسی به پیکربندی‌های جداگانه، لینک اشتراک را در اپ خود وارد کنید' :
                              'To access individual configurations, import the subscription link in your app'
                            }
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="vmess">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                            {language === 'fa' ? 
                              'پیکربندی VMess از طریق لینک اشتراک در دسترس است' : 
                              'VMess configuration is available through the subscription link'
                            }
                          </p>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {language === 'fa' ? 
                              'برای دسترسی به پیکربندی‌های جداگانه، لینک اشتراک را در اپ خود وارد کنید' :
                              'To access individual configurations, import the subscription link in your app'
                            }
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="trojan">
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                            {language === 'fa' ? 
                              'پیکربندی Trojan از طریق لینک اشتراک در دسترس است' : 
                              'Trojan configuration is available through the subscription link'
                            }
                          </p>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {language === 'fa' ? 
                              'برای دسترسی به پیکربندی‌های جداگانه، لینک اشتراک را در اپ خود وارد کنید' :
                              'To access individual configurations, import the subscription link in your app'
                            }
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}

              {/* ♻️ Renewal Section */}
              {(isExpired || countdown.includes('d')) && (
                <Card className={`border-0 shadow-lg ${isExpired ? 'bg-red-50 dark:bg-red-900/20 border-red-200' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200'}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <RotateCcw className={`w-6 h-6 ${isExpired ? 'text-red-600' : 'text-yellow-600'}`} />
                      ♻️ {language === 'fa' ? 'تمدید اشتراک' : 'Renewal'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Calendar className={`w-5 h-5 ${isExpired ? 'text-red-600' : 'text-yellow-600'} mt-0.5 flex-shrink-0`} />
                      <div>
                        <p className={`font-semibold ${isExpired ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'} mb-1`}>
                          {isExpired ? 
                            (language === 'fa' ? '🔴 اشتراک منقضی شده' : '🔴 Subscription Expired') :
                            (language === 'fa' ? '⚠️ اشتراک به زودی منقضی می‌شود' : '⚠️ Subscription Expiring Soon')
                          }
                        </p>
                        <p className={`text-sm ${isExpired ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'} mb-3`}>
                          {language === 'fa' ? 
                            'برای تمدید اشتراک خود به صفحه تمدید مراجعه کنید' : 
                            'Visit the renewal page to extend your subscription'
                          }
                        </p>
                        <Button 
                          onClick={() => navigate('/renewal')}
                          className={`${isExpired ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'} text-white`}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          {language === 'fa' ? '🔄 تمدید کنید' : '🔄 Renew Now'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 🎓 Setup Guides */}
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <CardHeader className="border-b border-gray-100 dark:border-gray-700">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Smartphone className="w-6 h-6 text-indigo-600" />
                    🎓 {language === 'fa' ? 'راهنمای نصب' : 'Setup Guides'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {[
                      { platform: 'android', name: 'Android', icon: '📱', app: 'V2rayNG', description: 'Best for Android devices' },
                      { platform: 'ios', name: 'iOS', icon: '📱', app: 'FairVPN', description: 'Available on App Store' },
                      { platform: 'windows', name: 'Windows', icon: '💻', app: 'V2rayN', description: 'Desktop application' },
                      { platform: 'macos', name: 'macOS', icon: '💻', app: 'V2rayU', description: 'For Mac computers' },
                      { platform: 'linux', name: 'Linux', icon: '🐧', app: 'Qv2ray', description: 'Open source client' }
                    ].map((item) => (
                      <Collapsible key={item.platform} open={showGuides[item.platform]} onOpenChange={() => toggleGuide(item.platform)}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-start p-4 h-auto">
                            <div className="flex items-center gap-3 w-full">
                              <span className="text-2xl">{item.icon}</span>
                              <div className="text-left flex-1">
                                <div className="font-semibold">{item.name}</div>
                                <div className="text-sm text-gray-500">{language === 'fa' ? 'برنامه پیشنهادی:' : 'Recommended app:'} {item.app}</div>
                                <div className="text-xs text-gray-400">{item.description}</div>
                              </div>
                              {showGuides[item.platform] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                            </div>
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-4">
                          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                            <div className="text-sm space-y-3">
                              <div className="flex items-start gap-3">
                                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                                <p>
                                  {language === 'fa' ? 
                                    `برنامه ${item.app} را دانلود و نصب کنید` : 
                                    `Download and install ${item.app}`
                                  }
                                </p>
                              </div>
                              <div className="flex items-start gap-3">
                                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                                <p>
                                  {language === 'fa' ? 
                                    'لینک اشتراک را کپی کنید' : 
                                    'Copy the subscription link'
                                  }
                                </p>
                              </div>
                              <div className="flex items-start gap-3">
                                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                                <p>
                                  {language === 'fa' ? 
                                    'در برنامه، گزینه "Add Subscription" را انتخاب کنید' : 
                                    'In the app, select "Add Subscription"'
                                  }
                                </p>
                              </div>
                              <div className="flex items-start gap-3">
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

            {/* Right Column - Apps & Support */}
            <div className="space-y-6">
              
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
                    {[
                      { name: 'V2rayNG', platform: 'Android', icon: '📱', color: 'bg-green-600 hover:bg-green-700' },
                      { name: 'Streisand', platform: 'iOS', icon: '📱', color: 'bg-blue-600 hover:bg-blue-700' },
                      { name: 'Karimg', platform: 'Android/iOS', icon: '📱', color: 'bg-purple-600 hover:bg-purple-700' },
                      { name: 'Happynet', platform: 'Multi-platform', icon: '🌐', color: 'bg-orange-600 hover:bg-orange-700' },
                      { name: 'V2BOX', platform: 'iOS', icon: '📱', color: 'bg-indigo-600 hover:bg-indigo-700' },
                      { name: 'V2rayN', platform: 'Windows', icon: '💻', color: 'bg-gray-600 hover:bg-gray-700' }
                    ].map((app, index) => (
                      <Button key={index} className={`w-full justify-start ${app.color} text-white`} size="lg">
                        <div className="flex items-center gap-3 w-full">
                          <span className="text-2xl">{app.icon}</span>
                          <div className="text-left flex-1">
                            <div className="font-semibold">{app.name}</div>
                            <div className="text-sm opacity-90">{app.platform}</div>
                          </div>
                          <ExternalLink className="w-4 h-4" />
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 📞 Support Section */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                <CardHeader className="border-b border-blue-100 dark:border-blue-800">
                  <CardTitle className="flex items-center gap-2 text-xl text-blue-700 dark:text-blue-300">
                    <MessageCircle className="w-6 h-6" />
                    📞 {language === 'fa' ? 'پشتیبانی' : 'Support'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                      <p className="text-gray-600 dark:text-gray-300 mb-3">
                        ❓ {language === 'fa' ? 'مشکلی دارید؟ با پشتیبانی تماس بگیرید' : 'Need help? Reach out to our support team.'}
                      </p>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="lg">
                        <MessageCircle className="w-5 h-5 mr-2" />
                        {language === 'fa' ? 'پشتیبانی تلگرام' : 'Telegram Support'}
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">
                        @bnets_support
                      </p>
                    </div>
                    
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        🕒 {language === 'fa' ? 'پاسخگویی ۲۴/۷' : '24/7 Support Available'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Usage Tips */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20">
                <CardHeader className="border-b border-green-100 dark:border-green-800">
                  <CardTitle className="flex items-center gap-2 text-xl text-green-700 dark:text-green-300">
                    <Zap className="w-6 h-6" />
                    💡 {language === 'fa' ? 'نکات کاربردی' : 'Usage Tips'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3 text-sm text-green-700 dark:text-green-300">
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <p>
                        {language === 'fa' ? 
                          'برای بهترین عملکرد، از سرورهای نزدیک استفاده کنید' :
                          'For best performance, use nearby servers'
                        }
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <p>
                        {language === 'fa' ? 
                          'در صورت قطعی، پروتکل دیگری را امتحان کنید' :
                          'If connection fails, try a different protocol'
                        }
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <p>
                        {language === 'fa' ? 
                          'لینک اشتراک را به‌روزرسانی کنید' :
                          'Keep your subscription link updated'
                        }
                      </p>
                    </div>
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
