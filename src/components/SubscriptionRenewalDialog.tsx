
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Search, Calendar, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionRenewalDialogProps {
  children: React.ReactNode;
}

interface AccountInfo {
  username: string;
  planType: 'lite' | 'pro';
  expiryDate: string;
  remainingData: string;
  status: 'active' | 'expired';
}

const SubscriptionRenewalDialog = ({ children }: SubscriptionRenewalDialogProps) => {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [extensionDays, setExtensionDays] = useState('');
  const [additionalData, setAdditionalData] = useState('');

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

  const handleRenewal = async () => {
    if (!extensionDays && !additionalData) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'لطفاً حداقل یکی از گزینه‌های تمدید را انتخاب کنید' : 'Please select at least one renewal option',
        variant: 'destructive'
      });
      return;
    }

    setIsRenewing(true);
    
    try {
      // Mock API call - replace with actual renewal API integration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: language === 'fa' ? 'موفق' : 'Success',
        description: t('subscription.renewal-success'),
      });
      
      setIsOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در تمدید اشتراک' : 'Failed to renew subscription',
        variant: 'destructive'
      });
    } finally {
      setIsRenewing(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setUsername('');
    setAccountInfo(null);
    setExtensionDays('');
    setAdditionalData('');
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-4">
            <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <DialogTitle className="text-center">
            {t('subscription.renew')}
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === 1 
              ? t('subscription.search-username')
              : t('subscription.account-info')
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="username">
                  {t('subscription.username')}
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={language === 'fa' ? 'نام کاربری خود را وارد کنید' : 'Enter your username'}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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
            </>
          )}

          {step === 2 && accountInfo && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    {accountInfo.username}
                    <Badge variant={accountInfo.status === 'active' ? 'default' : 'destructive'}>
                      {accountInfo.status === 'active' 
                        ? (language === 'fa' ? 'فعال' : 'Active')
                        : (language === 'fa' ? 'منقضی' : 'Expired')
                      }
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">{t('subscription.plan-type')}</Label>
                      <p className="font-medium">
                        {accountInfo.planType === 'pro' 
                          ? t('pricing.pro') 
                          : t('pricing.lite')
                        }
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t('subscription.expiry-date')}</Label>
                      <p className="font-medium">{accountInfo.expiryDate}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">{t('subscription.remaining-data')}</Label>
                      <p className="font-medium">{accountInfo.remainingData}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('subscription.extend-time')}</Label>
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
                  <Label>{t('subscription.add-data')}</Label>
                  <Select value={additionalData} onValueChange={setAdditionalData}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'fa' ? 'انتخاب کنید' : 'Select'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">{language === 'fa' ? '۵ گیگابایت' : '5 GB'}</SelectItem>
                      <SelectItem value="10">{language === 'fa' ? '۱۰ گیگابایت' : '10 GB'}</SelectItem>
                      <SelectItem value="50">{language === 'fa' ? '۵۰ گیگابایت' : '50 GB'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  {language === 'fa' ? 'بازگشت' : 'Back'}
                </Button>
                <Button 
                  onClick={handleRenewal}
                  className="flex-1"
                  disabled={isRenewing}
                >
                  {isRenewing ? (
                    <>
                      <RefreshCw className={`w-4 h-4 animate-spin ${language === 'fa' ? 'ml-2' : 'mr-2'}`} />
                      {language === 'fa' ? 'در حال تمدید...' : 'Renewing...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle className={`w-4 h-4 ${language === 'fa' ? 'ml-2' : 'mr-2'}`} />
                      {language === 'fa' ? 'تمدید' : 'Renew'}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionRenewalDialog;
