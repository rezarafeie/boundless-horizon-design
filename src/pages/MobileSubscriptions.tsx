import { useNavigate } from 'react-router-dom';
import { MobileAppLayout } from '@/components/mobile/MobileAppLayout';
import { SubscriptionCard } from '@/components/mobile/SubscriptionCard';
import { useSavedSubscriptions } from '@/hooks/useSavedSubscriptions';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Plus, Shield, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

const MobileSubscriptions = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { subscriptions, isLoading, refreshSubscriptions, removeSubscription } = useSavedSubscriptions();
  const [searchMobile, setSearchMobile] = useState('');

  const handleAddSubscription = () => {
    navigate('/subscription');
  };

  const handleLookup = () => {
    if (searchMobile.trim()) {
      navigate(`/delivery?mobile=${encodeURIComponent(searchMobile.trim())}`);
    }
  };

  return (
    <MobileAppLayout
      title="My VPN"
      titleFa="VPN من"
      onRefresh={refreshSubscriptions}
    >
      <div className="space-y-4">
        {/* Search / Add section */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={language === 'fa' ? 'جستجو با شماره موبایل...' : 'Search by mobile...'}
              value={searchMobile}
              onChange={(e) => setSearchMobile(e.target.value)}
              className="pl-9"
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            />
          </div>
          <Button size="icon" onClick={handleLookup} disabled={!searchMobile.trim()}>
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {/* Add new button */}
        <Button
          variant="outline"
          className="w-full gap-2 border-dashed"
          onClick={handleAddSubscription}
        >
          <Plus className="w-4 h-4" />
          {language === 'fa' ? 'خرید اشتراک جدید' : 'Buy New Subscription'}
        </Button>

        {/* Subscriptions list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : subscriptions.length > 0 ? (
          <div className="space-y-3">
            {subscriptions.map((sub) => (
              <SubscriptionCard
                key={sub.id}
                id={sub.id}
                username={sub.username}
                subscriptionUrl={sub.subscription_url}
                expireAt={sub.expire_at}
                dataLimitGb={sub.data_limit_gb}
                status={sub.status}
                onRemove={removeSubscription}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <Shield className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">
                {language === 'fa' ? 'اشتراکی ذخیره نشده' : 'No Saved Subscriptions'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {language === 'fa' 
                  ? 'اشتراک‌های شما در اینجا نمایش داده می‌شوند. با شماره موبایل جستجو کنید یا اشتراک جدید بخرید.'
                  : 'Your subscriptions will appear here. Search by mobile number or buy a new subscription.'
                }
              </p>
            </div>
          </div>
        )}

        {/* Help text */}
        <p className="text-xs text-center text-muted-foreground px-4">
          {language === 'fa'
            ? 'اشتراک‌های شما به صورت محلی ذخیره می‌شوند و حتی آفلاین قابل دسترسی هستند.'
            : 'Your subscriptions are saved locally and accessible even offline.'
          }
        </p>
      </div>
    </MobileAppLayout>
  );
};

export default MobileSubscriptions;
