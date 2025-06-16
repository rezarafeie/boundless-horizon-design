import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import PlanSelector from './PlanSelector';
import DiscountField from './DiscountField';
import { Search, RefreshCw, Calendar, Database, CheckCircle, CreditCard, Loader } from 'lucide-react';
import { SubscriptionPlan, DiscountCode } from '@/types/subscription';
import { useToast } from '@/hooks/use-toast';

const RenewalSubscriptionForm = () => {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const isRTL = language === 'fa';
  
  const [searchUsername, setSearchUsername] = useState('');
  const [userFound, setUserFound] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [dataLimit, setDataLimit] = useState(10);
  const [duration, setDuration] = useState(30);
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // Mock user data for demonstration
  const mockUserData = {
    username: 'user123',
    currentPlan: 'pro',
    expiryDate: '2024-12-25',
    remainingData: '5.2 GB',
    status: 'active'
  };

  // Merchant ID for Zarinpal
  const MERCHANT_ID = '10f6ea92-fb53-468c-bcc9-36ef4d9f539c';

  const handleSearch = () => {
    if (searchUsername.trim()) {
      setUserFound(true);
      // Auto-select a plan based on current plan
      if (mockUserData.currentPlan === 'pro') {
        setSelectedPlan({
          id: 'pro',
          name: language === 'fa' ? 'شبکه بدون مرز پرو' : 'Boundless Network Pro',
          description: language === 'fa' ? 'دسترسی کامل به همه سرورها' : 'Full access to all servers',
          price: 0,
          pricePerGB: 800,
          apiType: 'marzneshin'
        });
      } else {
        setSelectedPlan({
          id: 'lite',
          name: language === 'fa' ? 'شبکه بدون مرز لایت' : 'Boundless Network Lite',
          description: language === 'fa' ? 'دسترسی به سرورهای اصلی' : 'Access to main servers',
          price: 0,
          pricePerGB: 500,
          apiType: 'marzban'
        });
      }
    }
  };

  const calculatePrice = () => {
    if (!selectedPlan) return 0;
    const basePrice = dataLimit * selectedPlan.pricePerGB;
    
    if (appliedDiscount && appliedDiscount.type === 'percentage') {
      const discountAmount = (basePrice * appliedDiscount.value) / 100;
      return Math.max(0, basePrice - discountAmount);
    } else if (appliedDiscount && appliedDiscount.type === 'fixed') {
      return Math.max(0, basePrice - appliedDiscount.value);
    }
    
    return basePrice;
  };

  const calculateDiscount = () => {
    if (!selectedPlan || !appliedDiscount) return 0;
    const basePrice = dataLimit * selectedPlan.pricePerGB;
    
    if (appliedDiscount.type === 'percentage') {
      return (basePrice * appliedDiscount.value) / 100;
    } else if (appliedDiscount.type === 'fixed') {
      return appliedDiscount.value;
    }
    
    return 0;
  };

  const validateForm = (): boolean => {
    // Plan selection validation
    if (!selectedPlan) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'لطفاً یکی از پلن‌ها را انتخاب کنید' : 
          'Please select a plan',
        variant: 'destructive'
      });
      return false;
    }

    // Username validation
    if (!searchUsername.trim()) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'لطفاً نام کاربری را وارد کنید' : 
          'Please enter username',
        variant: 'destructive'
      });
      return false;
    }

    // Data limit validation
    if (dataLimit < 1 || dataLimit > 500) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'حجم داده باید بین ۱ تا ۵۰۰ گیگابایت باشد' : 
          'Data volume must be between 1 and 500 GB',
        variant: 'destructive'
      });
      return false;
    }

    // Duration validation
    if (duration < 1 || duration > 180) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'مدت زمان باید بین ۱ تا ۱۸۰ روز باشد' : 
          'Duration must be between 1 and 180 days',
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  const createPaymanContract = async (): Promise<string> => {
    setLoadingMessage(language === 'fa' ? 'در حال ایجاد قرارداد پرداخت...' : 'Creating payment contract...');
    
    const expireAt = new Date();
    expireAt.setDate(expireAt.getDate() + 30);
    
    const paymanRequest = {
      merchant_id: MERCHANT_ID,
      mobile: '09123456789', // Use user's mobile from account info
      expire_at: Math.floor(expireAt.getTime() / 1000),
      max_daily_count: 100,
      max_monthly_count: 1000,
      max_amount: calculatePrice() * 10, // Convert Toman to Rial
      callback_url: `${window.location.origin}/renewal?payment_callback=1`
    };

    try {
      const response = await fetch(`https://feamvyruipxtafzhptkh.supabase.co/functions/v1/zarinpal-contract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlYW12eXJ1aXB4dGFmemhwdGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwODE0MzIsImV4cCI6MjA2NTY1NzQzMn0.OcYM5_AGC6CGNgzM_TwrjpcB1PYBiHmUbeuYe9LQJQg'
        },
        body: JSON.stringify(paymanRequest)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create contract');
      }

      if (!data.data?.data?.payman_authority) {
        throw new Error(language === 'fa' ? 
          'پاسخ نامعتبر از درگاه پرداخت' : 
          'Invalid response from payment gateway');
      }

      return data.data.data.payman_authority;
    } catch (error) {
      console.error('Contract creation error:', error);
      throw error;
    }
  };

  const handleRenewal = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setIsLoading(true);
    
    try {
      const finalPrice = calculatePrice();
      
      // If price is 0 (due to discount), show success message
      if (finalPrice === 0) {
        setLoadingMessage(language === 'fa' ? 'در حال تمدید اشتراک رایگان...' : 'Processing free renewal...');
        
        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        toast({
          title: language === 'fa' ? 'موفق' : 'Success',
          description: language === 'fa' ? 
            'اشتراک با موفقیت تمدید شد' : 
            'Subscription renewed successfully',
        });
        
        return;
      }
      
      // Store renewal data for after payment
      const renewalData = {
        username: searchUsername,
        dataLimit,
        duration,
        selectedPlan,
        appliedDiscount
      };
      localStorage.setItem('pendingRenewalData', JSON.stringify(renewalData));
      
      // Create Payman contract for paid renewals
      const paymanAuthority = await createPaymanContract();
      
      // Redirect to Zarinpal payment page
      window.location.href = `https://www.zarinpal.com/pg/StartPayman/${paymanAuthority}/1`;
      
    } catch (error) {
      console.error('Renewal error:', error);
      
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: error instanceof Error ? error.message : (
          language === 'fa' ? 
            'خطا در تمدید اشتراک. لطفاً دوباره تلاش کنید' : 
            'Failed to renew subscription. Please try again'
        ),
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleDiscountApply = (discount: DiscountCode | null) => {
    setAppliedDiscount(discount);
  };

  // Loading Overlay
  const LoadingOverlay = () => {
    if (!isLoading) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="p-6 max-w-sm w-full mx-4">
          <CardContent className="text-center space-y-4">
            <Loader className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm font-medium">{loadingMessage}</p>
            <div className="text-xs text-muted-foreground">
              {language === 'fa' ? 'لطفاً صبر کنید...' : 'Please wait...'}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-12 px-4">
      <LoadingOverlay />
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

                {/* Discount Field */}
                <DiscountField
                  onDiscountApply={handleDiscountApply}
                  appliedDiscount={appliedDiscount}
                />

                {/* Price Calculation */}
                {selectedPlan && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                            {language === 'fa' ? 'محاسبه قیمت' : 'Price Calculation'}
                          </h4>
                          <p className="text-sm text-blue-600 dark:text-blue-400">
                            {language === 'fa' ? 
                              `${dataLimit} گیگابایت × ${selectedPlan.pricePerGB.toLocaleString()} تومان` : 
                              `${dataLimit} GB × ${selectedPlan.pricePerGB.toLocaleString()} Toman`
                            }
                          </p>
                        </div>
                        <div className="text-right">
                          {appliedDiscount && (
                            <div className="text-sm text-blue-600 dark:text-blue-400 line-through">
                              {(dataLimit * selectedPlan.pricePerGB).toLocaleString()}
                              {language === 'fa' ? ' تومان' : ' Toman'}
                            </div>
                          )}
                          <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                            {calculatePrice().toLocaleString()} 
                            {language === 'fa' ? ' تومان' : ' Toman'}
                          </div>
                          {appliedDiscount && (
                            <div className="text-sm text-green-600 dark:text-green-400">
                              {language === 'fa' ? 'صرفه‌جویی: ' : 'You save: '}
                              {calculateDiscount().toLocaleString()}
                              {language === 'fa' ? ' تومان' : ' Toman'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Renewal Button */}
                {selectedPlan && (
                  <div className="pt-6">
                    <Button 
                      onClick={handleRenewal}
                      size="lg" 
                      className="w-full"
                      disabled={isSubmitting || isLoading}
                    >
                      {isSubmitting || isLoading ? (
                        <>
                          <Loader className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'} animate-spin`} />
                          {loadingMessage || (language === 'fa' ? 'در حال پردازش...' : 'Processing...')}
                        </>
                      ) : (
                        <>
                          {calculatePrice() === 0 ? (
                            <>
                              <RefreshCw className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                              {language === 'fa' ? 'تمدید رایگان' : 'Free Renewal'}
                            </>
                          ) : (
                            <>
                              <CreditCard className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                              {language === 'fa' ? 
                                `پرداخت ${calculatePrice().toLocaleString()} تومان` :
                                `Pay ${calculatePrice().toLocaleString()} Toman`
                              }
                            </>
                          )}
                        </>
                      )}
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
