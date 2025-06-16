
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, Copy, Download, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRCodeCanvas from 'qrcode';

interface TrialPlan {
  id: 'lite' | 'pro';
  name: string;
  nameEn: string;
  nameFa: string;
  description: string;
  descriptionEn: string;
  descriptionFa: string;
  apiType: 'marzban' | 'marzneshin';
  icon: React.ComponentType<any>;
}

interface TrialResult {
  username: string;
  subscription_url: string;
  expire: number;
  data_limit: number;
  plan: TrialPlan;
}

interface FreeTrialResultProps {
  result: TrialResult;
  onClose: () => void;
}

const FreeTrialResult = ({ result, onClose }: FreeTrialResultProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    if (result?.subscription_url) {
      generateQRCode(result.subscription_url);
    }
  }, [result]);

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
    if (!result) return;
    
    const blob = new Blob([result.subscription_url], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.username}-trial-config.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
        <CardHeader className="text-center relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
          
          <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-4 animate-scale-in">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400 animate-pulse" />
          </div>
          <CardTitle className="text-2xl text-green-800 dark:text-green-200">
            {language === 'fa' ? '🎉 آزمایش رایگان آماده است!' : '🎉 Free Trial Ready!'}
          </CardTitle>
          <CardDescription className="text-green-600 dark:text-green-400 text-lg">
            {language === 'fa' ? 
              `پیکربندی ${result.plan.nameFa} شما ایجاد شد` : 
              `Your ${result.plan.nameEn} configuration is ready`
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Trial Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <div className="text-gray-600 dark:text-gray-400 text-xs">
                {language === 'fa' ? 'نام کاربری' : 'Username'}
              </div>
              <p className="font-mono text-sm font-bold">{result.username}</p>
            </div>
            <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <div className="text-gray-600 dark:text-gray-400 text-xs">
                {language === 'fa' ? 'تاریخ انقضا' : 'Expiry Date'}
              </div>
              <p className="font-bold text-sm">{new Date(result.expire * 1000).toLocaleDateString()}</p>
            </div>
            <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <div className="text-gray-600 dark:text-gray-400 text-xs">
                {language === 'fa' ? 'حجم' : 'Volume'}
              </div>
              <p className="font-bold text-sm">
                {Math.round(result.data_limit / 1073741824)} GB
              </p>
            </div>
          </div>

          {/* Plan Badge */}
          <div className="text-center">
            <Badge variant="outline" className="text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
              {language === 'fa' ? result.plan.nameFa : result.plan.nameEn}
            </Badge>
          </div>

          {/* QR Code Section */}
          {qrCodeDataUrl && (
            <div className="text-center space-y-4">
              <div className="text-lg font-semibold">
                {language === 'fa' ? 'کد QR اشتراک' : 'Subscription QR Code'}
              </div>
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg shadow-lg">
                  <img src={qrCodeDataUrl} alt="Trial QR Code" className="w-48 h-48" />
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'fa' ? 
                  'این کد را با اپ V2Ray اسکن کنید' : 
                  'Scan this QR code with your V2Ray app'
                }
              </p>
            </div>
          )}

          {/* Subscription URL */}
          <div className="space-y-4">
            <div className="text-lg font-semibold">
              {language === 'fa' ? 'لینک اشتراک' : 'Subscription Link'}
            </div>
            
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'fa' ? 'لینک پیکربندی' : 'Configuration Link'}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(result.subscription_url)}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    {language === 'fa' ? 'کپی' : 'Copy'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={downloadConfig}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    {language === 'fa' ? 'دانلود' : 'Download'}
                  </Button>
                </div>
              </div>
              <code className="text-xs break-all text-gray-800 dark:text-gray-200 block p-2 bg-white dark:bg-gray-900 rounded">
                {result.subscription_url}
              </code>
            </div>
          </div>

          {/* Trial Limitations */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-semibold mb-1">
                  {language === 'fa' ? 'نکات آزمایش رایگان' : 'Free Trial Notes'}
                </p>
                <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                  <li>
                    {language === 'fa' ? 
                      '• این آزمایش فقط ۱ روز و ۱ گیگابایت معتبر است' : 
                      '• This trial is valid for 1 day and 1 GB only'
                    }
                  </li>
                  <li>
                    {language === 'fa' ? 
                      '• هر کاربر فقط یک بار در روز می‌تواند آزمایش دریافت کند' : 
                      '• Each user can claim only one trial per day'
                    }
                  </li>
                  <li>
                    {language === 'fa' ? 
                      '• برای اشتراک کامل، از فرم خرید استفاده کنید' : 
                      '• For full subscription, use the purchase form below'
                    }
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              onClick={() => window.open('https://t.me/getbnbot', '_blank')}
              variant="outline"
              className="flex-1"
            >
              {language === 'fa' ? 'دریافت پشتیبانی' : 'Get Support'}
            </Button>
            <Button 
              onClick={onClose}
              className="flex-1"
            >
              {language === 'fa' ? 'خرید اشتراک کامل' : 'Purchase Full Subscription'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FreeTrialResult;
