
import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { CheckCircle, Copy, Download, Smartphone, Monitor, Apple, ArrowRight, Home, ShoppingCart, MessageCircle, Sparkles } from 'lucide-react';
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
      downloadUrl: 'https://github.com/StreisandEffect/streisand',
      color: 'from-purple-500 to-indigo-600'
    },
    {
      name: 'V2rayNG',
      platform: 'Android',
      icon: Smartphone,
      downloadUrl: 'https://github.com/2dust/v2rayNG',
      color: 'from-green-500 to-emerald-600'
    },
    {
      name: 'Hiddify (Windows)',
      platform: 'Windows',
      icon: Monitor,
      downloadUrl: 'https://github.com/hiddify/hiddify-next',
      color: 'from-blue-500 to-cyan-600'
    },
    {
      name: 'Hiddify (Android)',
      platform: 'Android',
      icon: Smartphone,
      downloadUrl: 'https://github.com/hiddify/hiddify-next',
      color: 'from-orange-500 to-red-600'
    },
    {
      name: 'Hiddify (Apple)',
      platform: 'iOS/macOS',
      icon: Apple,
      downloadUrl: 'https://github.com/hiddify/hiddify-next',
      color: 'from-gray-700 to-gray-900'
    },
    {
      name: 'Sing-Box (Android)',
      platform: 'Android',
      icon: Smartphone,
      downloadUrl: 'https://github.com/SagerNet/sing-box',
      color: 'from-teal-500 to-cyan-600'
    },
    {
      name: 'Sing-Box (Apple)',
      platform: 'iOS/macOS',
      icon: Apple,
      downloadUrl: 'https://github.com/SagerNet/sing-box',
      color: 'from-slate-600 to-gray-800'
    }
  ];

  const tutorialSteps = [
    {
      number: 1,
      title: language === 'fa' ? 'برنامه مورد نظر را دانلود و نصب کنید' : 'Download and install the app',
      icon: Download,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      number: 2,
      title: language === 'fa' ? 'اشتراک را به برنامه اضافه کنید' : 'Add subscription to the app',
      icon: Copy,
      color: 'from-green-500 to-emerald-500'
    },
    {
      number: 3,
      title: language === 'fa' ? 'اتصال را فعال نمایید' : 'Activate the connection',
      icon: CheckCircle,
      color: 'from-purple-500 to-indigo-500'
    },
    {
      number: 4,
      title: language === 'fa' ? 'از اینترنت آزاد لذت ببرید!' : 'Enjoy free internet!',
      icon: Sparkles,
      color: 'from-pink-500 to-rose-500'
    }
  ];

  if (!subscriptionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900">
        <Navigation />
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <Card className="max-w-md w-full mx-4 shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                {language === 'fa' ? 'اطلاعات اشتراک یافت نشد' : 'Subscription data not found'}
              </p>
              <Button asChild className="mt-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900">
      <Navigation />
      
      <div className="pt-20 pb-12">
        <div className="max-w-6xl mx-auto px-6 space-y-8">
          
          {/* Success Header */}
          <div className="text-center space-y-6 animate-fade-in">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-6 animate-scale-in shadow-2xl">
              <CheckCircle className="w-14 h-14 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
              {language === 'fa' ? '🎉 اشتراک VPN آماده است!' : '🎉 VPN Subscription Ready!'}
            </h1>
            <p className="text-xl text-green-600 dark:text-green-400 max-w-2xl mx-auto">
              {language === 'fa' ? 
                'پرداخت موفق و پیکربندی شما ایجاد شد. اکنون می‌توانید از اینترنت آزاد لذت ببرید!' : 
                'Payment successful and your configuration is ready. Now you can enjoy free internet!'
              }
            </p>
          </div>

          {/* Subscription Summary */}
          <Card className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/30 dark:via-emerald-900/30 dark:to-teal-900/30 border-0 shadow-2xl backdrop-blur-sm animate-slide-up">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-green-800 dark:text-green-200 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                {language === 'fa' ? 'خلاصه اشتراک' : 'Subscription Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Subscription Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-gradient-to-br from-white/60 to-white/40 dark:from-gray-800/60 dark:to-gray-800/40 rounded-xl backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                  <Label className="text-gray-600 dark:text-gray-400 text-sm">{language === 'fa' ? 'نام کاربری' : 'Username'}</Label>
                  <p className="font-mono text-xl font-bold text-gray-800 dark:text-gray-200 mt-2">{subscriptionData.username}</p>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-white/60 to-white/40 dark:from-gray-800/60 dark:to-gray-800/40 rounded-xl backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                  <Label className="text-gray-600 dark:text-gray-400 text-sm">{language === 'fa' ? 'تاریخ انقضا' : 'Expiry Date'}</Label>
                  <p className="font-bold text-xl text-gray-800 dark:text-gray-200 mt-2">{new Date(subscriptionData.expire * 1000).toLocaleDateString()}</p>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-white/60 to-white/40 dark:from-gray-800/60 dark:to-gray-800/40 rounded-xl backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                  <Label className="text-gray-600 dark:text-gray-400 text-sm">{language === 'fa' ? 'حجم' : 'Volume'}</Label>
                  <p className="font-bold text-xl text-gray-800 dark:text-gray-200 mt-2">{Math.round(subscriptionData.data_limit / 1073741824)} GB</p>
                </div>
              </div>

              {/* QR Code and Subscription Link */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* QR Code */}
                {qrCodeDataUrl && (
                  <div className="text-center space-y-6">
                    <Label className="text-xl font-bold text-gray-800 dark:text-gray-200">
                      {language === 'fa' ? 'کد QR اشتراک' : 'Subscription QR Code'}
                    </Label>
                    <div className="flex justify-center">
                      <div className="p-6 bg-white rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300">
                        <img src={qrCodeDataUrl} alt="Subscription QR Code" className="w-56 h-56 rounded-lg" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs mx-auto">
                      {language === 'fa' ? 
                        'این کد را با اپ V2Ray اسکن کنید' : 
                        'Scan this QR code with your V2Ray app'
                      }
                    </p>
                  </div>
                )}

                {/* Subscription URL */}
                <div className="space-y-6">
                  <Label className="text-xl font-bold text-gray-800 dark:text-gray-200">
                    {language === 'fa' ? 'لینک اشتراک' : 'Subscription Link'}
                  </Label>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {language === 'fa' ? 'لینک پیکربندی' : 'Configuration Link'}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => copyToClipboard(subscriptionData.subscription_url)}
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg"
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        {language === 'fa' ? 'کپی' : 'Copy'}
                      </Button>
                    </div>
                    <code className="text-xs break-all text-gray-800 dark:text-gray-200 block p-4 bg-white dark:bg-gray-950 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                      {subscriptionData.subscription_url}
                    </code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* App Downloads Section */}
          <Card className="border-0 shadow-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Download className="w-5 h-5 text-white" />
                </div>
                {language === 'fa' ? 'نرم‌افزارها' : 'Applications'}
              </CardTitle>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {language === 'fa' ? 
                  'با توجه به سیستم‌عامل خود، برنامه مناسب را دانلود کنید:' : 
                  'Download the appropriate app based on your operating system:'}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {downloadApps.map((app, index) => (
                  <Card key={index} className={`hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br ${app.color} text-white overflow-hidden group`}>
                    <CardContent className="p-6 relative">
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300"></div>
                      <div className="relative z-10">
                        <div className="flex items-center space-x-3 space-x-reverse mb-4">
                          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                            <app.icon className="w-7 h-7 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-white">{app.name}</h3>
                            <p className="text-white/80 text-sm">{app.platform}</p>
                          </div>
                        </div>
                        <Button 
                          asChild 
                          className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm" 
                          variant="outline"
                        >
                          <a href={app.downloadUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4 mr-2" />
                            {language === 'fa' ? 'دانلود' : 'Download'}
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tutorial Steps */}
          <Card className="border-0 shadow-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                {language === 'fa' ? 'آموزش‌ها و راهنما' : 'Tutorials & Guides'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {tutorialSteps.map((step, index) => (
                  <Card key={index} className={`text-center p-6 bg-gradient-to-br ${step.color} text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1`}>
                    <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                      <step.icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-4xl font-bold text-white mb-3">
                      {step.number}
                    </div>
                    <p className="text-sm text-white/90 leading-relaxed">
                      {step.title}
                    </p>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Final CTA */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-8">
            <Button asChild variant="default" size="lg" className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-xl transform hover:scale-105 transition-all duration-200">
              <Link to="/subscription">
                <ShoppingCart className="w-5 h-5 mr-2" />
                {language === 'fa' ? 'خرید پلن جدید' : 'Buy Another Plan'}
              </Link>
            </Button>
            
            <Button asChild variant="outline" size="lg" className="shadow-lg hover:shadow-xl border-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200">
              <Link to="/">
                <Home className="w-5 h-5 mr-2" />
                {language === 'fa' ? 'صفحه اصلی' : 'Homepage'}
              </Link>
            </Button>

            <Button 
              asChild 
              variant="outline" 
              size="lg"
              className="shadow-lg hover:shadow-xl border-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
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
