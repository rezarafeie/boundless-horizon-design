
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import PlanSelector from './PlanSelector';
import { Search, RefreshCw, Calendar, Database, CheckCircle } from 'lucide-react';
import { SubscriptionPlan } from '@/types/subscription';

const RenewalSubscriptionForm = () => {
  const { language, t } = useLanguage();
  const isRTL = language === 'fa';
  
  const [searchUsername, setSearchUsername] = useState('');
  const [userFound, setUserFound] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [dataLimit, setDataLimit] = useState(10);
  const [duration, setDuration] = useState(30);
  
  // Mock user data for demonstration
  const mockUserData = {
    username: 'user123',
    currentPlan: 'pro',
    expiryDate: '2024-12-25',
    remainingData: '5.2 GB',
    status: 'active'
  };

  const handleSearch = () => {
    if (searchUsername.trim()) {
      setUserFound(true);
    }
  };

  const handleRenewal = () => {
    console.log('Processing renewal:', {
      username: searchUsername,
      plan: selectedPlan,
      dataLimit,
      duration
    });
    // Here you would integrate with your payment system
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            {t('subscription.renew')}
          </h1>
          <p className="text-xl text-muted-foreground">
            {language === 'fa' ? 'اشتراک شبکه بدون مرز خود را تمدید کنید' : 'Renew your Boundless Network subscription'}
          </p>
        </div>

        <div className="space-y-6">
          {/* User Search Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                {t('subscription.search-username')}
              </CardTitle>
              <CardDescription>
                {language === 'fa' ? 
                  'نام کاربری خود را وارد کنید تا اطلاعات اشتراک نمایش داده شود' : 
                  'Enter your username to display subscription information'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="search-username">{t('subscription.username')}</Label>
                  <Input
                    id="search-username"
                    value={searchUsername}
                    onChange={(e) => setSearchUsername(e.target.value)}
                    placeholder={language === 'fa' ? 'نام کاربری...' : 'Username...'}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleSearch}>
                    <Search className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {language === 'fa' ? 'جستجو' : 'Search'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Information Section */}
          {userFound && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  {t('subscription.account-info')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('subscription.username')}</Label>
                    <p className="font-medium">{mockUserData.username}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('subscription.plan-type')}</Label>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {mockUserData.currentPlan === 'pro' ? 
                          (language === 'fa' ? 'شبکه بدون مرز پرو' : 'Boundless Network Pro') :
                          (language === 'fa' ? 'شبکه بدون مرز لایت' : 'Boundless Network Lite')
                        }
                      </p>
                      <Badge variant={mockUserData.currentPlan === 'pro' ? 'default' : 'secondary'}>
                        {mockUserData.currentPlan.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('subscription.expiry-date')}</Label>
                    <p className="font-medium">{mockUserData.expiryDate}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('subscription.remaining-data')}</Label>
                    <p className="font-medium">{mockUserData.remainingData}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('subscription.status')}</Label>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      {language === 'fa' ? 'فعال' : 'Active'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Renewal Options */}
          {userFound && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-primary" />
                  {language === 'fa' ? 'گزینه‌های تمدید' : 'Renewal Options'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Data Limit */}
                <div>
                  <Label htmlFor="data-limit" className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4" />
                    {t('subscription.data-volume')} (GB)
                  </Label>
                  <Input
                    id="data-limit"
                    type="number"
                    min="1"
                    max="1000"
                    value={dataLimit}
                    onChange={(e) => setDataLimit(Number(e.target.value))}
                  />
                </div>

                {/* Duration */}
                <div>
                  <Label htmlFor="duration" className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4" />
                    {t('subscription.duration')} ({language === 'fa' ? 'روز' : 'Days'})
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    max="365"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  />
                </div>

                <Separator />

                {/* Plan Selection */}
                <PlanSelector
                  selectedPlan={selectedPlan}
                  onPlanSelect={setSelectedPlan}
                  dataLimit={dataLimit}
                />

                {/* Renewal Button */}
                {selectedPlan && (
                  <div className="pt-6">
                    <Button 
                      onClick={handleRenewal}
                      size="lg" 
                      className="w-full"
                    >
                      <RefreshCw className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                      {language === 'fa' ? 
                        `تمدید اشتراک - ${(dataLimit * selectedPlan.pricePerGB).toLocaleString()} تومان` :
                        `Renew Subscription - ${(dataLimit * selectedPlan.pricePerGB).toLocaleString()} Toman`
                      }
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* User Not Found Message */}
          {searchUsername && !userFound && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
              <CardContent className="pt-6">
                <p className="text-red-600 dark:text-red-400 text-center">
                  {t('subscription.user-not-found')}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default RenewalSubscriptionForm;
