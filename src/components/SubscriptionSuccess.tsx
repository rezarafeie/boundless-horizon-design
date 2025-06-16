
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { CheckCircle, Copy, Download, AlertCircle, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRCodeCanvas from 'qrcode';

interface SubscriptionResponse {
  username: string;
  subscription_url: string;
  expire: number;
  data_limit: number;
}

interface SubscriptionSuccessProps {
  result: SubscriptionResponse;
}

const SubscriptionSuccess = ({ result }: SubscriptionSuccessProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const MARZBAN_INBOUND_TAGS = ['VLESSTCP', 'Israel', 'fanland', 'USAC', 'info_protocol', 'Dubai'];

  useEffect(() => {
    if (result?.subscription_url) {
      generateQRCode(result.subscription_url);
      // Store data for delivery page
      localStorage.setItem('deliverySubscriptionData', JSON.stringify(result));
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
    a.download = `${result.username}-subscription.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const goToDeliveryPage = () => {
    navigate('/delivery', { state: { subscriptionData: result } });
  };

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
          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={goToDeliveryPage} variant="default" size="lg" className="flex-1 sm:flex-none">
              <ArrowRight className="w-5 h-5 mr-2" />
              {language === 'fa' ? 'مشاهده جزئیات کامل' : 'View Full Details'}
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={() => copyToClipboard(result.subscription_url)}
              className="flex-1 sm:flex-none"
            >
              <Copy className="w-5 h-5 mr-2" />
              {language === 'fa' ? 'کپی لینک' : 'Copy Link'}
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={downloadConfig}
              className="flex-1 sm:flex-none"
            >
              <Download className="w-5 h-5 mr-2" />
              {language === 'fa' ? 'دانلود' : 'Download'}
            </Button>
          </div>

          {/* Quick Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <Label className="text-gray-600 dark:text-gray-400">{language === 'fa' ? 'نام کاربری' : 'Username'}</Label>
              <p className="font-mono text-lg font-bold">{result.username}</p>
            </div>
            <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <Label className="text-gray-600 dark:text-gray-400">{language === 'fa' ? 'تاریخ انقضا' : 'Expiry Date'}</Label>
              <p className="font-bold">{new Date(result.expire * 1000).toLocaleDateString()}</p>
            </div>
            <div className="text-center p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <Label className="text-gray-600 dark:text-gray-400">{language === 'fa' ? 'حجم' : 'Volume'}</Label>
              <p className="font-bold">{Math.round(result.data_limit / 1073741824)} GB</p>
            </div>
          </div>

          {/* QR Code Section */}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'fa' ? 
                  'این کد را با اپ V2Ray اسکن کنید' : 
                  'Scan this QR code with your V2Ray app'
                }
              </p>
            </div>
          )}

          {/* Important Notes */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-semibold mb-1">
                  {language === 'fa' ? 'نکات مهم' : 'Important Notes'}
                </p>
                <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                  <li>
                    {language === 'fa' ? 
                      '• برای راهنمای کامل و دانلود اپ‌ها روی "مشاهده جزئیات کامل" کلیک کنید' : 
                      '• Click "View Full Details" for complete guide and app downloads'
                    }
                  </li>
                  <li>
                    {language === 'fa' ? 
                      '• این لینک را در مکان امن نگهداری کنید' : 
                      '• Keep this link in a secure place'
                    }
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSuccess;
