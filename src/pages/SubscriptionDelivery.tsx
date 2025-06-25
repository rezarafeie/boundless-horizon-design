import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { CheckCircle, Copy, Download, AlertCircle, ArrowLeft, Loader, RefreshCw, ExternalLink, ChevronDown, ChevronUp, Smartphone, Monitor, Apple } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import QRCodeCanvas from 'qrcode';
import Navigation from '@/components/Navigation';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SubscriptionData {
  username: string;
  subscription_url: string | null;
  expire_at: string;
  data_limit_gb: number;
  status: string;
  mobile: string;
  price_toman: number;
  notes?: string;
}

const SubscriptionDelivery = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [openInstructions, setOpenInstructions] = useState<string | null>(null);

  useEffect(() => {
    const loadSubscriptionData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const subscriptionId = searchParams.get('id');
        if (!subscriptionId) {
          throw new Error('No subscription ID provided');
        }

        console.log('DELIVERY: Loading subscription data for ID:', subscriptionId);
        
        const { data: subscription, error: dbError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('id', subscriptionId)
          .single();

        if (dbError) {
          console.error('DELIVERY: Database fetch error:', dbError);
          throw new Error(`Database error: ${dbError.message}`);
        }

        if (!subscription) {
          throw new Error('Subscription not found');
        }

        console.log('DELIVERY: Subscription loaded:', subscription);
        setSubscriptionData(subscription);
        
        if (subscription.subscription_url) {
          await generateQRCode(subscription.subscription_url);
        }

      } catch (error: any) {
        console.error('DELIVERY: Error loading subscription data:', error);
        setError(error.message || (language === 'fa' ? 'خطا در بارگذاری اطلاعات' : 'Error loading subscription data'));
      } finally {
        setIsLoading(false);
      }
    };

    loadSubscriptionData();
  }, [searchParams, language]);

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
      const subscriptionId = searchParams.get('id');
      if (!subscriptionId) return;

      console.log('DELIVERY: Refreshing subscription data...');
      
      const { data: subscription, error: dbError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      if (subscription) {
        setSubscriptionData(subscription);
        
        if (subscription.subscription_url && subscription.subscription_url !== subscriptionData.subscription_url) {
          await generateQRCode(subscription.subscription_url);
        }
        
        toast({
          title: language === 'fa' ? 'بروزرسانی شد' : 'Refreshed',
          description: language === 'fa' ? 
            'اطلاعات اشتراک بروزرسانی شد' : 
            'Subscription data updated',
        });
      }
    } catch (error) {
      console.error('DELIVERY: Error refreshing subscription:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در بروزرسانی' : 'Failed to refresh',
        variant: 'destructive'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const calculateDaysRemaining = () => {
    if (!subscriptionData?.expire_at) return null;
    
    const now = new Date();
    const expireDate = new Date(subscriptionData.expire_at);
    const diffTime = expireDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const apps = [
    {
      name: 'V2rayN',
      description: language === 'fa' ? 'ویندوز - رایگان و متن‌باز' : 'Windows - Free & Open Source',
      icon: Monitor,
      downloadUrl: 'https://github.com/2dust/v2rayN/releases',
      platform: 'Windows',
      instructions: language === 'fa' ? 
        ['دانلود و نصب V2rayN', 'کپی کردن لینک اشتراک', 'Import از subscription link', 'اتصال به سرور'] :
        ['Download and install V2rayN', 'Copy subscription link', 'Import from subscription link', 'Connect to server']
    },
    {
      name: 'Streisand',
      description: language === 'fa' ? 'لینوکس/مک - ابزار پیشرفته' : 'Linux/Mac - Advanced Tool',
      icon: Monitor,
      downloadUrl: 'https://github.com/StreisandEffect/streisand/releases',
      platform: 'Linux/Mac',
      instructions: language === 'fa' ? 
        ['دانلود Streisand', 'مطالعه راهنمای GitHub', 'تنظیم و deploy', 'Import کردن config'] :
        ['Download Streisand', 'Follow GitHub readme', 'Setup and deploy', 'Import config']
    },
    {
      name: 'Karimg',
      description: language === 'fa' ? 'اندروید - سریع و قابل اعتماد' : 'Android - Fast & Reliable',
      icon: Smartphone,
      downloadUrl: 'https://play.google.com/store/apps/details?id=com.karimg.v2ray',
      platform: 'Android',
      instructions: language === 'fa' ? 
        ['نصب از Google Play', 'وارد کردن لینک اشتراک', 'فعال کردن پروتکل VLESS', 'اتصال'] :
        ['Install from Google Play', 'Paste subscription link', 'Enable VLESS protocol', 'Connect']
    },
    {
      name: 'Happynet',
      description: language === 'fa' ? 'اندروید - رابط کاربری ساده' : 'Android - Simple Interface',
      icon: Smartphone,
      downloadUrl: 'https://play.google.com/store/apps/details?id=com.happynet.vpn',
      platform: 'Android',
      instructions: language === 'fa' ? 
        ['نصب Happynet', 'اسکن QR Code یا paste لینک', 'Import کردن config', 'برقراری اتصال'] :
        ['Install Happynet', 'Scan QR or paste link', 'Import config', 'Connect']
    },
    {
      name: 'V2BOX',
      description: language === 'fa' ? 'iOS - بهترین برای آیفون' : 'iOS - Best for iPhone',
      icon: Apple,
      downloadUrl: 'https://apps.apple.com/app/id6446814690',
      platform: 'iOS',
      instructions: language === 'fa' ? 
        ['دانلود از App Store', 'اضافه کردن config با QR', 'یا paste کردن لینک', 'فعال‌سازی اتصال'] :
        ['Download from App Store', 'Add config via QR', 'or paste link', 'Activate connection']
    }
  ];

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
                  {language === 'fa' ? 'در حال بارگذاری اطلاعات اشتراک...' : 'Loading subscription data...'}
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
              <p className="text-muted-foreground">
                {error || (language === 'fa' ? 'اطلاعات اشتراک یافت نشد' : 'Subscription data not found')}
              </p>
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
      pending: { color: 'bg-yellow-500', text: language === 'fa' ? 'در انتظار' : 'Pending' },
      paid: { color: 'bg-blue-500', text: language === 'fa' ? 'پرداخت شده' : 'Paid' },
      expired: { color: 'bg-red-500', text: language === 'fa' ? 'منقضی' : 'Expired' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge className={`${config.color} text-white`}>{config.text}</Badge>;
  };

  const daysRemaining = calculateDaysRemaining();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
      <Navigation />
      <div className="pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header - Fixed positioning */}
          <div className="text-center mb-12">
            <div className="flex flex-col items-center gap-4 mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
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
                      <p className="font-bold">{subscriptionData.data_limit_gb} GB</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        {language === 'fa' ? 'تاریخ انقضا' : 'Expiry Date'}
                      </Label>
                      <p className="font-bold">
                        {subscriptionData.expire_at ? 
                          new Date(subscriptionData.expire_at).toLocaleDateString(
                            language === 'fa' ? 'fa-IR' : 'en-US'
                          ) : 
                          (language === 'fa' ? 'در حال پردازش' : 'Processing')
                        }
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        {language === 'fa' ? 'شماره موبایل' : 'Mobile'}
                      </Label>
                      <p className="font-bold">{subscriptionData.mobile}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        {language === 'fa' ? 'مبلغ پرداختی' : 'Amount Paid'}
                      </Label>
                      <p className="font-bold">
                        {subscriptionData.price_toman.toLocaleString()} 
                        {language === 'fa' ? ' تومان' : ' Toman'}
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
            </div>
          </div>

          {/* Apps Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                {language === 'fa' ? 'دانلود اپلیکیشن‌ها' : 'Download Apps'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {apps.map((app) => {
                  const Icon = app.icon;
                  return (
                    <div key={app.name} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Icon className="w-8 h-8 text-blue-600" />
                        <div>
                          <h4 className="font-semibold">{app.name}</h4>
                          <p className="text-sm text-muted-foreground">{app.description}</p>
                        </div>
                      </div>
                      
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(app.downloadUrl, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {language === 'fa' ? 'دانلود' : 'Download'}
                      </Button>

                      <Collapsible 
                        open={openInstructions === app.name} 
                        onOpenChange={(open) => setOpenInstructions(open ? app.name : null)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full flex items-center justify-between">
                            {language === 'fa' ? 'راهنمای نصب' : 'Setup Guide'}
                            {openInstructions === app.name ? 
                              <ChevronUp className="w-4 h-4" /> : 
                              <ChevronDown className="w-4 h-4" />
                            }
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 mt-2">
                          {app.instructions.map((step, index) => (
                            <div key={index} className="flex items-start gap-2 text-sm">
                              <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                {index + 1}
                              </span>
                              <span>{step}</span>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Renewal Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                {language === 'fa' ? 'تمدید اشتراک' : 'Renewal'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {daysRemaining !== null && (
                  <div className={`p-4 rounded-lg ${
                    daysRemaining <= 0 
                      ? 'bg-red-50 border border-red-200 dark:bg-red-900/20'
                      : daysRemaining <= 7
                      ? 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20'
                      : 'bg-green-50 border border-green-200 dark:bg-green-900/20'
                  }`}>
                    <p className={`font-medium ${
                      daysRemaining <= 0 
                        ? 'text-red-800 dark:text-red-200'
                        : daysRemaining <= 7
                        ? 'text-yellow-800 dark:text-yellow-200'
                        : 'text-green-800 dark:text-green-200'
                    }`}>
                      {daysRemaining <= 0 
                        ? (language === 'fa' ? 'اشتراک شما منقضی شده است' : 'Your subscription has expired')
                        : (language === 'fa' 
                          ? `اشتراک شما در ${daysRemaining} روز منقضی می‌شود`
                          : `Your subscription expires in ${daysRemaining} days`
                        )
                      }
                    </p>
                  </div>
                )}
                
                <p className="text-muted-foreground">
                  {language === 'fa' ? 
                    'برای تمدید اشتراک خود به صفحه تمدید مراجعه کنید' : 
                    'Visit the renewal page to extend your subscription'
                  }
                </p>
                
                <Button 
                  onClick={() => navigate('/renewal')}
                  className="w-full"
                  variant={daysRemaining !== null && daysRemaining <= 7 ? 'default' : 'outline'}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {language === 'fa' ? 'تمدید اکنون' : 'Renew Now'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Support Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>
                {language === 'fa' ? 'پشتیبانی' : 'Support'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  {language === 'fa' ? 
                    'آیا به کمک نیاز دارید؟ با تیم پشتیبانی ما در تماس باشید.' : 
                    'Need help? Get in touch with our support team.'
                  }
                </p>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open('https://t.me/bnets_support', '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {language === 'fa' ? 'پشتیبانی تلگرام' : 'Telegram Support'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Back Button */}
          <div className="text-center">
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

export default SubscriptionDelivery;
