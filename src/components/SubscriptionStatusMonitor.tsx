
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SubscriptionStatusMonitorProps {
  subscriptionId: string;
  onStatusUpdate: (status: string, subscriptionUrl?: string) => void;
}

export const SubscriptionStatusMonitor = ({ 
  subscriptionId, 
  onStatusUpdate 
}: SubscriptionStatusMonitorProps) => {
  const { language } = useLanguage();
  const [status, setStatus] = useState<string>('pending');
  const [subscriptionUrl, setSubscriptionUrl] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatus = async () => {
    console.log('Fetching subscription status for ID:', subscriptionId);
    const { data } = await supabase
      .from('subscriptions')
      .select('status, subscription_url, admin_decision')
      .eq('id', subscriptionId)
      .single();
    
    if (data) {
      console.log('Subscription status data:', data);
      setStatus(data.status);
      if (data.subscription_url) {
        setSubscriptionUrl(data.subscription_url);
      }
      
      // Trigger callback for status updates
      if (data.status === 'active' && data.subscription_url) {
        onStatusUpdate('active', data.subscription_url);
      } else if (data.admin_decision === 'rejected') {
        onStatusUpdate('rejected');
      }
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchStatus();
    } catch (error) {
      console.error('Manual refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('Setting up real-time subscription for:', subscriptionId);
    
    // Initial fetch
    fetchStatus();

    // Set up real-time subscription
    const channel = supabase
      .channel(`subscription_${subscriptionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'subscriptions',
          filter: `id=eq.${subscriptionId}`
        },
        (payload) => {
          console.log('Real-time update:', payload);
          const newData = payload.new as any;
          
          setStatus(newData.status);
          
          if (newData.status === 'active' && newData.subscription_url) {
            setSubscriptionUrl(newData.subscription_url);
            onStatusUpdate('active', newData.subscription_url);
          } else if (newData.admin_decision === 'rejected') {
            onStatusUpdate('rejected');
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [subscriptionId, onStatusUpdate]);

  const getStatusIcon = () => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'rejected':
        return <AlertCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Clock className="w-6 h-6 text-orange-600 animate-pulse" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'active':
        return language === 'fa' 
          ? '✅ پرداخت تأیید شد! اشتراک شما فعال است' 
          : '✅ Payment Approved! Your subscription is active';
      case 'rejected':
        return language === 'fa' 
          ? '❌ پرداخت رد شد. لطفاً با پشتیبان تماس بگیرید' 
          : '❌ Payment Rejected. Please contact support';
      default:
        return language === 'fa' 
          ? '⏳ در انتظار تأیید ادمین...' 
          : '⏳ Waiting for admin approval...';
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6 text-center">
        <div className="flex flex-col items-center space-y-4">
          {getStatusIcon()}
          <h3 className="text-lg font-semibold">
            {getStatusMessage()}
          </h3>
          
          {status === 'pending' && (
            <>
              <p className="text-sm text-muted-foreground">
                {language === 'fa' 
                  ? 'پرداخت شما در حال بررسی است. لطفاً صبر کنید...' 
                  : 'Your payment is being reviewed. Please wait...'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {language === 'fa' ? 'بررسی مجدد' : 'Check Status'}
              </Button>
            </>
          )}

          {status === 'active' && subscriptionUrl && (
            <div className="space-y-3 w-full">
              <p className="text-sm text-green-600">
                {language === 'fa' 
                  ? 'اشتراک شما آماده است!' 
                  : 'Your subscription is ready!'}
              </p>
              <Button 
                onClick={() => window.location.href = `/delivery?id=${subscriptionId}`}
                className="w-full"
              >
                {language === 'fa' ? 'مشاهده جزئیات اشتراک' : 'View Subscription Details'}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
