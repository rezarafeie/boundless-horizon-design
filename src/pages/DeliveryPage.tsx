
import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { CheckCircle, Copy, Download, Smartphone, Monitor, Apple, ArrowRight, Home, ShoppingCart, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRCodeCanvas from 'qrcode';
import Navigation from '@/components/Navigation';
import FooterSection from '@/components/FooterSection';

interface SubscriptionData {
  username: string;
  subscription_url: string;
  expire: number;
  data_limit: number;
  planName?: string;
}

const DeliveryPage = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const location = useLocation();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);

  useEffect(() => {
    // Get subscription data from location state or localStorage
    const data = location.state?.subscriptionData || 
                 JSON.parse(localStorage.getItem('deliverySubscriptionData') || 'null');
    
    if (data) {
      setSubscriptionData(data);
      generateQRCode(data.subscription_url);
    }
  }, [location.state]);

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

  const downloadApps = [
    {
      name: 'Streisand',
      platform: language === 'fa' ? 'همه پلتفرم‌ها' : 'Universal',
      icon: Monitor,
      downloadUrl: 'https://github.com/StreisandEffect/streisand'
    },
    {
      name: 'V2rayNG',
      platform: 'Android',
      icon: Smartphone,
      downloadUrl: 'https://github.com/2dust/v2rayNG'
    },
    {
      name: 'Hiddify (Windows)',
      platform: 'Windows',
      icon: Monitor,
      downloadUrl: 'https://github.com/hiddify/hiddify-next'
    },
    {
      name: 'Hiddify (Android)',
      platform: 'Android',
      icon: Smartphone,
      downloadUrl: 'https://github.com/hiddify/hiddify-next'
    },
    {
      name: 'Hiddify (Apple)',
      platform: 'iOS/macOS',
      icon: Apple,
      downloadUrl: 'https://github.com/hiddify/hiddify-next'
    },
    {
      name: 'Sing-Box (Android)',
      platform: 'Android',
      icon: Smartphone,
      downloadUrl: 'https://github.com/SagerNet/sing-box'
    },
    {
      name: 'Sing-Box (Apple)',
      platform: 'iOS/macOS',
      icon: Apple,
      downloadUrl: 'https://github.com/SagerNet/sing-box'
    }
  ];

  const tutorialSteps = [
    {
      number: 1,
      title: language === 'fa' ? 'برنامه مورد نظر را دانلود و نصب کنید' : 'Download and install the app',
      icon: Download
    },
    {
      number: 2,
      title: language === 'fa' ? 'اشتراک را به برنامه اضافه کنید' : 'Add subscription to the app',
      icon: Copy
    },
    {
      number: 3,
      title: language === 'fa' ? 'اتصال را فعال نمایید' : 'Activate the connection',
      icon: CheckCircle
    },
    {
      number: 4,
      title: language === 'fa' ? 'از اینترنت آزاد لذت ببرید!' : 'Enjoy free internet!',
      icon: ArrowRight
    }
  ];

  if (!subscriptionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
        <Navigation />
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-6 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                {language === 'fa' ? 'اطلاعات اشتراک یافت نشد' : 'Subscription data not found'}
              </p>
              <Button asChild className="mt-4">
                <Link to="/subscription">
                  {language === 'fa' ? 'بازگشت به صفحه اشتراک' : 'Back to Subscription'}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
      <Navigation />
      
      <div className="pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-6 space-y-8">
          
          {/* Success Header */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-4 animate-scale-in">
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-green-800 dark:text-green-200">
              {language === 'fa' ? '🎉 اشتراک VPN آماده است!' : '🎉 VPN Subscription Ready!'}
            </h1>
            <p className="text-green-600 dark:text-green-400 text-lg">
              {language === 'fa' ? 
                'پرداخت موفق و پیکربندی شما ایجاد شد' : 
                'Payment successful and your configuration is ready'
              }
            </p>
          </div>

          {/* Subscription Summary */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="text-xl text-green-800 dark:text-green-200">
                {language === 'fa' ? 'خلاصه اشتراک' : 'Subscription Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Subscription Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <Label className="text-gray-600 dark:text-gray-400">{language === 'fa' ? 'نام کاربری' : 'Username'}</Label>
                  <p className="font-mono text-lg font-bold">{subscriptionData.username}</p>
                </div>
                <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <Label className="text-gray-600 dark:text-gray-400">{language === 'fa' ? 'تاریخ انقضا' : 'Expiry Date'}</Label>
                  <p className="font-bold">{new Date(subscriptionData.expire * 1000).toLocaleDateString()}</p>
                </div>
                <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <Label className="text-gray-600 dark:text-gray-400">{language === 'fa' ? 'حجم' : 'Volume'}</Label>
                  <p className="font-bold">{Math.round(subscriptionData.data_limit / 1073741824)} GB</p>
                </div>
              </div>

              {/* QR Code and Subscription Link */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* QR Code */}
                {qrCodeDataUrl && (
                  <div className="text-center space-y-4">
                    <Label className="text-lg font-semibold">
                      {language === 'fa' ? 'کد QR اشتراک' : 'Subscription QR Code'}
                    </Label>
                    <div className="flex justify-center">
                      <div className="p-4 bg-white rounded-lg shadow-lg">
                        <img src={qrCodeDataUrl} alt="Subscription QR Code" className="w-48 h-48" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Subscription URL */}
                <div className="space-y-4">
                  <Label className="text-lg font-semibold">
                    {language === 'fa' ? 'لینک اشتراک' : 'Subscription Link'}
                  </Label>
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {language === 'fa' ? 'لینک پیکربندی' : 'Configuration Link'}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(subscriptionData.subscription_url)}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        {language === 'fa' ? 'کپی' : 'Copy'}
                      </Button>
                    </div>
                    <code className="text-xs break-all text-gray-800 dark:text-gray-200 block p-2 bg-white dark:bg-gray-900 rounded">
                      {subscriptionData.subscription_url}
                    </code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* App Downloads Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                {language === 'fa' ? 'نرم‌افزارها' : 'Applications'}
              </CardTitle>
              <p className="text-gray-600 dark:text-gray-400">
                {language === 'fa' ? 
                  'با توجه به سیستم‌عامل خود، برنامه مناسب را دانلود کنید:' : 
                  'Download the appropriate app based on your operating system:'}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {downloadApps.map((app, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3 space-x-reverse mb-3">
                        <app.icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        <div>
                          <h3 className="font-semibold">{app.name}</h3>
                          <p className="text-sm text-gray-500">{app.platform}</p>
                        </div>
                      </div>
                      <Button 
                        asChild 
                        className="w-full" 
                        variant="outline"
                      >
                        <a href={app.downloadUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4 mr-2" />
                          {language === 'fa' ? 'دانلود' : 'Download'}
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tutorial Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                {language === 'fa' ? 'آموزش‌ها و راهنما' : 'Tutorials & Guides'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {tutorialSteps.map((step, index) => (
                  <Card key={index} className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-3">
                      <step.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                      {step.number}
                    </div>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {step.title}
                    </p>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Final CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild variant="default" size="lg">
              <Link to="/subscription">
                <ShoppingCart className="w-5 h-5 mr-2" />
                {language === 'fa' ? 'خرید پلن جدید' : 'Buy Another Plan'}
              </Link>
            </Button>
            
            <Button asChild variant="outline" size="lg">
              <Link to="/">
                <Home className="w-5 h-5 mr-2" />
                {language === 'fa' ? 'صفحه اصلی' : 'Homepage'}
              </Link>
            </Button>

            <Button 
              asChild 
              variant="outline" 
              size="lg"
            >
              <a href="https://t.me/getbnbot" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-5 h-5 mr-2" />
                {language === 'fa' ? 'پشتیبانی' : 'Support'}
              </a>
            </Button>
          </div>
        </div>
      </div>

      <FooterSection />
    </div>
  );
};

export default DeliveryPage;
