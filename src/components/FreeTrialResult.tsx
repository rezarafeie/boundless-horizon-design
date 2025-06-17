
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

  useEffect(() => {
    // Generate QR code for the subscription URL
    if (result.subscription_url) {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(result.subscription_url)}`;
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
    const element = document.createElement('a');
    element.href = result.subscription_url;
    element.download = `${result.username}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-800 dark:text-green-200">
            {language === 'fa' ? '🎉 اشتراک رایگان شما آماده است!' : '🎉 Your Free Trial is Ready!'}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Subscription Details */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <User className="w-5 h-5" />
              {language === 'fa' ? 'جزئیات اشتراک' : 'Subscription Details'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  {language === 'fa' ? 'نام کاربری:' : 'Username:'}
                </span>
                <p className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mt-1">
                  {result.username}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  {language === 'fa' ? 'پلن:' : 'Plan:'}
                </span>
                <p className="mt-1">{result.planName}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  {language === 'fa' ? 'حجم:' : 'Data:'}
                </span>
                <p className="mt-1">{result.dataLimit} GB</p>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  {language === 'fa' ? 'مدت:' : 'Duration:'}
                </span>
                <p className="mt-1">{result.duration} {language === 'fa' ? 'روز' : 'days'}</p>
              </div>
            </div>
          </div>

          {/* Subscription URL */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
            <h3 className="font-semibold text-lg mb-3">
              {language === 'fa' ? 'لینک اشتراک VPN' : 'VPN Subscription Link'}
            </h3>
            
            {/* QR Code */}
            {qrCodeUrl && (
              <div className="flex justify-center mb-4">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  className="border border-gray-200 dark:border-gray-600 rounded-lg"
                />
              </div>
            )}

            {/* Subscription URL */}
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-4">
              <code className="text-sm break-all text-gray-800 dark:text-gray-200">
                {result.subscription_url}
              </code>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => copyToClipboard(result.subscription_url)}
                className="flex-1 flex items-center gap-2"
                variant="outline"
              >
                <Copy className="w-4 h-4" />
                {language === 'fa' ? 'کپی لینک' : 'Copy Link'}
              </Button>
              
              <Button
                onClick={downloadConfig}
                className="flex-1 flex items-center gap-2"
                variant="outline"
              >
                <Download className="w-4 h-4" />
                {language === 'fa' ? 'دانلود کانفیگ' : 'Download Config'}
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              {language === 'fa' ? 'نحوه استفاده:' : 'How to Use:'}
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700 dark:text-blue-300">
              <li>
                {language === 'fa' 
                  ? 'اپلیکیشن V2Ray یا کلاینت VPN مورد نظر خود را نصب کنید' 
                  : 'Install V2Ray app or your preferred VPN client'
                }
              </li>
              <li>
                {language === 'fa' 
                  ? 'QR کد را اسکن کنید یا لینک بالا را کپی کرده و در اپلیکیشن وارد کنید' 
                  : 'Scan the QR code or copy the link above and import it into your app'
                }
              </li>
              <li>
                {language === 'fa' 
                  ? 'اتصال را برقرار کنید و از اینترنت آزاد استفاده کنید!' 
                  : 'Connect and enjoy free internet!'
                }
              </li>
            </ol>
          </div>

          {/* Support */}
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            {language === 'fa' 
              ? 'در صورت بروز مشکل، با پشتیبانی تماس بگیرید' 
              : 'If you encounter any issues, please contact support'
            }
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FreeTrialResult;
