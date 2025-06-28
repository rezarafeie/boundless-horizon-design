
import { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Copy, Download, QrCode, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRCodeCanvas from 'qrcode';

const DeliveryPage = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(null);

  useEffect(() => {
    const subscriptionId = searchParams.get('id');
    const stateData = location.state?.subscriptionData;
    
    if (subscriptionId) {
      fetchSubscriptionData(subscriptionId);
    } else if (stateData) {
      setSubscriptionData(stateData);
      setIsLoading(false);
      if (stateData.subscription_url) {
        generateQRCode(stateData.subscription_url);
      }
    } else {
      setIsLoading(false);
    }
  }, [searchParams, location.state]);

  // Auto-refresh for pending subscriptions
  useEffect(() => {
    if (subscriptionData?.status === 'pending') {
      console.log('Starting auto-refresh for pending subscription');
      const interval = setInterval(() => {
        const subscriptionId = searchParams.get('id');
        if (subscriptionId) {
          fetchSubscriptionData(subscriptionId, false); // silent refresh
        }
      }, 10000); // Refresh every 10 seconds

      setAutoRefreshInterval(interval);
      
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    } else {
      // Clear interval if subscription is no longer pending
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        setAutoRefreshInterval(null);
      }
    }
  }, [subscriptionData?.status, searchParams]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
      }
    };
  }, [autoRefreshInterval]);

  const fetchSubscriptionData = async (subscriptionId: string, showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      
      console.log('Fetching subscription data for ID:', subscriptionId);
      
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (error) {
        console.error('Error fetching subscription:', error);
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: language === 'fa' ? 'اشتراک یافت نشد' : 'Subscription not found',
          variant: 'destructive'
        });
        return;
      }

      console.log('Subscription data loaded:', subscription);
      setSubscriptionData(subscription);
      
      if (subscription.subscription_url) {
        await generateQRCode(subscription.subscription_url);
      }
      
      // If subscription became active, stop auto-refresh
      if (subscription.status === 'active' && autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        setAutoRefreshInterval(null);
        
        toast({
          title: language === 'fa' ? 'اشتراک فعال شد!' : 'Subscription Activated!',
          description: language === 'fa' ? 'اشتراک VPN شما آماده است' : 'Your VPN subscription is ready',
        });
      }
    } catch (error) {
      console.error('Error in fetchSubscriptionData:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

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

  const handleRefresh = async () => {
    const subscriptionId = searchParams.get('id');
    if (subscriptionId) {
      setIsRefreshing(true);
      await fetchSubscriptionData(subscriptionId);
      setIsRefreshing(false);
      
      toast({
        title: language === 'fa' ? 'بروزرسانی شد' : 'Refreshed',
        description: language === 'fa' ? 
          'اطلاعات اشتراک بروزرسانی شد' : 
          'Subscription data updated',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { 
        color: 'bg-green-500', 
        text: language === 'fa' ? 'فعال' : 'Active',
        icon: <CheckCircle className="w-4 h-4" />
      },
      pending: { 
        color: 'bg-yellow-500', 
        text: language === 'fa' ? 'در انتظار' : 'Pending',
        icon: <Clock className="w-4 h-4" />
      },
      paid: { 
        color: 'bg-blue-500', 
        text: language === 'fa' ? 'پرداخت شده' : 'Paid',
        icon: <CheckCircle className="w-4 h-4" />
      },
      expired: { 
        color: 'bg-red-500', 
        text: language === 'fa' ? 'منقضی' : 'Expired',
        icon: <AlertCircle className="w-4 h-4" />
      }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return (
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        {config.icon}
        {config.text}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <RefreshCw className="w-12 h-12 animate-spin mx-auto text-blue-600" />
              <h2 className="text-xl font-semibold">
                {language === 'fa' ? 'در حال بارگذاری...' : 'Loading...'}
              </h2>
              <p className="text-muted-foreground">
                {language === 'fa' ? 
                  'در حال دریافت اطلاعات اشتراک شما' : 
                  'Fetching your subscription details'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!subscriptionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {language === 'fa' ? 'اشتراک یافت نشد' : 'Subscription Not Found'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {language === 'fa' ? 
                'اطلاعات اشتراک یافت نشد. لطفاً از صحت لینک اطمینان حاصل کنید.' : 
                'Subscription details not found. Please verify the link is correct.'
              }
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {language === 'fa' ? '🎉 اشتراک VPN شما' : '🎉 Your VPN Subscription'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'fa' ? 'جزئیات و لینک اتصال اشتراک' : 'Subscription details and connection info'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    onClick={handleRefresh}
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
                      {subscriptionData.price_toman?.toLocaleString() || 'N/A'} 
                      {language === 'fa' ? ' تومان' : ' Toman'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Connection Info or Pending Message */}
            {subscriptionData.status === 'pending' ? (
              <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <Clock className="w-12 h-12 mx-auto text-yellow-600" />
                    <div>
                      <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                        {language === 'fa' ? 'در انتظار تایید' : 'Awaiting Approval'}
                      </h3>
                      <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                        {language === 'fa' ? 
                          'اشتراک شما در حال بررسی است. پس از تایید توسط ادمین، لینک اتصال نمایش داده خواهد شد.' : 
                          'Your subscription is under review. The connection link will be displayed after admin approval.'
                        }
                      </p>
                      <p className="text-yellow-600 text-xs mt-2">
                        {language === 'fa' ? 
                          '⏱️ بروزرسانی خودکار هر 10 ثانیه' : 
                          '⏱️ Auto-refreshing every 10 seconds'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : subscriptionData.subscription_url ? (
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
                      onClick={() => copyToClipboard(subscriptionData.subscription_url)}
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
              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <RefreshCw className="w-8 h-8 mx-auto text-blue-600 animate-spin" />
                    <p className="text-blue-800 dark:text-blue-200">
                      {language === 'fa' ? 
                        'در حال ایجاد لینک اتصال. لطفاً کمی صبر کنید...' : 
                        'Creating connection link. Please wait...'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - QR Code and Instructions */}
          <div className="space-y-6">
            {qrCodeDataUrl && subscriptionData.status !== 'pending' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-center flex items-center justify-center gap-2">
                    <QrCode className="w-5 h-5" />
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
      </div>
    </div>
  );
};

export default DeliveryPage;
