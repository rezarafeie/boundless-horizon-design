
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PanelUserCreationService } from '@/services/panelUserCreationService';

const PaymentSuccess = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [error, setError] = useState(null);
  const [vpnCreationStatus, setVpnCreationStatus] = useState('pending');

  // Helper function to extract session_id from URL (handles duplicates)
  const extractSessionId = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    // If there are multiple session_id parameters due to URL construction issues,
    // take the first valid one
    if (sessionId) {
      console.log('Extracted session_id:', sessionId);
      return sessionId;
    }
    
    // Fallback: check if the URL has malformed duplicates and extract manually
    const fullUrl = window.location.href;
    const sessionMatch = fullUrl.match(/session_id=([^&?]+)/);
    if (sessionMatch) {
      console.log('Extracted session_id via regex:', sessionMatch[1]);
      return sessionMatch[1];
    }
    
    return null;
  };

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      try {
        // Get parameters from URL with improved parsing
        const sessionId = extractSessionId();
        const authority = searchParams.get('Authority');
        const status = searchParams.get('Status');
        const subscriptionDataParam = searchParams.get('subscriptionData');

        console.log('PaymentSuccess - URL params:', { 
          sessionId, 
          authority, 
          status, 
          subscriptionDataParam,
          fullUrl: window.location.href 
        });

        if (sessionId) {
          // Stripe payment verification
          console.log('Processing Stripe payment with session ID:', sessionId);
          
          const { data, error } = await supabase.functions.invoke('stripe-verify-session', {
            body: { sessionId }
          });

          console.log('Stripe verification response:', { data, error });

          if (error) {
            console.error('Stripe verification error:', error);
            throw new Error(error.message || 'Failed to verify payment');
          }

          if (data?.success && data?.subscription) {
            setSubscriptionData(data.subscription);
            console.log('Stripe payment verified successfully:', data.subscription);
            
            await createVpnUserAutomatically(data.subscription);
            
            // Send new subscription webhook notification with complete data
            try {
              console.log('PAYMENT_SUCCESS: Sending new subscription webhook notification');
              
              // Get full subscription with plan and panel details
              const { data: fullSubscription } = await supabase
                .from('subscriptions')
                .select(`
                  *,
                  subscription_plans (
                    name_en,
                    name_fa,
                    plan_id,
                    assigned_panel_id,
                    panel_servers (
                      name,
                      type,
                      panel_url,
                      country_en
                    )
                  )
                `)
                .eq('id', data.subscription.id)
                .single();

              const plan = fullSubscription?.subscription_plans;
              const panel = plan?.panel_servers;
              
              const { data: webhookData, error: webhookError } = await supabase.functions.invoke('send-webhook-notification', {
                body: {
                  type: 'new_subscription',
                  webhook_type: 'subscription_creation',
                  subscription_id: data.subscription.id,
                  username: data.subscription.username,
                  mobile: data.subscription.mobile,
                  email: data.subscription.email,
                  amount: data.subscription.price_toman,
                  payment_method: 'stripe',
                  subscription_url: data.subscription.subscription_url,
                  plan_name: plan?.name_en,
                  plan_id: plan?.plan_id,
                  panel_name: panel?.name,
                  panel_type: panel?.type,
                  panel_url: panel?.panel_url,
                  panel_country: panel?.country_en,
                  data_limit_gb: data.subscription.data_limit_gb,
                  duration_days: data.subscription.duration_days,
                  expire_at: data.subscription.expire_at,
                  protocol: data.subscription.protocol,
                  status: data.subscription.status,
                  created_at: new Date().toISOString()
                }
              });
            } catch (webhookError) {
              console.error('PAYMENT_SUCCESS: Failed to send webhook notification:', webhookError);
              // Don't fail for webhook issues
            }

            // Send user confirmation email
            if (data.subscription.email) {
              try {
                await supabase.functions.invoke('send-subscription-emails', {
                  body: {
                    subscriptionId: data.subscription.id,
                    type: 'user_confirmation'
                  }
                });
              } catch (emailError) {
                console.error('Failed to send user confirmation email:', emailError);
              }
            }
            
            localStorage.setItem('deliverySubscriptionData', JSON.stringify(data.subscription));
            
            toast({
              title: language === 'fa' ? 'پرداخت موفق' : 'Payment Successful',
              description: language === 'fa' ? 
                'پرداخت با موفقیت انجام شد. در حال انتقال...' : 
                'Payment completed successfully. Redirecting...',
            });

            setTimeout(() => {
              navigate(`/delivery?id=${data.subscription.id}`);
            }, 3000);
          } else {
            throw new Error('Payment verification failed');
          }
        } else if (authority && status === 'OK') {
          // Zarinpal payment verification
          console.log('Processing Zarinpal payment with authority:', authority);
          
          const { data, error } = await supabase.functions.invoke('zarinpal-verify', {
            body: { authority }
          });

          console.log('Zarinpal verification response:', { data, error });

          if (error) {
            console.error('Zarinpal verification error:', error);
            throw new Error(error.message || 'Failed to verify Zarinpal payment');
          }

          if (data?.success && data?.reference_id) {
            // Find subscription by authority - get fresh data
            const { data: subscription, error: subError } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('zarinpal_authority', authority)
              .single();

            if (subError || !subscription) {
              console.error('Failed to find subscription:', subError);
              throw new Error('Subscription not found');
            }

            console.log('Found subscription for Zarinpal authority:', subscription);

            // Update subscription status to active first
            const { error: updateError } = await supabase
              .from('subscriptions')
              .update({
                status: 'active',
                zarinpal_ref_id: data.reference_id.toString(),
                notes: `${subscription.notes || ''} - Zarinpal payment verified - Ref ID: ${data.reference_id}`,
                updated_at: new Date().toISOString()
              })
              .eq('id', subscription.id);

            if (updateError) {
              console.error('Failed to update subscription status:', updateError);
              // Continue anyway - payment was verified
            }

            // Get updated subscription data
            const { data: updatedSubscription } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('id', subscription.id)
              .single();

            const finalSubscription = updatedSubscription || subscription;
            finalSubscription.status = 'active'; // Ensure status is active
            
            setSubscriptionData(finalSubscription);
            console.log('Zarinpal payment verified successfully:', finalSubscription);
            
            // Create VPN user automatically
            await createVpnUserAutomatically(finalSubscription);
            
            // Send new subscription webhook notification with complete data
            try {
              console.log('PAYMENT_SUCCESS: Sending new subscription webhook notification for Zarinpal');
              
              // Get full subscription with plan and panel details
              const { data: fullSubscription } = await supabase
                .from('subscriptions')
                .select(`
                  *,
                  subscription_plans (
                    name_en,
                    name_fa,
                    plan_id,
                    assigned_panel_id,
                    panel_servers (
                      name,
                      type,
                      panel_url,
                      country_en
                    )
                  )
                `)
                .eq('id', finalSubscription.id)
                .single();

              const plan = fullSubscription?.subscription_plans;
              const panel = plan?.panel_servers;
              
              await supabase.functions.invoke('send-webhook-notification', {
                body: {
                  type: 'new_subscription',
                  webhook_type: 'subscription_creation',
                  subscription_id: finalSubscription.id,
                  username: finalSubscription.username,
                  mobile: finalSubscription.mobile,
                  email: finalSubscription.email,
                  amount: finalSubscription.price_toman,
                  payment_method: 'zarinpal',
                  subscription_url: finalSubscription.subscription_url,
                  plan_name: plan?.name_en,
                  plan_id: plan?.plan_id,
                  panel_name: panel?.name,
                  panel_type: panel?.type,
                  panel_url: panel?.panel_url,
                  panel_country: panel?.country_en,
                  data_limit_gb: finalSubscription.data_limit_gb,
                  duration_days: finalSubscription.duration_days,
                  expire_at: finalSubscription.expire_at,
                  protocol: finalSubscription.protocol,
                  status: finalSubscription.status,
                  created_at: new Date().toISOString()
                }
              });
            } catch (webhookError) {
              console.error('PAYMENT_SUCCESS: Failed to send webhook notification:', webhookError);
              // Don't fail for webhook issues
            }
            
            // Send user confirmation email
            if (finalSubscription.email) {
              try {
                await supabase.functions.invoke('send-subscription-emails', {
                  body: {
                    subscriptionId: finalSubscription.id,
                    type: 'user_confirmation'
                  }
                });
              } catch (emailError) {
                console.error('Failed to send user confirmation email:', emailError);
              }
            }
            
            localStorage.setItem('deliverySubscriptionData', JSON.stringify(finalSubscription));
            
            toast({
              title: language === 'fa' ? 'پرداخت موفق' : 'Payment Successful',
              description: language === 'fa' ? 
                'پرداخت با موفقیت انجام شد. در حال انتقال...' : 
                'Payment completed successfully. Redirecting...',
            });

            setTimeout(() => {
              navigate(`/delivery?id=${finalSubscription.id}`);
            }, 3000);
          } else {
            throw new Error('Zarinpal payment verification failed');
          }
        } else if (subscriptionDataParam) {
          // This is from other payment methods with subscription data in URL
          try {
            const decodedData = JSON.parse(decodeURIComponent(subscriptionDataParam));
            setSubscriptionData(decodedData);
            console.log('Decoded subscription data:', decodedData);
            
            await createVpnUserAutomatically(decodedData);
            
            // Send new subscription webhook notification with complete data
            try {
              console.log('PAYMENT_SUCCESS: Sending new subscription webhook notification for other payment method');
              
              // Get full subscription with plan and panel details
              const { data: fullSubscription } = await supabase
                .from('subscriptions')
                .select(`
                  *,
                  subscription_plans (
                    name_en,
                    name_fa,
                    plan_id,
                    assigned_panel_id,
                    panel_servers (
                      name,
                      type,
                      panel_url,
                      country_en
                    )
                  )
                `)
                .eq('id', decodedData.id)
                .single();

              const plan = fullSubscription?.subscription_plans;
              const panel = plan?.panel_servers;
              
              await supabase.functions.invoke('send-webhook-notification', {
                body: {
                  type: 'new_subscription',
                  webhook_type: 'subscription_creation',
                  subscription_id: decodedData.id,
                  username: decodedData.username,
                  mobile: decodedData.mobile,
                  email: decodedData.email,
                  amount: decodedData.price_toman,
                  payment_method: 'other',
                  subscription_url: decodedData.subscription_url,
                  plan_name: plan?.name_en,
                  plan_id: plan?.plan_id,
                  panel_name: panel?.name,
                  panel_type: panel?.type,
                  panel_url: panel?.panel_url,
                  panel_country: panel?.country_en,
                  data_limit_gb: decodedData.data_limit_gb,
                  duration_days: decodedData.duration_days,
                  expire_at: decodedData.expire_at,
                  protocol: decodedData.protocol,
                  status: decodedData.status,
                  created_at: new Date().toISOString()
                }
              });
            } catch (webhookError) {
              console.error('PAYMENT_SUCCESS: Failed to send webhook notification:', webhookError);
              // Don't fail for webhook issues
            }
            
            // Send user confirmation email
            if (decodedData.email) {
              try {
                await supabase.functions.invoke('send-subscription-emails', {
                  body: {
                    subscriptionId: decodedData.id,
                    type: 'user_confirmation'
                  }
                });
              } catch (emailError) {
                console.error('Failed to send user confirmation email:', emailError);
              }
            }
            
            localStorage.setItem('deliverySubscriptionData', JSON.stringify(decodedData));
            
            setTimeout(() => {
              navigate(`/delivery?id=${decodedData.id}`);
            }, 3000);
          } catch (parseError) {
            console.error('Failed to parse subscription data:', parseError);
            throw new Error('Invalid subscription data format');
          }
        } else {
          throw new Error('No payment data found in URL');
        }
      } catch (error) {
        console.error('Payment success handling error:', error);
        setError(error.message);
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: error.message,
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    const createVpnUserAutomatically = async (subscription: any) => {
      try {
        console.log('🔵 PAYMENT_SUCCESS: Creating VPN user automatically for subscription:', subscription.id);
        setVpnCreationStatus('creating');
        
        if (!subscription.plan_id) {
          console.error('❌ PAYMENT_SUCCESS: No plan_id found in subscription');
          setVpnCreationStatus('failed');
          return;
        }

        const vpnResult = await PanelUserCreationService.createUserFromPanel({
          planId: subscription.plan_id,
          username: subscription.username,
          dataLimitGB: subscription.data_limit_gb,
          durationDays: subscription.duration_days,
          notes: `Automatic VPN creation after successful payment - Ref: ${subscription.zarinpal_ref_id || 'N/A'}`,
          subscriptionId: subscription.id
        });

        console.log('🔵 PAYMENT_SUCCESS: VPN creation result:', vpnResult);

        if (vpnResult.success && vpnResult.data?.subscription_url) {
          console.log('🟢 PAYMENT_SUCCESS: VPN user created successfully automatically');
          setVpnCreationStatus('success');
          
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              subscription_url: vpnResult.data.subscription_url,
              marzban_user_created: true,
              expire_at: new Date(Date.now() + (subscription.duration_days * 24 * 60 * 60 * 1000)).toISOString(),
              notes: `${subscription.notes || ''} - VPN created automatically using ${vpnResult.data.panel_type} panel`,
              updated_at: new Date().toISOString()
            })
            .eq('id', subscription.id);

          if (updateError) {
            console.error('❌ PAYMENT_SUCCESS: Failed to update subscription with VPN details:', updateError);
          } else {
            console.log('🟢 PAYMENT_SUCCESS: Subscription updated with VPN details');
            subscription.subscription_url = vpnResult.data.subscription_url;
            subscription.marzban_user_created = true;
            setSubscriptionData({ ...subscription });
          }
        } else {
          console.error('❌ PAYMENT_SUCCESS: VPN creation failed:', vpnResult.error);
          setVpnCreationStatus('failed');
          
          toast({
            title: language === 'fa' ? 'خطا در ایجاد VPN' : 'VPN Creation Failed',
            description: language === 'fa' ? 
              'پرداخت موفق بود اما ایجاد VPN با خطا مواجه شد. لطفاً با پشتیبانی تماس بگیرید.' : 
              'Payment was successful but VPN creation failed. Please contact support.',
            variant: 'destructive'
          });
        }
      } catch (error) {
        console.error('❌ PAYMENT_SUCCESS: Error creating VPN user automatically:', error);
        setVpnCreationStatus('failed');
        
        toast({
          title: language === 'fa' ? 'خطا در ایجاد VPN' : 'VPN Creation Failed', 
          description: language === 'fa' ? 
            'پرداخت موفق بود اما ایجاد VPN با خطا مواجه شد. لطفاً با پشتیبانی تماس بگیرید.' : 
            'Payment was successful but VPN creation failed. Please contact support.',
          variant: 'destructive'
        });
      }
    };

    handlePaymentSuccess();
  }, [searchParams, navigate, language, toast]);

  const goToDelivery = () => {
    if (subscriptionData) {
      navigate(`/delivery?id=${subscriptionData.id}`);
    } else {
      navigate('/subscription');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader className="w-12 h-12 animate-spin mx-auto text-blue-600" />
              <h2 className="text-xl font-semibold">
                {language === 'fa' ? 'در حال بررسی پرداخت...' : 'Verifying Payment...'}
              </h2>
              <p className="text-muted-foreground">
                {language === 'fa' ? 
                  'لطفا صبر کنید تا پرداخت شما بررسی شود' : 
                  'Please wait while we verify your payment'
                }
              </p>
              {vpnCreationStatus === 'creating' && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    {language === 'fa' ? 'در حال ایجاد VPN...' : 'Creating your VPN...'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {language === 'fa' ? 'خطا در پرداخت' : 'Payment Error'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/subscription')} variant="outline" className="flex-1">
                {language === 'fa' ? 'تلاش مجدد' : 'Try Again'}
              </Button>
              <Button onClick={() => navigate('/')} className="flex-1">
                {language === 'fa' ? 'صفحه اصلی' : 'Home'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-600 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {language === 'fa' ? 'پرداخت موفق' : 'Payment Successful'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            {language === 'fa' ? 
              'پرداخت شما با موفقیت انجام شد و در حال ایجاد VPN هستیم. در حال انتقال به صفحه جزئیات...' : 
              'Your payment was successful and we are creating your VPN. Redirecting to details page...'
            }
          </p>
          
          {subscriptionData && (
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-sm">
              <p><strong>{language === 'fa' ? 'نام کاربری:' : 'Username:'}</strong> {subscriptionData.username}</p>
              <p><strong>{language === 'fa' ? 'وضعیت:' : 'Status:'}</strong> {subscriptionData.status || 'Active'}</p>
              {vpnCreationStatus === 'success' && (
                <p className="text-green-600"><strong>VPN:</strong> ✅ Created</p>
              )}
              {vpnCreationStatus === 'failed' && (
                <p className="text-orange-600"><strong>VPN:</strong> ⚠️ Creation failed - Contact support</p>
              )}
              {vpnCreationStatus === 'creating' && (
                <p className="text-blue-600"><strong>VPN:</strong> 🔄 Creating...</p>
              )}
            </div>
          )}
          
          <Button onClick={goToDelivery} className="w-full">
            {language === 'fa' ? 'مشاهده جزئیات' : 'View Details'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
