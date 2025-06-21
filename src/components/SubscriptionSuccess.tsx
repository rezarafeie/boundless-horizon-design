
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, Copy, Download, AlertCircle, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionResponse {
  username: string;
  subscription_url: string;
  expire: number;
  data_limit: number;
}

interface SubscriptionSuccessProps {
  result: SubscriptionResponse;
  subscriptionId?: string;
}

const SubscriptionSuccess = ({ result, subscriptionId }: SubscriptionSuccessProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('SUBSCRIPTION_SUCCESS: Component mounted with subscriptionId:', subscriptionId);
    
    if (subscriptionId) {
      // Immediate redirect to delivery page
      console.log('SUBSCRIPTION_SUCCESS: Redirecting to delivery page immediately');
      navigate(`/subscription-delivery?id=${subscriptionId}`, { replace: true });
    }
  }, [subscriptionId, navigate]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: language === 'fa' ? 'کپی شد' : 'Copied',
      description: language === 'fa' ? 
        'لینک اشتراک کپی شد' : 
        'Subscription link copied to clipboard',
    });
  };

  const goToDeliveryPage = () => {
    if (subscriptionId) {
      navigate(`/subscription-delivery?id=${subscriptionId}`, { replace: true });
    }
  };

  // If we have a subscriptionId, we should redirect immediately
  if (subscriptionId) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-4 animate-scale-in">
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl text-green-800 dark:text-green-200">
              {language === 'fa' ? '✅ پرداخت تأیید شد! اشتراک شما فعال است' : '✅ Payment Confirmed! Your subscription is active'}
            </CardTitle>
            <CardDescription className="text-green-600 dark:text-green-400 text-lg">
              {language === 'fa' ? 
                'در حال انتقال به صفحه جزئیات...' : 
                'Redirecting to details page...'
              }
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

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
          </div>

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
