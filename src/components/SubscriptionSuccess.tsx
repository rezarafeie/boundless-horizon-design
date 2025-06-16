
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Copy, Download, ExternalLink, Calendar, Database, User, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';

interface SubscriptionResponse {
  username: string;
  subscription_url: string;
  expire: number;
  data_limit: number;
}

interface SubscriptionSuccessProps {
  result: SubscriptionResponse;
}

const SubscriptionSuccess: React.FC<SubscriptionSuccessProps> = ({ result }) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  React.useEffect(() => {
    if (result?.subscription_url) {
      QRCode.toDataURL(result.subscription_url)
        .then(setQrCodeUrl)
        .catch(console.error);
    }
  }, [result?.subscription_url]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: language === 'fa' ? 'کپی شد!' : 'Copied!',
        description: `${label} ${language === 'fa' ? 'کپی شد' : 'copied to clipboard'}`,
      });
    });
  };

  const downloadConfig = () => {
    const element = document.createElement('a');
    const file = new Blob([result.subscription_url], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${result.username}_config.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString(
      language === 'fa' ? 'fa-IR' : 'en-US'
    );
  };

  const formatDataLimit = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} ${language === 'fa' ? 'گیگابایت' : 'GB'}`;
  };

  if (!result) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl text-green-800 dark:text-green-200">
            {language === 'fa' ? '🎉 اشتراک شما آماده است!' : '🎉 Your Subscription is Ready!'}
          </CardTitle>
          <CardDescription className="text-green-700 dark:text-green-300">
            {language === 'fa' 
              ? 'اشتراک شما با موفقیت ایجاد شد و آماده استفاده است' 
              : 'Your subscription has been successfully created and is ready to use'
            }
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Subscription Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            {language === 'fa' ? 'جزئیات اشتراک' : 'Subscription Details'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'fa' ? 'نام کاربری' : 'Username'}
                </p>
                <p className="font-semibold">{result.username}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'fa' ? 'تاریخ انقضا' : 'Expiry Date'}
                </p>
                <p className="font-semibold">{formatDate(result.expire)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Database className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'fa' ? 'حجم داده' : 'Data Limit'}
                </p>
                <p className="font-semibold">{formatDataLimit(result.data_limit)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-orange-600" />
            {language === 'fa' ? 'پیکربندی اتصال' : 'Connection Configuration'}
          </CardTitle>
          <CardDescription>
            {language === 'fa' 
              ? 'از یکی از روش‌های زیر برای اتصال استفاده کنید' 
              : 'Use one of the methods below to connect'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Subscription URL */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {language === 'fa' ? 'لینک اشتراک:' : 'Subscription URL:'}
            </Label>
            <div className="flex gap-2">
              <Input
                value={result.subscription_url}
                readOnly
                className="font-mono text-sm bg-gray-50 dark:bg-gray-800"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(result.subscription_url, 'Subscription URL')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* QR Code */}
          {qrCodeUrl && (
            <div className="text-center">
              <Label className="text-sm font-medium mb-2 block">
                {language === 'fa' ? 'کد QR:' : 'QR Code:'}
              </Label>
              <div className="inline-block p-4 bg-white rounded-lg shadow-sm">
                <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {language === 'fa' 
                  ? 'این کد را با اپلیکیشن VPN اسکن کنید' 
                  : 'Scan this code with your VPN app'
                }
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4">
            <Button
              variant="hero-primary"
              onClick={() => copyToClipboard(result.subscription_url, 'Config')}
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              {language === 'fa' ? 'کپی پیکربندی' : 'Copy Config'}
            </Button>
            
            <Button
              variant="outline"
              onClick={downloadConfig}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              {language === 'fa' ? 'دانلود فایل' : 'Download File'}
            </Button>
            
            <Button
              variant="hero-secondary"
              onClick={() => window.open('https://t.me/getbnbot', '_blank')}
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {language === 'fa' ? 'پشتیبانی' : 'Support'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-800 dark:text-blue-200">
            {language === 'fa' ? '📱 راهنمای نصب' : '📱 Setup Guide'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 dark:text-blue-200">
          <ol className="list-decimal list-inside space-y-2">
            <li>
              {language === 'fa' 
                ? 'اپلیکیشن V2Ray یا مشابه را نصب کنید' 
                : 'Install V2Ray or similar VPN app'
              }
            </li>
            <li>
              {language === 'fa' 
                ? 'لینک اشتراک را کپی کرده یا QR Code را اسکن کنید' 
                : 'Copy the subscription URL or scan the QR code'
              }
            </li>
            <li>
              {language === 'fa' 
                ? 'اتصال را تست کنید' 
                : 'Test the connection'
              }
            </li>
          </ol>
          <p className="mt-4 text-xs">
            {language === 'fa' 
              ? 'برای کمک بیشتر با پشتیبانی تماس بگیرید' 
              : 'Contact support for additional help'
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// Add missing imports
const Label = ({ children, className, ...props }: any) => (
  <label className={`block text-sm font-medium text-gray-700 dark:text-gray-300 ${className || ''}`} {...props}>
    {children}
  </label>
);

const Input = ({ className, ...props }: any) => (
  <input className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 ${className || ''}`} {...props} />
);

export default SubscriptionSuccess;
