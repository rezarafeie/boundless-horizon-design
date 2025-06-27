import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { CheckCircle, Copy, Download, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import QRCodeCanvas from 'qrcode';

interface SubscriptionResponse {
  username: string;
  subscription_url: string;
  expire: number;
  data_limit: number;
}

interface SubscriptionSuccessProps {
  result: SubscriptionResponse;
  subscriptionId?: string;
  onStartOver?: () => void;
}

const SubscriptionSuccess = ({ result, subscriptionId, onStartOver }: SubscriptionSuccessProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    console.log('SUBSCRIPTION_SUCCESS: Component mounted with subscriptionId:', subscriptionId);
    
    if (subscriptionId) {
      fetchSubscriptionDetails();
    }
  }, [subscriptionId]);

  const fetchSubscriptionDetails = async () => {
    if (!subscriptionId) return;

    try {
      console.log('SUBSCRIPTION_SUCCESS: Fetching subscription details for ID:', subscriptionId);
      
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (error) {
        console.error('SUBSCRIPTION_SUCCESS: Error fetching subscription:', error);
        return;
      }

      console.log('SUBSCRIPTION_SUCCESS: Subscription data loaded:', subscription);
      setSubscriptionData(subscription);
      
      if (subscription.subscription_url) {
        await generateQRCode(subscription.subscription_url);
      }
    } catch (error) {
      console.error('SUBSCRIPTION_SUCCESS: Error in fetchSubscriptionDetails:', error);
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

  const refreshSubscription = async () => {
    setIsRefreshing(true);
    await fetchSubscriptionDetails();
    setIsRefreshing(false);
    
    toast({
      title: language === 'fa' ? 'بروزرسانی شد' : 'Refreshed',
      description: language === 'fa' ? 
        'اطلاعات اشتراک بروزرسانی شد' : 
        'Subscription data updated',
    });
  };

  const goToDeliveryPage = () => {
    if (subscriptionId) {
      navigate(`/subscription-delivery?id=${subscriptionId}`, { replace: true });
    }
  };

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

  const handleStartOver = () => {
    if (onStartOver) {
      onStartOver();
    } else {
      window.location.reload();
    }
  };

  // If we have detailed subscription data, show it
  if (subscriptionData) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center mb-6">
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

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button onClick={goToDeliveryPage} variant="outline">
            <ArrowRight className="w-4 h-4 mr-2" />
            {language === 'fa' ? 'مشاهده جزئیات کامل' : 'View Full Details'}
          </Button>
          {onStartOver && (
            <Button onClick={handleStartOver} variant="secondary">
              {language === 'fa' ? 'شروع مجدد' : 'Start Over'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Fallback to original result display if no detailed data
  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-4 animate-scale-in">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
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
          {/* Quick Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-gray-600 dark:text-gray-400 text-xs">{language === 'fa' ? 'نام کاربری' : 'Username'}</p>
              <p className="font-mono text-lg font-bold">{result.username}</p>
            </div>
            <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-gray-600 dark:text-gray-400 text-xs">{language === 'fa' ? 'تاریخ انقضا' : 'Expiry Date'}</p>
              <p className="font-bold">{new Date(result.expire * 1000).toLocaleDateString()}</p>
            </div>
            <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-gray-600 dark:text-gray-400 text-xs">{language === 'fa' ? 'حجم' : 'Volume'}</p>
              <p className="font-bold">{Math.round(result.data_limit / 1073741824)} GB</p>
            </div>
          </div>

          {/* Connection Link */}
          {result.subscription_url && (
            <div className="space-y-2">
              <Label>{language === 'fa' ? 'لینک اتصال' : 'Connection Link'}</Label>
              <div className="bg-muted p-3 rounded-lg">
                <code className="text-xs break-all">{result.subscription_url}</code>
              </div>
              <Button
                variant="outline"
                onClick={() => copyToClipboard(result.subscription_url)}
                className="w-full"
              >
                <Copy className="w-4 h-4 mr-2" />
                {language === 'fa' ? 'کپی لینک' : 'Copy Link'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSuccess;
