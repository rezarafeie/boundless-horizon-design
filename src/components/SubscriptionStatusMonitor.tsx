
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SubscriptionStatusMonitorProps {
  subscriptionId: string;
  onStatusUpdate: (status: string, subscriptionUrl?: string) => void;
}

export const SubscriptionStatusMonitor = ({ subscriptionId, onStatusUpdate }: SubscriptionStatusMonitorProps) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'pending' | 'active' | 'rejected'>('pending');
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkStatus = async () => {
    try {
      console.log('STATUS_MONITOR: Checking subscription status for ID:', subscriptionId);
      
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('status, subscription_url, admin_decision')
        .eq('id', subscriptionId)
        .single();

      if (error) {
        console.error('STATUS_MONITOR: Error fetching subscription:', error);
        return;
      }

      console.log('STATUS_MONITOR: Current subscription data:', subscription);

      if (subscription.status === 'active' && subscription.admin_decision === 'approved') {
        console.log('STATUS_MONITOR: Subscription is now active, redirecting to delivery page');
        setStatus('active');
        setIsMonitoring(false);
        
        // Redirect to delivery page with subscription ID
        navigate(`/delivery?id=${subscriptionId}`, { replace: true });
        
        // Also call the callback
        onStatusUpdate('active', subscription.subscription_url);
      } else if (subscription.admin_decision === 'rejected') {
        console.log('STATUS_MONITOR: Subscription was rejected');
        setStatus('rejected');
        setIsMonitoring(false);
        onStatusUpdate('rejected');
      }
    } catch (error) {
      console.error('STATUS_MONITOR: Error in checkStatus:', error);
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

  useEffect(() => {
    if (!subscriptionId || !isMonitoring) return;

    // Check immediately
    checkStatus();

    // Set up polling every 3 seconds
    const interval = setInterval(checkStatus, 3000);

    // Clean up after 5 minutes
    const timeout = setTimeout(() => {
      setIsMonitoring(false);
      clearInterval(interval);
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [subscriptionId, isMonitoring, onStatusUpdate, navigate]);

  const getStatusIcon = () => {
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
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>
                    {language === 'fa' ? 'بررسی خودکار هر 3 ثانیه...' : 'Auto-checking every 3 seconds...'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
