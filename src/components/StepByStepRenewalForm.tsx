
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, RefreshCw, Calendar, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { PlanService, PlanWithPanels } from '@/services/planService';
import ZarinpalPayment from './ZarinpalPayment';
import { OfflineProtection } from './OfflineProtection';

interface AccountInfo {
  username: string;
  planType: 'lite' | 'pro';
  expiryDate: string;
  remainingData: string;
  status: 'active' | 'expired';
}

const StepByStepRenewalForm = () => {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanWithPanels | null>(null);
  const [plans, setPlans] = useState<PlanWithPanels[]>([]);
  const [extensionDays, setExtensionDays] = useState('');
  const [additionalData, setAdditionalData] = useState('');
  const [customData, setCustomData] = useState('');
  const [customDuration, setCustomDuration] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false);

  // Load plans when step changes to 2
  const loadPlans = async () => {
    if (plans.length > 0) return; // Already loaded

    setIsLoadingPlans(true);
    try {
      const availablePlans = await PlanService.getAvailablePlans();
      setPlans(availablePlans);
    } catch (error) {
      console.error('Failed to load plans:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در بارگیری پلان‌ها' : 'Failed to load plans',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handleSearch = async () => {
    if (!username.trim()) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'لطفاً نام کاربری را وارد کنید' : 'Please enter username',
        variant: 'destructive'
      });
      return;
    }

    setIsSearching(true);
    
    try {
      // Mock API call - replace with actual API integration
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock response
      const mockAccountInfo: AccountInfo = {
        username: username,
        planType: username.includes('pro') ? 'pro' : 'lite',
        expiryDate: '2024-07-15',
        remainingData: '5.2 GB',
        status: 'active'
      };

      setAccountInfo(mockAccountInfo);
      setStep(2);
      await loadPlans();
    } catch (error) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: t('subscription.user-not-found'),
        variant: 'destructive'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const calculateTotalPrice = () => {
    if (!selectedPlan) return 0;

    let total = 0;
    let totalGB = 0;

    // Calculate from extension options
    if (extensionDays) {
      const days = parseInt(extensionDays);
      totalGB += selectedPlan.default_data_limit_gb * (days / selectedPlan.default_duration_days);
    }

    if (additionalData) {
      totalGB += parseInt(additionalData);
    }

    // Calculate from custom options
    if (customData) {
      totalGB += parseInt(customData);
    }

    total = totalGB * selectedPlan.price_per_gb;
    return Math.ceil(total);
  };

  const handleProceedToPayment = () => {
    if (!selectedPlan) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'لطفاً پلن مورد نظر را انتخاب کنید' : 'Please select a plan',
        variant: 'destructive'
      });
      return;
    }

    if (!extensionDays && !additionalData && !customData) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'لطفاً حداقل یکی از گزینه‌های تمدید را انتخاب کنید' : 'Please select at least one renewal option',
        variant: 'destructive'
      });
      return;
    }

    const price = calculateTotalPrice();
    setTotalPrice(price);
    setStep(3);
  };

  const handlePaymentSuccess = async () => {
    setIsCreatingSubscription(true);
    
    try {
      // Mock API call for subscription renewal
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: language === 'fa' ? 'موفق' : 'Success',
        description: t('subscription.renewal-success'),
      });
      
      // Reset form
      setStep(1);
      setUsername('');
      setAccountInfo(null);
      setSelectedPlan(null);
      setExtensionDays('');
      setAdditionalData('');
      setCustomData('');
      setCustomDuration('');
      setTotalPrice(0);
    } catch (error) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در تمدید اشتراک' : 'Failed to renew subscription',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingSubscription(false);
    }
  };

  return (
    <OfflineProtection protectPurchase={true}>
      <div className="max-w-4xl mx-auto p-6">
        <Card className="bg-white dark:bg-gray-900 shadow-xl border-0">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {language === 'fa' ? 'تمدید اشتراک VPN' : 'VPN Subscription Renewal'}
            </CardTitle>
            <div className="flex items-center justify-center gap-2 mt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step >= i 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {i}
                  </div>
                  {i < 3 && <div className="w-12 h-0.5 bg-gray-200 dark:bg-gray-700 mx-2" />}
                </div>
              ))}
            </div>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Search className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    {language === 'fa' ? 'جستجوی حساب کاربری' : 'Search Account'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {language === 'fa' ? 
                      'نام کاربری VPN خود را وارد کنید' : 
                      'Enter your VPN username to find your account'
                    }
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">
                      {language === 'fa' ? 'نام کاربری' : 'Username'}
                    </Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={language === 'fa' ? 'نام کاربری خود را وارد کنید' : 'Enter your username'}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="text-lg py-3"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleSearch}
                    className="w-full"
                    disabled={isSearching}
                    size="lg"
                  >
                    {isSearching ? (
                      <>
                        <RefreshCw className={`w-5 h-5 animate-spin ${language === 'fa' ? 'ml-2' : 'mr-2'}`} />
                        {language === 'fa' ? 'در حال جستجو...' : 'Searching...'}
                      </>
                    ) : (
                      <>
                        <Search className={`w-5 h-5 ${language === 'fa' ? 'ml-2' : 'mr-2'}`} />
                        {language === 'fa' ? 'جستجو' : 'Search'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && accountInfo && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Calendar className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    {language === 'fa' ? 'انتخاب گزینه‌های تمدید' : 'Choose Renewal Options'}
                  </h3>
                </div>

                {/* Account Info */}
                <Card className="bg-gray-50 dark:bg-gray-800 border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold">{accountInfo.username}</h4>
                      <Badge variant={accountInfo.status === 'active' ? 'default' : 'destructive'}>
                        {accountInfo.status === 'active' 
                          ? (language === 'fa' ? 'فعال' : 'Active')
                          : (language === 'fa' ? 'منقضی' : 'Expired')
                        }
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">{language === 'fa' ? 'نوع پلن' : 'Plan Type'}</Label>
                        <p className="font-medium">{accountInfo.planType}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{language === 'fa' ? 'تاریخ انقضا' : 'Expiry Date'}</Label>
                        <p className="font-medium">{accountInfo.expiryDate}</p>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-muted-foreground">{language === 'fa' ? 'حجم باقی‌مانده' : 'Remaining Data'}</Label>
                        <p className="font-medium">{accountInfo.remainingData}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Plan Selection */}
                <div className="space-y-4">
                  <Label>{language === 'fa' ? 'انتخاب پلن' : 'Select Plan'}</Label>
                  {isLoadingPlans ? (
                    <div className="text-center py-4">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-gray-600">{language === 'fa' ? 'در حال بارگیری پلان‌ها...' : 'Loading plans...'}</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {plans.map((plan) => (
                        <Card 
                          key={plan.id} 
                          className={`cursor-pointer transition-all ${
                            selectedPlan?.id === plan.id 
                              ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                          onClick={() => setSelectedPlan(plan)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold">
                                  {language === 'fa' ? plan.name_fa : plan.name_en}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {plan.price_per_gb.toLocaleString()} {language === 'fa' ? 'تومان/گیگ' : 'Toman/GB'}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline">
                                  {plan.default_data_limit_gb}GB / {plan.default_duration_days} {language === 'fa' ? 'روز' : 'days'}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {selectedPlan && (
                  <>
                    {/* Preset Extension Options */}
                    <div className="space-y-4">
                      <Label>{language === 'fa' ? 'گزینه‌های تمدید سریع' : 'Quick Extension Options'}</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{language === 'fa' ? 'افزایش زمان' : 'Extend Time'}</Label>
                          <Select value={extensionDays} onValueChange={setExtensionDays}>
                            <SelectTrigger>
                              <SelectValue placeholder={language === 'fa' ? 'انتخاب کنید' : 'Select'} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="7">{language === 'fa' ? '۷ روز' : '7 days'}</SelectItem>
                              <SelectItem value="30">{language === 'fa' ? '۳۰ روز' : '30 days'}</SelectItem>
                              <SelectItem value="90">{language === 'fa' ? '۹۰ روز' : '90 days'}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>{language === 'fa' ? 'افزایش حجم' : 'Add Data'}</Label>
                          <Select value={additionalData} onValueChange={setAdditionalData}>
                            <SelectTrigger>
                              <SelectValue placeholder={language === 'fa' ? 'انتخاب کنید' : 'Select'} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">{language === 'fa' ? '۵ گیگابایت' : '5 GB'}</SelectItem>
                              <SelectItem value="10">{language === 'fa' ? '۱۰ گیگابایت' : '10 GB'}</SelectItem>
                              <SelectItem value="25">{language === 'fa' ? '۲۵ گیگابایت' : '25 GB'}</SelectItem>
                              <SelectItem value="50">{language === 'fa' ? '۵۰ گیگابایت' : '50 GB'}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Custom Options */}
                    <div className="space-y-4">
                      <Label>{language === 'fa' ? 'گزینه‌های سفارشی' : 'Custom Options'}</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{language === 'fa' ? 'حجم سفارشی (گیگابایت)' : 'Custom Data (GB)'}</Label>
                          <Input
                            type="number"
                            value={customData}
                            onChange={(e) => setCustomData(e.target.value)}
                            placeholder={language === 'fa' ? 'مثال: 15' : 'e.g., 15'}
                            min="1"
                            max="1000"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>{language === 'fa' ? 'مدت زمان سفارشی (روز)' : 'Custom Duration (days)'}</Label>
                          <Input
                            type="number"
                            value={customDuration}
                            onChange={(e) => setCustomDuration(e.target.value)}
                            placeholder={language === 'fa' ? 'مثال: 45' : 'e.g., 45'}
                            min="1"
                            max="365"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Price Preview */}
                    <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{language === 'fa' ? 'قیمت کل:' : 'Total Price:'}</span>
                          <span className="text-xl font-bold text-blue-600">
                            {calculateTotalPrice().toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        onClick={() => setStep(1)}
                        className="flex-1"
                      >
                        {language === 'fa' ? 'بازگشت' : 'Back'}
                      </Button>
                      <Button 
                        onClick={handleProceedToPayment}
                        className="flex-1"
                      >
                        {language === 'fa' ? 'ادامه به پرداخت' : 'Proceed to Payment'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 3 && selectedPlan && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <CreditCard className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    {language === 'fa' ? 'پرداخت' : 'Payment'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {language === 'fa' ? 
                      'برای تکمیل تمدید، پرداخت را انجام دهید' : 
                      'Complete payment to finalize your renewal'
                    }
                  </p>
                </div>

                {/* Payment Summary */}
                <Card className="bg-gray-50 dark:bg-gray-800">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between">
                      <span>{language === 'fa' ? 'حساب کاربری:' : 'Account:'}</span>
                      <span className="font-medium">{accountInfo?.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{language === 'fa' ? 'پلن:' : 'Plan:'}</span>
                      <span className="font-medium">{language === 'fa' ? selectedPlan.name_fa : selectedPlan.name_en}</span>
                    </div>
                    {extensionDays && (
                      <div className="flex justify-between">
                        <span>{language === 'fa' ? 'افزایش زمان:' : 'Time Extension:'}</span>
                        <span>{extensionDays} {language === 'fa' ? 'روز' : 'days'}</span>
                      </div>
                    )}
                    {additionalData && (
                      <div className="flex justify-between">
                        <span>{language === 'fa' ? 'افزایش حجم:' : 'Data Addition:'}</span>
                        <span>{additionalData} GB</span>
                      </div>
                    )}
                    {customData && (
                      <div className="flex justify-between">
                        <span>{language === 'fa' ? 'حجم سفارشی:' : 'Custom Data:'}</span>
                        <span>{customData} GB</span>
                      </div>
                    )}
                    <div className="border-t pt-3 flex justify-between text-lg font-bold">
                      <span>{language === 'fa' ? 'مجموع:' : 'Total:'}</span>
                      <span>{totalPrice.toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Zarinpal Payment */}
                <ZarinpalPayment
                  amount={totalPrice}
                  mobile={accountInfo?.username || ''}
                  onPaymentStart={() => {}}
                  isSubmitting={isCreatingSubscription}
                />

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep(2)}
                    className="flex-1"
                    disabled={isCreatingSubscription}
                  >
                    {language === 'fa' ? 'بازگشت' : 'Back'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </OfflineProtection>
  );
};

export default StepByStepRenewalForm;
