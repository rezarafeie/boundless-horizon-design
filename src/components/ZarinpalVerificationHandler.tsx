
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ZarinpalVerificationHandler = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
    subscriptionData?: any;
  } | null>(null);

  const createVPNUser = async (subscriptionId: string, subscription: any) => {
    try {
      console.log('Creating VPN user via panel API', { subscriptionId, username: subscription.username });
      
      const { data, error } = await supabase.functions.invoke('marzneshin-create-user', {
        body: {
          username: subscription.username,
          dataLimitGB: subscription.data_limit_gb,
          durationDays: subscription.duration_days,
          notes: `Created via Zarinpal payment - Subscription ID: ${subscriptionId}`
        }
      });

      if (error || !data?.success) {
        console.error('VPN user creation failed:', error || data?.error);
        throw new Error(data?.error || 'Failed to create VPN user');
      }

      console.log('VPN user created successfully:', data.data);
      
      // Update subscription with real URL from panel
      if (data.data?.subscription_url) {
        await supabase
          .from('subscriptions')
          .update({ 
            subscription_url: data.data.subscription_url,
            marzban_user_created: true,
            status: 'active'
          })
          .eq('id', subscriptionId);
      }

      return data.data;
    } catch (error) {
      console.error('VPN user creation failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const authority = searchParams.get('Authority');
        const status = searchParams.get('Status');
        const subscriptionId = searchParams.get('subscriptionId');

        console.log('Zarinpal callback params:', { authority, status, subscriptionId });

        if (!authority || !subscriptionId) {
          throw new Error('Missing payment parameters');
        }

        if (status !== 'OK') {
          throw new Error('Payment was cancelled or failed');
        }

        // Get subscription details first
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('id', subscriptionId)
          .single();

        if (subError || !subscription) {
          throw new Error('Subscription not found');
        }

        // Verify payment with Zarinpal
        console.log('Verifying payment with Zarinpal...');
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke('zarinpal-verify', {
          body: {
            authority,
            amount: subscription.price_toman * 10 // Convert to Rial
          }
        });

        console.log('Zarinpal verification response:', verifyData);

        if (verifyError || !verifyData?.success) {
          throw new Error(verifyData?.error || 'Payment verification failed');
        }

        // Check if payment was successful
        if (verifyData.data?.data?.code === 100) {
          console.log('Payment verified successfully. Creating VPN user...');
          
          // Create VPN user and get real subscription URL
          const vpnUserData = await createVPNUser(subscriptionId, subscription);

          // Update subscription with Zarinpal details
          await supabase
            .from('subscriptions')
            .update({
              zarinpal_authority: authority,
              zarinpal_ref_id: verifyData.data?.data?.ref_id,
              status: 'active',
              expire_at: new Date(Date.now() + (subscription.duration_days * 24 * 60 * 60 * 1000)).toISOString()
            })
            .eq('id', subscriptionId);

          setVerificationResult({
            success: true,
            message: language === 'fa' ? 'پرداخت با موفقیت انجام شد' : 'Payment successful',
            subscriptionData: {
              username: subscription.username,
              subscription_url: vpnUserData?.subscription_url || null,
              expire: Date.now() + (subscription.duration_days * 24 * 60 * 60 * 1000),
              data_limit: subscription.data_limit_gb * 1073741824,
              status: 'active',
              subscriptionId: subscriptionId
            }
          });

          // Clean up localStorage
          localStorage.removeItem('pendingZarinpalSubscription');

          toast({
            title: language === 'fa' ? 'پرداخت موفق' : 'Payment Successful',
            description: language === 'fa' ? 
              'پرداخت با موفقیت انجام شد و اشتراک فعال گردید' : 
              'Payment completed successfully and subscription activated',
          });
        } else {
          throw new Error(`Payment verification failed with code: ${verifyData.data?.data?.code}`);
        }

      } catch (error) {
        console.error('Payment verification error:', error);
        setVerificationResult({
          success: false,
          message: error.message || (language === 'fa' ? 'خطا در تایید پرداخت' : 'Payment verification failed')
        });

        toast({
          title: language === 'fa' ? 'خطا در پرداخت' : 'Payment Error',
          description: error.message,
          variant: 'destructive'
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams, language, toast]);

  const handleContinue = () => {
    if (verificationResult?.success && verificationResult.subscriptionData) {
      navigate('/delivery', { 
        state: { subscriptionData: verificationResult.subscriptionData }
      });
    } else {
      navigate('/subscription');
    }
  };

  const handleRetry = () => {
    setIsVerifying(true);
    setVerificationResult(null);
    window.location.reload();
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader className="w-12 h-12 animate-spin mx-auto text-blue-600" />
              <h2 className="text-xl font-semibold">
                {language === 'fa' ? 'در حال تایید پرداخت...' : 'Verifying Payment...'}
              </h2>
              <p className="text-muted-foreground">
                {language === 'fa' ? 
                  'لطفا صبر کنید تا پرداخت شما تایید شود' : 
                  'Please wait while we verify your payment'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center">
      <Card className={`w-full max-w-md mx-4 ${verificationResult?.success ? 'border-green-200' : 'border-red-200'}`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${verificationResult?.success ? 'text-green-600' : 'text-red-600'}`}>
            {verificationResult?.success ? (
              <>
                <CheckCircle className="w-5 h-5" />
                {language === 'fa' ? 'پرداخت موفق' : 'Payment Successful'}
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5" />
                {language === 'fa' ? 'خطا در پرداخت' : 'Payment Failed'}
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-center">
            {verificationResult?.message}
          </p>
          
          {verificationResult?.success && verificationResult.subscriptionData && (
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-sm">
              <p><strong>{language === 'fa' ? 'نام کاربری:' : 'Username:'}</strong> {verificationResult.subscriptionData.username}</p>
              <p><strong>{language === 'fa' ? 'وضعیت:' : 'Status:'}</strong> {language === 'fa' ? 'فعال' : 'Active'}</p>
            </div>
          )}
          
          <div className="flex gap-2">
            {verificationResult?.success ? (
              <Button onClick={handleContinue} className="flex-1">
                {language === 'fa' ? 'مشاهده جزئیات' : 'View Details'}
              </Button>
            ) : (
              <>
                <Button onClick={handleRetry} variant="outline" className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {language === 'fa' ? 'تلاش مجدد' : 'Retry'}
                </Button>
                <Button onClick={() => navigate('/subscription')} className="flex-1">
                  {language === 'fa' ? 'اشتراک جدید' : 'New Subscription'}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ZarinpalVerificationHandler;
