import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { User, Zap } from 'lucide-react';
import { SubscriptionPlan, DiscountCode } from '@/types/subscription';

interface FormData {
  username: string;
  dataLimit: number;
  duration: number;
  notes: string;
  mobile: string;
  email: string;
  selectedPlan: SubscriptionPlan | null;
}

interface UserInfoStepProps {
  formData: FormData;
  onUpdate: (field: keyof FormData, value: any) => void;
  appliedDiscount: DiscountCode | null;
}

const UserInfoStep = ({ formData, onUpdate, appliedDiscount }: UserInfoStepProps) => {
  const { language } = useLanguage();

  console.log('UserInfoStep - Rendering with formData:', formData);

  const generateUsername = () => {
    const planId = formData.selectedPlan?.plan_id || 'default';
    const timestamp = Math.floor(Math.random() * 10000);
    return `bnets_${planId}_${timestamp}`;
  };

  const autoGenerateUsername = () => {
    const generated = generateUsername();
    onUpdate('username', generated);
  };

  const calculatePrice = () => {
    if (!formData.selectedPlan) {
      console.warn('UserInfoStep - No plan selected for price calculation');
      return 0;
    }
    
    // Use both possible price field names for compatibility - prioritize new format
    const pricePerGB = formData.selectedPlan.price_per_gb || formData.selectedPlan.pricePerGB || 0;
    console.log('UserInfoStep - Price per GB:', pricePerGB, 'Data limit:', formData.dataLimit);
    
    const basePrice = formData.dataLimit * pricePerGB;
    
    if (appliedDiscount) {
      const discountAmount = (basePrice * appliedDiscount.percentage) / 100;
      const finalPrice = Math.max(0, basePrice - discountAmount);
      console.log('UserInfoStep - Price calculation with discount:', {
        basePrice,
        discountPercentage: appliedDiscount.percentage,
        discountAmount,
        finalPrice
      });
      return finalPrice;
    }
    
    console.log('UserInfoStep - Price calculation without discount:', basePrice);
    return basePrice;
  };

  const calculateDiscount = () => {
    if (!formData.selectedPlan || !appliedDiscount) return 0;
    const pricePerGB = formData.selectedPlan.price_per_gb || formData.selectedPlan.pricePerGB || 0;
    const basePrice = formData.dataLimit * pricePerGB;
    return (basePrice * appliedDiscount.percentage) / 100;
  };

  if (!formData.selectedPlan) {
    console.error('UserInfoStep - No plan selected, cannot render step');
    return (
      <div className="text-center py-8">
        <p className="text-red-500">
          {language === 'fa' ? 'خطا: هیچ پلنی انتخاب نشده است' : 'Error: No plan selected'}
        </p>
      </div>
    );
  }

  const currentPrice = calculatePrice();
  const pricePerGB = formData.selectedPlan.price_per_gb || formData.selectedPlan.pricePerGB || 0;

  return (
    <div className="space-y-6">
      {/* User Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          {language === 'fa' ? 'اطلاعات کاربری' : 'User Information'}
        </h3>
        
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">
                {language === 'fa' ? 'نام کاربری' : 'Username'} *
              </Label>
              <div className="flex gap-2">
                <Input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => onUpdate('username', e.target.value.toLowerCase())}
                  placeholder={language === 'fa' ? 'نام کاربری (a-z, 0-9, _)' : 'Username (a-z, 0-9, _)'}
                  className="flex-1"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={autoGenerateUsername}
                >
                  {language === 'fa' ? 'تولید' : 'Generate'}
                </Button>
              </div>
            </div>
          </div>
      </div>

      {/* Subscription Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          {language === 'fa' ? 'پیکربندی اشتراک' : 'Subscription Configuration'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dataLimit">
              {language === 'fa' ? 'حجم داده (گیگابایت)' : 'Data Volume (GB)'} *
            </Label>
            <Input
              id="dataLimit"
              type="number"
              min="1"
              max="500"
              value={formData.dataLimit}
              onChange={(e) => onUpdate('dataLimit', parseInt(e.target.value) || 0)}
              placeholder={language === 'fa' ? '۱۰' : '10'}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">
              {language === 'fa' ? 'مدت زمان (روز)' : 'Duration (Days)'} *
            </Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="180"
              value={formData.duration}
              onChange={(e) => onUpdate('duration', parseInt(e.target.value) || 0)}
              placeholder={language === 'fa' ? '۳۰' : '30'}
              required
            />
          </div>
        </div>

        {/* Price Calculation */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                  {language === 'fa' ? 'محاسبه قیمت' : 'Price Calculation'}
                </h4>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  {language === 'fa' ? 
                    `${formData.dataLimit} گیگابایت × ${pricePerGB.toLocaleString()} تومان` : 
                    `${formData.dataLimit} GB × ${pricePerGB.toLocaleString()} Toman`
                  }
                </p>
              </div>
              <div className="text-right">
                {appliedDiscount && (
                  <div className="text-sm text-blue-600 dark:text-blue-400 line-through">
                    {(formData.dataLimit * pricePerGB).toLocaleString()}
                    {language === 'fa' ? ' تومان' : ' Toman'}
                  </div>
                )}
                <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  {currentPrice.toLocaleString()} 
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

        {/* Plan Info */}
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div className="space-y-2">
            <h4 className="font-medium text-green-800 dark:text-green-200">
              {language === 'fa' ? 
                formData.selectedPlan.name_fa || formData.selectedPlan.name : 
                formData.selectedPlan.name_en || formData.selectedPlan.name
              }
            </h4>
            <p className="text-sm text-green-600 dark:text-green-400">
              {language === 'fa' ? 
                formData.selectedPlan.description_fa || formData.selectedPlan.description : 
                formData.selectedPlan.description_en || formData.selectedPlan.description
              }
            </p>
            {currentPrice === 0 && (
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                {language === 'fa' ? 
                  '🎉 این اشتراک رایگان است!' : 
                  '🎉 This subscription is free!'
                }
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInfoStep;
