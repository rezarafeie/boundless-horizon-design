import { useNavigate } from 'react-router-dom';
import { MobileAppLayout } from '@/components/mobile/MobileAppLayout';
import { VPNConnectButton } from '@/components/mobile/VPNConnectButton';
import { ConnectionStatusCard } from '@/components/mobile/ConnectionStatusCard';
import { useSavedSubscriptions } from '@/hooks/useSavedSubscriptions';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Plus, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';

type ConnectionStatus = 'disconnected' | 'connecting' | 'active' | 'expired' | 'pending';

const MobileApp = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { subscriptions, isLoading, refreshSubscriptions } = useSavedSubscriptions();
  const [primarySubscription, setPrimarySubscription] = useState<typeof subscriptions[0] | null>(null);

  useEffect(() => {
    // Find the most active subscription
    if (subscriptions.length > 0) {
      const active = subscriptions.find(s => s.status === 'active');
      const pending = subscriptions.find(s => s.status === 'pending' || s.status === 'awaiting_payment');
      setPrimarySubscription(active || pending || subscriptions[0]);
    } else {
      setPrimarySubscription(null);
    }
  }, [subscriptions]);

  const getConnectionStatus = (): ConnectionStatus => {
    if (!primarySubscription) return 'disconnected';
    
    const isExpired = primarySubscription.expire_at && new Date(primarySubscription.expire_at) < new Date();
    if (isExpired) return 'expired';
    if (primarySubscription.status === 'active') return 'active';
    if (primarySubscription.status === 'pending' || primarySubscription.status === 'awaiting_payment') return 'pending';
    return 'disconnected';
  };

  const getTimeRemaining = () => {
    if (!primarySubscription?.expire_at) return undefined;
    
    const now = new Date();
    const expire = new Date(primarySubscription.expire_at);
    const diff = expire.getTime() - now.getTime();
    
    if (diff <= 0) return language === 'fa' ? 'منقضی شده' : 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return language === 'fa' ? `${days} روز` : `${days} days`;
    }
    return language === 'fa' ? `${hours} ساعت` : `${hours} hours`;
  };

  const status = getConnectionStatus();

  return (
    <MobileAppLayout
      title="BNETS.CO"
      titleFa="BNETS.CO"
      onRefresh={refreshSubscriptions}
    >
      <div className="space-y-6">
        {/* VPN Connect Button */}
        <VPNConnectButton
          status={status}
          subscriptionUrl={primarySubscription?.subscription_url}
          username={primarySubscription?.username}
          expireAt={primarySubscription?.expire_at}
          onConnect={!primarySubscription ? () => navigate('/subscription') : undefined}
        />

        {/* Connection Status Card */}
        {primarySubscription && (
          <ConnectionStatusCard
            isActive={status === 'active'}
            location={language === 'fa' ? 'آلمان' : 'Germany'}
            timeRemaining={getTimeRemaining()}
            dataLimit={`${primarySubscription.data_limit_gb} GB`}
          />
        )}

        {/* No subscription state */}
        {!isLoading && !primarySubscription && (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <Shield className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">
                {language === 'fa' ? 'اشتراکی ندارید' : 'No Subscription'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'fa' 
                  ? 'برای استفاده از VPN، یک اشتراک تهیه کنید'
                  : 'Get a subscription to start using VPN'
                }
              </p>
            </div>
            <Button onClick={() => navigate('/subscription')} className="gap-2">
              <Plus className="w-4 h-4" />
              {language === 'fa' ? 'خرید اشتراک' : 'Buy Subscription'}
            </Button>
          </div>
        )}

        {/* Quick actions */}
        {subscriptions.length > 1 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/app/subscriptions')}
          >
            {language === 'fa' 
              ? `مشاهده همه اشتراک‌ها (${subscriptions.length})`
              : `View all subscriptions (${subscriptions.length})`
            }
          </Button>
        )}
      </div>
    </MobileAppLayout>
  );
};

export default MobileApp;
