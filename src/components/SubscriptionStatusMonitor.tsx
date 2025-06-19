
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { CheckCircle, Clock, AlertCircle, RefreshCw, Copy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionStatusMonitorProps {
  subscriptionId: string;
  onStatusUpdate: (status: string, subscriptionUrl?: string) => void;
}

export const SubscriptionStatusMonitor = ({ 
  subscriptionId, 
  onStatusUpdate 
}: SubscriptionStatusMonitorProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [status, setStatus] = useState<string>('pending');
  const [subscriptionUrl, setSubscriptionUrl] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [planInfo, setPlanInfo] = useState<any>(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);

  const fetchStatus = async () => {
    console.log('Fetching subscription status for ID:', subscriptionId);
    const { data } = await supabase
      .from('subscriptions')
      .select(`
        status, 
        subscription_url, 
        admin_decision,
        username,
        data_limit_gb,
        duration_days,
        notes
      `)
      .eq('id', subscriptionId)
      .single();
    
    if (data) {
      console.log('Subscription status data:', data);
      setStatus(data.status);
      setSubscriptionDetails(data);
      
      if (data.subscription_url) {
        setSubscriptionUrl(data.subscription_url);
      }
      
      // Extract plan information from notes if available
      if (data.notes) {
        const planMatch = data.notes.match(/Plan: ([^,]+)/);
        if (planMatch) {
          setPlanInfo({ name: planMatch[1] });
        }
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
    console.log('Manual refresh initiated for subscription:', subscriptionId);
    setIsRefreshing(true);
    try {
      await fetchStatus();
      console.log('Manual refresh completed successfully');
      toast({
        title: language === 'fa' ? 'وضعیت به‌روزرسانی شد' : 'Status Updated',
        description: language === 'fa' ? 'وضعیت اشتراک با موفقیت بررسی شد' : 'Subscription status checked successfully',
      });
    } catch (error) {
      console.error('Manual refresh failed:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در بررسی وضعیت' : 'Failed to check status',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const copySubscriptionUrl = () => {
    if (subscriptionUrl) {
      navigator.clipboard.writeText(subscriptionUrl);
      toast({
        title: language === 'fa' ? 'کپی شد!' : 'Copied!',
        description: language === 'fa' ? 'لینک اشتراک کپی شد' : 'Subscription URL copied to clipboard',
      });
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

  // Check if this is a lite plan based on plan info or subscription details
  const isLitePlan = planInfo?.name?.toLowerCase().includes('lite') || 
                    subscriptionDetails?.notes?.toLowerCase().includes('lite');

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
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {language === 'fa' ? 'بررسی وضعیت' : 'Check Status'}
                </Button>
              </div>
            </>
          )}

          {status === 'active' && subscriptionUrl && (
            <div className="space-y-3 w-full">
              <p className="text-sm text-green-600">
                {language === 'fa' 
                  ? 'اشتراک شما آماده است!' 
                  : 'Your subscription is ready!'}
              </p>
              
              {/* Show subscription details for lite plans */}
              {isLitePlan && subscriptionDetails && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg w-full">
                  <div className="space-y-2 text-sm text-left">
                    <div className="flex justify-between">
                      <span className="font-medium">{language === 'fa' ? 'نام کاربری:' : 'Username:'}</span>
                      <span className="font-mono">{subscriptionDetails.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">{language === 'fa' ? 'حجم:' : 'Data:'}</span>
                      <span>{subscriptionDetails.data_limit_gb} GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">{language === 'fa' ? 'مدت:' : 'Duration:'}</span>
                      <span>{subscriptionDetails.duration_days} {language === 'fa' ? 'روز' : 'days'}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-sm font-medium mb-1">
                      {language === 'fa' ? 'لینک اشتراک:' : 'Subscription URL:'}
                    </div>
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs break-all">
                      {subscriptionUrl}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  onClick={copySubscriptionUrl}
                  className="flex items-center gap-2 flex-1"
                >
                  <Copy className="w-4 h-4" />
                  {language === 'fa' ? 'کپی لینک' : 'Copy URL'}
                </Button>
                
                {/* Only show delivery button for non-lite plans */}
                {!isLitePlan && (
                  <Button 
                    onClick={() => window.location.href = `/delivery?id=${subscriptionId}`}
                    className="flex-1"
                  >
                    {language === 'fa' ? 'مشاهده جزئیات اشتراک' : 'View Subscription Details'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
