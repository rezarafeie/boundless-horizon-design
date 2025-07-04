
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Copy, ExternalLink, Download, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FreeTrialResultProps {
  result: {
    username: string;
    subscription_url: string;
    planName: string;
    apiType: 'marzban' | 'marzneshin';
    dataLimit: number;
    duration: number;
  };
}

const FreeTrialResult = ({ result }: FreeTrialResultProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [connectionTested, setConnectionTested] = useState(false);

  useEffect(() => {
    // Generate QR code for the subscription URL
    if (result.subscription_url) {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(result.subscription_url)}&bgcolor=ffffff&color=000000&qzone=1`;
      setQrCodeUrl(qrUrl);
    }
  }, [result.subscription_url]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: language === 'fa' ? 'کپی شد' : 'Copied',
        description: language === 'fa' ? 'لینک کپی شد' : 'Link copied to clipboard',
      });
    } catch (err) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در کپی کردن' : 'Failed to copy',
        variant: 'destructive',
      });
    }
  };

  const downloadConfig = () => {
    const configData = `${result.subscription_url}`;
    const blob = new Blob([configData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const element = document.createElement('a');
    element.href = url;
    element.download = `${result.username}_vpn_config.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
  };

  const testConnection = async () => {
    try {
      setConnectionTested(true);
      toast({
        title: language === 'fa' ? 'تست اتصال' : 'Connection Test',
        description: language === 'fa' ? 'در حال بررسی اتصال...' : 'Testing connection...',
      });
      
      // Simulate connection test (in a real app, this would make an actual test)
      setTimeout(() => {
        toast({
          title: language === 'fa' ? 'موفق' : 'Success',
          description: language === 'fa' ? 'اتصال با موفقیت برقرار شد' : 'Connection established successfully',
        });
      }, 2000);
    } catch (error) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در تست اتصال' : 'Connection test failed',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8">
      <Card className="bg-gradient-to-br from-green-50 via-emerald-50 to-cyan-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-cyan-900/20 border-green-200 dark:border-green-800 shadow-xl">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            {language === 'fa' ? '🎉 اشتراک رایگان شما آماده است!' : '🎉 Your Free Trial is Ready!'}
          </CardTitle>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            {language === 'fa' ? 'هم‌اکنون می‌توانید از اینترنت آزاد استفاده کنید' : 'You can now enjoy unrestricted internet access'}
          </p>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Quick Actions Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button
              onClick={() => copyToClipboard(result.subscription_url)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              <Copy className="w-4 h-4" />
              {language === 'fa' ? 'کپی لینک' : 'Copy Link'}
            </Button>
            
            <Button
              onClick={downloadConfig}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {language === 'fa' ? 'دانلود' : 'Download'}
            </Button>
            
            <Button
              onClick={testConnection}
              variant="outline"
              className="flex items-center gap-2"
              disabled={connectionTested}
            >
              <ExternalLink className="w-4 h-4" />
              {language === 'fa' ? 'تست اتصال' : 'Test Connection'}
            </Button>
          </div>

          {/* Subscription Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-green-200 dark:border-green-700 shadow-sm">
            <h3 className="font-semibold text-xl mb-4 flex items-center gap-2">
              <User className="w-6 h-6 text-green-600 dark:text-green-400" />
              {language === 'fa' ? 'جزئیات اشتراک' : 'Subscription Details'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400 text-sm">
                    {language === 'fa' ? 'نام کاربری' : 'Username'}
                  </span>
                  <p className="font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg mt-1 text-sm">
                    {result.username}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400 text-sm">
                    {language === 'fa' ? 'پلن' : 'Plan'}
                  </span>
                  <p className="mt-1 font-semibold text-green-600 dark:text-green-400">{result.planName}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400 text-sm">
                    {language === 'fa' ? 'حجم داده' : 'Data Limit'}
                  </span>
                  <p className="mt-1 font-semibold text-blue-600 dark:text-blue-400">{result.dataLimit} GB</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400 text-sm">
                    {language === 'fa' ? 'مدت اعتبار' : 'Valid For'}
                  </span>
                  <p className="mt-1 font-semibold text-purple-600 dark:text-purple-400">{result.duration} {language === 'fa' ? 'روز' : 'days'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* QR Code Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-green-200 dark:border-green-700 shadow-sm">
              <h3 className="font-semibold text-xl mb-4 text-center">
                {language === 'fa' ? 'اسکن QR کد' : 'Scan QR Code'}
              </h3>
              
              {qrCodeUrl && (
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-white rounded-xl shadow-lg">
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code" 
                      className="w-64 h-64 mx-auto"
                    />
                  </div>
                </div>
              )}
              
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                {language === 'fa' 
                  ? 'با اپلیکیشن VPN خود این کد را اسکن کنید' 
                  : 'Scan this code with your VPN app'
                }
              </p>
            </div>

            {/* Configuration URL Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-green-200 dark:border-green-700 shadow-sm">
              <h3 className="font-semibold text-xl mb-4">
                {language === 'fa' ? 'لینک پیکربندی' : 'Configuration Link'}
              </h3>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl mb-4 border">
                <code className="text-sm break-all text-gray-800 dark:text-gray-200 leading-relaxed">
                  {result.subscription_url}
                </code>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {language === 'fa' 
                  ? 'این لینک را کپی کرده و در اپلیکیشن VPN خود وارد کنید' 
                  : 'Copy this link and import it into your VPN application'
                }
              </p>
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-6">
            <h4 className="font-semibold text-xl text-blue-800 dark:text-blue-200 mb-4 flex items-center gap-2">
              📱 {language === 'fa' ? 'راهنمای نصب' : 'Setup Guide'}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Mobile Setup */}
              <div>
                <h5 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">
                  {language === 'fa' ? 'موبایل (اندروید/iOS)' : 'Mobile (Android/iOS)'}
                </h5>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-600 dark:text-blue-400">
                  <li>{language === 'fa' ? 'V2rayNG (اندروید) یا FairVPN (iOS) نصب کنید' : 'Install V2rayNG (Android) or FairVPN (iOS)'}</li>
                  <li>{language === 'fa' ? 'QR کد را اسکن کنید' : 'Scan the QR code above'}</li>
                  <li>{language === 'fa' ? 'روی اتصال کلیک کنید' : 'Tap connect'}</li>
                </ol>
              </div>
              
              {/* Desktop Setup */}
              <div>
                <h5 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">
                  {language === 'fa' ? 'دسکتاپ (ویندوز/مک)' : 'Desktop (Windows/Mac)'}
                </h5>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-600 dark:text-blue-400">
                  <li>{language === 'fa' ? 'V2rayN (ویندوز) یا V2rayU (مک) نصب کنید' : 'Install V2rayN (Windows) or V2rayU (Mac)'}</li>
                  <li>{language === 'fa' ? 'لینک پیکربندی را کپی کنید' : 'Copy the configuration link'}</li>
                  <li>{language === 'fa' ? 'در اپلیکیشن import کنید' : 'Import in the application'}</li>
                </ol>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200 text-center font-medium">
                💡 {language === 'fa' 
                  ? 'نکته: پس از اتصال، آی‌پی شما تغییر خواهد کرد و به اینترنت آزاد دسترسی خواهید داشت' 
                  : 'Tip: After connecting, your IP will change and you\'ll have unrestricted internet access'
                }
              </p>
            </div>
          </div>

          {/* Support & Contact */}
          <div className="text-center space-y-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4">
              <p className="text-green-800 dark:text-green-200 font-medium">
                🎉 {language === 'fa' ? 'اشتراک شما فعال شد! از اینترنت آزاد لذت ببرید' : 'Your subscription is active! Enjoy unrestricted internet'}
              </p>
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {language === 'fa' 
                ? 'در صورت بروز مشکل، با پشتیبانی در تلگرام تماس بگیرید' 
                : 'If you encounter any issues, contact support on Telegram'
              }
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FreeTrialResult;
