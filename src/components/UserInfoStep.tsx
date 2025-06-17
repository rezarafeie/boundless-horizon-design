
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
  selectedPlan: SubscriptionPlan | null;
}

interface UserInfoStepProps {
  formData: FormData;
  onUpdate: (field: keyof FormData, value: any) => void;
  appliedDiscount: DiscountCode | null;
}

const UserInfoStep = ({ formData, onUpdate, appliedDiscount }: UserInfoStepProps) => {
  const { language } = useLanguage();

  const generateUsername = () => {
    const prefix = 'bnets_';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5);
    return `${prefix}${timestamp}_${random}`;
  };

  const autoGenerateUsername = () => {
    const generated = generateUsername();
    onUpdate('username', generated);
  };

  const calculatePrice = () => {
    if (!formData.selectedPlan) return 0;
    const basePrice = formData.dataLimit * formData.selectedPlan.pricePerGB;
    
    if (appliedDiscount) {
      const discountAmount = (basePrice * appliedDiscount.percentage) / 100;
      return Math.max(0, basePrice - discountAmount);
    }
    
    return basePrice;
  };

  const calculateDiscount = () => {
    if (!formData.selectedPlan || !appliedDiscount) return 0;
    const basePrice = formData.dataLimit * formData.selectedPlan.pricePerGB;
    return (basePrice * appliedDiscount.percentage) / 100;
  };

  return (
    <div className="space-y-6">
      {/* User Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          {language === 'fa' ? 'اطلاعات کاربری' : 'User Information'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="space-y-2">
            <Label htmlFor="mobile">
              {language === 'fa' ? 'شماره موبایل' : 'Mobile Number'} *
            </Label>
            <Input
              id="mobile"
              type="tel"
              value={formData.mobile}
              onChange={(e) => onUpdate('mobile', e.target.value)}
              placeholder={language === 'fa' ? '09123456789' : '09123456789'}
              required
            />
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
        {formData.selectedPlan && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                    {language === 'fa' ? 'محاسبه قیمت' : 'Price Calculation'}
                  </h4>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    {language === 'fa' ? 
                      `${formData.dataLimit} گیگابایت × ${formData.selectedPlan.pricePerGB.toLocaleString()} تومان` : 
                      `${formData.dataLimit} GB × ${formData.selectedPlan.pricePerGB.toLocaleString()} Toman`
                    }
                  </p>
                </div>
                <div className="text-right">
                  {appliedDiscount && (
                    <div className="text-sm text-blue-600 dark:text-blue-400 line-through">
                      {(formData.dataLimit * formData.selectedPlan.pricePerGB).toLocaleString()}
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

        {/* Plan Info */}
        {formData.selectedPlan && (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400">
              {language === 'fa' ? 
                `${formData.selectedPlan.name} - ${formData.selectedPlan.description}` : 
                `${formData.selectedPlan.name} - ${formData.selectedPlan.description}`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserInfoStep;
