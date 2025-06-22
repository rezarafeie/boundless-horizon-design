import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader, CheckCircle, XCircle, Clock, RefreshCw, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionStatusMonitorProps {
  subscriptionId: string;
  onStatusUpdate: (status: string, subscriptionUrl?: string) => void;
}

export const SubscriptionStatusMonitor = ({ subscriptionId, onStatusUpdate }: SubscriptionStatusMonitorProps) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'pending' | 'active' | 'rejected'>('pending');
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreatingVpn, setIsCreatingVpn] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date());
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

  const createVpnUser = async (subscription: any) => {
    setIsCreatingVpn(true);
    console.log('🔵 STATUS_MONITOR: Attempting to create VPN user for approved subscription');
    
    try {
      // CRITICAL FIX: Get the CORRECT panel based on subscription's plan
      let panelInfo = null;
      let apiType = 'marzban'; // Default
      
      try {
        console.log('🔍 STATUS_MONITOR: Looking up CORRECT assigned panel for plan_id:', subscription.plan_id);
        
        // Get the subscription plan with its assigned panel
        const { data: planData, error: planError } = await supabase
          .from('subscription_plans')
          .select(`
            *,
            panel_servers!assigned_panel_id(
              id,
              name,
              type,
              panel_url,
              username,
              password,
              is_active,
              health_status
            )
          `)
          .eq('plan_id', subscription.plan_id || 'lite')
          .eq('is_active', true)
          .single();

        if (!planError && planData?.panel_servers) {
          panelInfo = planData.panel_servers;
          apiType = planData.api_type || 'marzban';
          
          console.log('🟢 STATUS_MONITOR: Found CORRECT assigned panel:', {
            planId: planData.plan_id,
            planName: planData.name_en,
            panelName: panelInfo.name,
            panelUrl: panelInfo.panel_url,
            panelType: panelInfo.type
          });
        } else {
          console.error('❌ STATUS_MONITOR: No assigned panel found for plan:', subscription.plan_id, planError);
          
          // STRICT FALLBACK: Only use panels that match the plan type
          const targetPanelType = subscription.plan_id === 'plus' ? 'cp.rain.rest' : 'file.shopifysb.xyz';
          console.log('🔍 STATUS_MONITOR: Using STRICT fallback for plan type:', subscription.plan_id, 'targeting:', targetPanelType);
          
          const { data: fallbackPanel } = await supabase
            .from('panel_servers')
            .select('*')
            .eq('type', 'marzban')
            .eq('is_active', true)
            .eq('health_status', 'online')
            .like('panel_url', `%${targetPanelType}%`)
            .limit(1)
            .single();
          
          if (fallbackPanel) {
            panelInfo = fallbackPanel;
            console.log('🟡 STATUS_MONITOR: Using STRICT fallback panel:', {
              planType: subscription.plan_id,
              panelName: panelInfo.name,
              panelUrl: panelInfo.panel_url
            });
          }
        }
      } catch (error) {
        console.error('❌ STATUS_MONITOR: Error getting panel info:', error);
      }

      if (!panelInfo) {
        throw new Error(`No active panel available for plan "${subscription.plan_id}" VPN creation`);
      }

      // CRITICAL VERIFICATION: Ensure correct panel is being used
      const isCorrectPanel = (
        (subscription.plan_id === 'plus' && panelInfo.panel_url.includes('rain')) ||
        (subscription.plan_id === 'lite' && panelInfo.panel_url.includes('shopifysb'))
      );

      console.log('🔍 STATUS_MONITOR: Panel verification:', {
        subscriptionPlan: subscription.plan_id,
        panelUrl: panelInfo.panel_url,
        isCorrectPanel,
        panelName: panelInfo.name
      });

      if (!isCorrectPanel) {
        throw new Error(`PANEL MISMATCH: Plan "${subscription.plan_id}" cannot use panel "${panelInfo.name}" (${panelInfo.panel_url})`);
      }

      // Prepare request data
      const requestData = {
        username: subscription.username,
        dataLimitGB: subscription.data_limit_gb,
        durationDays: subscription.duration_days,
        notes: `Auto VPN creation after approval - ${subscription.notes || ''}`,
        panelId: panelInfo.id,
        subscriptionId: subscription.id
      };

      console.log(`🔵 STATUS_MONITOR: Creating VPN user via ${apiType} API on CORRECT panel:`, {
        panel: panelInfo.name,
        url: panelInfo.panel_url,
        planType: subscription.plan_id
      });

      let result;
      let functionName;
      
      if (apiType === 'marzban') {
        functionName = 'marzban-create-user';
        const { data, error } = await supabase.functions.invoke('marzban-create-user', {
          body: requestData
        });
        
        if (error) throw error;
        result = data;
      } else {
        functionName = 'marzneshin-create-user';
        const { data, error } = await supabase.functions.invoke('marzneshin-create-user', {
          body: requestData
        });
        
        if (error) throw error;
        result = data;
      }

      // Log the attempt
      await supabase.from('user_creation_logs').insert({
        subscription_id: subscription.id,
        edge_function_name: `${functionName}-auto`,
        request_data: requestData,
        response_data: result || {},
        success: result?.success || false,
        error_message: result?.error || null,
        panel_id: panelInfo.id,
        panel_name: panelInfo.name,
        panel_url: panelInfo.panel_url
      });

      if (result?.success) {
        // Update subscription with VPN details
        const updateData: any = {
          marzban_user_created: true,
          updated_at: new Date().toISOString()
        };

        if (result.data?.subscription_url) {
          updateData.subscription_url = result.data.subscription_url;
        }

        if (!subscription.expire_at && subscription.duration_days) {
          updateData.expire_at = new Date(Date.now() + (subscription.duration_days * 24 * 60 * 60 * 1000)).toISOString();
        }

        // Update notes
        const existingNotes = subscription.notes || '';
        updateData.notes = `${existingNotes} - VPN created automatically on correct panel ${new Date().toLocaleDateString()}`;

        await supabase
          .from('subscriptions')
          .update(updateData)
          .eq('id', subscription.id);

        console.log('🟢 STATUS_MONITOR: VPN user created successfully, redirecting to delivery');
        navigate(`/delivery?id=${subscriptionId}`, { replace: true });
        onStatusUpdate('active', result.data?.subscription_url);
        return true;
      } else {
        throw new Error(result?.error || 'VPN creation failed');
      }
      
    } catch (error) {
      console.error('❌ STATUS_MONITOR: VPN creation failed:', error);
      
      toast({
        title: language === 'fa' ? 'خطای ایجاد VPN' : 'VPN Creation Error',
        description: language === 'fa' ? 
          'ایجاد کاربر VPN ناموفق بود، اما اشتراک شما تأیید شده است' : 
          'VPN user creation failed, but your subscription is approved',
        variant: 'destructive'
      });
      
      // Still redirect to delivery page even if VPN creation fails
      navigate(`/delivery?id=${subscriptionId}`, { replace: true });
      onStatusUpdate('active');
      return false;
    } finally {
      setIsCreatingVpn(false);
    }
  };

  const checkStatus = async () => {
    try {
      console.log('STATUS_MONITOR: Checking subscription status for ID:', subscriptionId);
      
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (error) {
        console.error('STATUS_MONITOR: Error fetching subscription:', error);
        return;
      }

      console.log('STATUS_MONITOR: Current subscription data:', subscription);
      setLastCheckTime(new Date());
      setSubscriptionData(subscription);

      if (subscription.status === 'active' && subscription.admin_decision === 'approved') {
        console.log('STATUS_MONITOR: Subscription is approved');
        setStatus('active');
        
        // Check if VPN user already created
        if (subscription.marzban_user_created && subscription.subscription_url) {
          console.log('STATUS_MONITOR: VPN already created, redirecting to delivery');
          setIsMonitoring(false);
          navigate(`/delivery?id=${subscriptionId}`, { replace: true });
          onStatusUpdate('active', subscription.subscription_url);
        } else if (subscription.marzban_user_created) {
          console.log('STATUS_MONITOR: VPN created but no URL, redirecting to delivery');
          setIsMonitoring(false);
          navigate(`/delivery?id=${subscriptionId}`, { replace: true });
          onStatusUpdate('active');
        } else {
          console.log('STATUS_MONITOR: Subscription approved but VPN not created, attempting creation');
          const vpnCreated = await createVpnUser(subscription);
          if (vpnCreated) {
            setIsMonitoring(false);
          }
        }
      } else if (subscription.admin_decision === 'rejected') {
        console.log('STATUS_MONITOR: Subscription was rejected');
        setStatus('rejected');
        setIsMonitoring(false);
        onStatusUpdate('rejected');
      } else {
        setRetryCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('STATUS_MONITOR: Error in checkStatus:', error);
      setRetryCount(prev => prev + 1);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    console.log('STATUS_MONITOR: Manual refresh triggered');
    await checkStatus();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const handleManualVpnCreation = async () => {
    if (subscriptionData && subscriptionData.status === 'active' && subscriptionData.admin_decision === 'approved') {
      await createVpnUser(subscriptionData);
    }
  };

  useEffect(() => {
    if (!subscriptionId || !isMonitoring) return;

    // Check immediately
    checkStatus();

    // Set up polling with exponential backoff
    const getInterval = () => {
      if (retryCount < 10) return 3000; // 3 seconds for first 10 attempts
      if (retryCount < 20) return 5000; // 5 seconds for next 10 attempts
      return 10000; // 10 seconds after that
    };

    const interval = setInterval(checkStatus, getInterval());

    // Clean up after 10 minutes
    const timeout = setTimeout(() => {
      setIsMonitoring(false);
      clearInterval(interval);
    }, 10 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [subscriptionId, isMonitoring, retryCount, onStatusUpdate, navigate]);

  const getStatusIcon = () => {
    if (isCreatingVpn) {
      return <Zap className="w-8 h-8 text-blue-600 animate-pulse" />;
    }
    
    switch (status) {
      case 'active':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-8 h-8 text-red-600" />;
      default:
        return <Loader className="w-8 h-8 text-blue-600 animate-spin" />;
    }
  };

  const getStatusText = () => {
    if (isCreatingVpn) {
      return language === 'fa' ? 'در حال ایجاد VPN...' : 'Creating VPN...';
    }
    
    switch (status) {
      case 'active':
        return language === 'fa' ? 'فعال شد!' : 'Activated!';
      case 'rejected':
        return language === 'fa' ? 'رد شد' : 'Rejected';
      default:
        return language === 'fa' ? 'در انتظار تأیید...' : 'Awaiting approval...';
    }
  };

  const getStatusDescription = () => {
    if (isCreatingVpn) {
      return language === 'fa' ? 
        'پرداخت شما تأیید شد و در حال ایجاد کاربر VPN...' : 
        'Your payment has been approved and creating VPN user...';
    }
    
    switch (status) {
      case 'active':
        return language === 'fa' ? 
          'اشتراک شما تأیید شد و در حال انتقال به صفحه جزئیات...' : 
          'Your subscription has been approved and redirecting to details...';
      case 'rejected':
        return language === 'fa' ? 
          'متأسفانه پرداخت شما رد شد. لطفاً با پشتیبانی تماس بگیرید.' : 
          'Unfortunately your payment was rejected. Please contact support.';
      default:
        return language === 'fa' ? 
          'پرداخت شما در حال بررسی توسط ادمین است. لطفاً صبر کنید...' : 
          'Your payment is being reviewed by admin. Please wait...';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            {getStatusIcon()}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{getStatusText()}</h3>
            <p className="text-sm text-muted-foreground">{getStatusDescription()}</p>
          </div>

          {status === 'pending' && (
            <div className="space-y-4">
              <Button 
                onClick={handleManualRefresh} 
                disabled={isRefreshing}
                variant="outline"
                className="w-full"
              >
                {isRefreshing ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'fa' ? 'بررسی...' : 'Checking...'}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {language === 'fa' ? 'بررسی مجدد وضعیت' : 'Refresh Status'}
                  </>
                )}
              </Button>
              
              {isMonitoring && (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>
                      {language === 'fa' ? 'بررسی خودکار...' : 'Auto-checking...'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {language === 'fa' ? 'آخرین بررسی:' : 'Last check:'} {lastCheckTime.toLocaleTimeString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {language === 'fa' ? 'تلاش شماره:' : 'Attempt:'} {retryCount}
                  </div>
                </div>
              )}
            </div>
          )}

          {status === 'active' && subscriptionData && !subscriptionData.marzban_user_created && !isCreatingVpn && (
            <Button 
              onClick={handleManualVpnCreation} 
              variant="outline"
              className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Zap className="w-4 h-4 mr-2" />
              {language === 'fa' ? 'ایجاد VPN' : 'Create VPN'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
