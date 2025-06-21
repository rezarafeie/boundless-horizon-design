import { useState, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { CheckCircle, Copy, Download, AlertCircle, ArrowLeft, Loader, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PlanService } from '@/services/planService';
import QRCodeCanvas from 'qrcode';
import Navigation from '@/components/Navigation';

interface SubscriptionData {
  username: string;
  subscription_url: string | null;
  expire: number;
  data_limit: number;
  status: string;
  used_traffic?: number;
  panel_type?: string;
  panel_name?: string;
  panel_id?: string;
  panel_url?: string;
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
  const [panelStatus, setPanelStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const loadSubscriptionData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setPanelStatus('checking');

        console.log('DELIVERY: Loading subscription data with DYNAMIC panel selection...');
        console.log('DELIVERY: Location state:', location.state);
        console.log('DELIVERY: URL search params:', Object.fromEntries(searchParams.entries()));

        // Check different sources for subscription data
        let data: SubscriptionData | null = null;
        let planId: string | null = null;

        // 1. From URL state (navigation from subscription form)
        if (location.state?.subscriptionData) {
          console.log('DELIVERY: Found subscription data in location state:', location.state.subscriptionData);
          data = location.state.subscriptionData;
        }
        // 2. From localStorage (fallback)
        else if (localStorage.getItem('deliverySubscriptionData')) {
          try {
            data = JSON.parse(localStorage.getItem('deliverySubscriptionData')!);
            console.log('DELIVERY: Found subscription data in localStorage:', data);
          } catch (parseError) {
            console.error('DELIVERY: Failed to parse subscription data from localStorage:', parseError);
          }
        }
        // 3. From URL parameter 'id' - fetch from database
        else if (searchParams.get('id')) {
          const subscriptionId = searchParams.get('id');
          console.log('DELIVERY: Fetching subscription from database with ID:', subscriptionId);
          
          try {
            const { data: subscription, error: dbError } = await supabase
              .from('subscriptions')
              .select('*, subscription_plans(*)')
              .eq('id', subscriptionId)
              .single();

            if (dbError) {
              console.error('DELIVERY: Database fetch error:', dbError);
              throw new Error(`Database error: ${dbError.message}`);
            }

            if (subscription) {
              console.log('DELIVERY: Fetched subscription with plan data:', subscription);
              planId = subscription.plan_id;
              
              // Get panel info from plan using PlanService
              let panelInfo = null;
              if (planId) {
                try {
                  const plan = await PlanService.getPlanById(planId);
                  if (plan) {
                    const primaryPanel = PlanService.getPrimaryPanel(plan);
                    if (primaryPanel) {
                      panelInfo = {
                        panel_type: primaryPanel.type,
                        panel_name: primaryPanel.name,
                        panel_id: primaryPanel.id,
                        panel_url: primaryPanel.panel_url
                      };
                      console.log('DELIVERY: Using dynamic panel info from plan:', panelInfo);
                    }
                  }
                } catch (planError) {
                  console.warn('DELIVERY: Could not fetch plan info:', planError);
                }
              }
              
              data = {
                username: subscription.username,
                subscription_url: subscription.subscription_url,
                expire: subscription.expire_at ? new Date(subscription.expire_at).getTime() : Date.now() + (subscription.duration_days * 24 * 60 * 60 * 1000),
                data_limit: subscription.data_limit_gb * 1073741824,
                status: subscription.status || 'active',
                used_traffic: 0,
                ...panelInfo
              };
              console.log('DELIVERY: Using subscription data with dynamic panel info:', data);
            } else {
              throw new Error('Subscription not found in database');
            }
          } catch (fetchError) {
            console.error('DELIVERY: Failed to fetch subscription from database:', fetchError);
            throw new Error(`Could not load subscription: ${fetchError.message}`);
          }
        }

        if (!data || !data.username) {
          throw new Error('No subscription data found');
        }

        console.log('DELIVERY: Using subscription data with DYNAMIC panel configuration:', { 
          username: data.username, 
          panelType: data.panel_type,
          panelUrl: data.panel_url,
          panelName: data.panel_name
        });

        // Try to fetch fresh data from the panel using dynamic configuration
        try {
          console.log('DELIVERY: Refreshing data using DYNAMIC panel configuration');
          
          // Use the panel type from the subscription data or fallback to marzban
          const panelType = data.panel_type || 'marzban';
          
          const { data: panelResult, error: panelError } = await supabase.functions.invoke('get-subscription-from-panel', {
            body: {
              username: data.username,
              panelType: panelType,
              panelUrl: data.panel_url, // Pass dynamic panel URL
              panelId: data.panel_id // Pass panel ID for credentials
            }
          });

          if (panelResult?.success && panelResult.data) {
            console.log('DELIVERY: DYNAMIC panel data received:', panelResult.data);
            
            // Merge panel data with existing data, preferring panel data for critical fields
            const mergedData = {
              ...data,
              subscription_url: panelResult.data.subscription_url || data.subscription_url,
              expire: panelResult.data.expire ? panelResult.data.expire : data.expire,
              data_limit: panelResult.data.data_limit || data.data_limit,
              status: panelResult.data.status || data.status,
              used_traffic: panelResult.data.used_traffic || data.used_traffic || 0
            };
            
            setSubscriptionData(mergedData);
            setPanelStatus('online');
            
            // Store updated data in localStorage
            localStorage.setItem('deliverySubscriptionData', JSON.stringify(mergedData));
            
            if (mergedData.subscription_url) {
              await generateQRCode(mergedData.subscription_url);
            }
          } else {
            console.warn('DELIVERY: Panel data fetch failed, using fallback data:', panelError);
            setSubscriptionData(data);
            setPanelStatus('offline');
            
            if (data.subscription_url) {
              await generateQRCode(data.subscription_url);
            }
          }
        } catch (panelError) {
          console.error('DELIVERY: Failed to fetch from panel, using fallback data:', panelError);
          setSubscriptionData(data);
          setPanelStatus('offline');
          
          if (data.subscription_url) {
            await generateQRCode(data.subscription_url);
          }
        }

      } catch (error: any) {
        console.error('DELIVERY: Error loading subscription data:', error);
        setError(error.message || (language === 'fa' ? 'خطا در بارگذاری اطلاعات' : 'Error loading subscription data'));
        setPanelStatus('offline');
      } finally {
        setIsLoading(false);
      }
    };

    loadSubscriptionData();
  }, [location.state, searchParams, language]);

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
      console.log('DELIVERY: Refreshing subscription data using DYNAMIC panel configuration...');
      
      const panelType = subscriptionData.panel_type || 'marzban';
      
      const { data: panelResult, error: panelError } = await supabase.functions.invoke('get-subscription-from-panel', {
        body: {
          username: subscriptionData.username,
          panelType: panelType,
          panelUrl: subscriptionData.panel_url,
          panelId: subscriptionData.panel_id
        }
      });

      if (panelResult?.success && panelResult.data) {
        console.log('DELIVERY: DYNAMIC refresh data received from panel');
        
        const updatedData = {
          ...subscriptionData,
          subscription_url: panelResult.data.subscription_url || subscriptionData.subscription_url,
          expire: panelResult.data.expire ? panelResult.data.expire : subscriptionData.expire,
          data_limit: panelResult.data.data_limit || subscriptionData.data_limit,
          status: panelResult.data.status || subscriptionData.status,
          used_traffic: panelResult.data.used_traffic || subscriptionData.used_traffic || 0
        };
        
        setSubscriptionData(updatedData);
        setPanelStatus('online');
        localStorage.setItem('deliverySubscriptionData', JSON.stringify(updatedData));
        
        if (updatedData.subscription_url) {
          await generateQRCode(updatedData.subscription_url);
        }
        
        toast({
          title: language === 'fa' ? 'بروزرسانی شد' : 'Refreshed',
          description: language === 'fa' ? 
            'اطلاعات اشتراک بروزرسانی شد' : 
            'Subscription data updated',
        });
      } else {
        console.error('DELIVERY: Refresh failed:', panelError);
        setPanelStatus('offline');
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: language === 'fa' ? 'خطا در بروزرسانی' : 'Failed to refresh',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('DELIVERY: Error refreshing subscription:', error);
      setPanelStatus('offline');
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

  const getPanelStatusBadge = () => {
    const statusConfig = {
      checking: { color: 'bg-gray-500', text: language === 'fa' ? 'در حال بررسی' : 'Checking' },
      online: { color: 'bg-green-500', text: language === 'fa' ? 'آنلاین' : 'Online' },
      offline: { color: 'bg-red-500', text: language === 'fa' ? 'آفلاین' : 'Offline' }
    };
    
    const config = statusConfig[panelStatus];
    return <Badge className={`${config.color} text-white text-xs`}>{config.text}</Badge>;
  };

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
                    {getPanelStatusBadge()}
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
                    {subscriptionData.used_traffic !== undefined && (
                      <div className="col-span-2">
                        <Label className="text-sm text-muted-foreground">
                          {language === 'fa' ? 'ترافیک مصرف شده' : 'Used Traffic'}
                        </Label>
                        <p className="font-bold">
                          {(subscriptionData.used_traffic / 1073741824).toFixed(2)} GB
                        </p>
                      </div>
                    )}
                    {subscriptionData.panel_name && (
                      <div className="col-span-2">
                        <Label className="text-sm text-muted-foreground">
                          {language === 'fa' ? 'پنل' : 'Panel'}
                        </Label>
                        <p className="font-bold">{subscriptionData.panel_name}</p>
                      </div>
                    )}
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
