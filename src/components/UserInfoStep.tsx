
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { User, Phone, FileText } from 'lucide-react';
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
      {/* User Information Card */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">
              {language === 'fa' ? 'اطلاعات کاربری' : 'User Information'}
            </h3>
          </div>

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
                  size="sm"
                >
                  {language === 'fa' ? 'تولید' : 'Generate'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">
                <Phone className="w-4 h-4 inline mr-1" />
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

          <div className="space-y-2 mt-4">
            <Label htmlFor="notes">
              <FileText className="w-4 h-4 inline mr-1" />
              {language === 'fa' ? 'یادداشت (اختیاری)' : 'Notes (Optional)'}
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => onUpdate('notes', e.target.value)}
              placeholder={language === 'fa' ? 'توضیحات اضافی' : 'Additional description'}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Configuration Card */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {language === 'fa' ? 'تنظیمات اشتراک' : 'Subscription Settings'}
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
        </CardContent>
      </Card>

      {/* Price Summary */}
      {formData.selectedPlan && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3">
              {language === 'fa' ? 'خلاصه سفارش' : 'Order Summary'}
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{language === 'fa' ? 'پلن انتخابی:' : 'Selected Plan:'}</span>
                <span className="font-medium">{formData.selectedPlan.name}</span>
              </div>
              <div className="flex justify-between">
                <span>{language === 'fa' ? 'حجم داده:' : 'Data Volume:'}</span>
                <span className="font-medium">{formData.dataLimit} GB</span>
              </div>
              <div className="flex justify-between">
                <span>{language === 'fa' ? 'مدت زمان:' : 'Duration:'}</span>
                <span className="font-medium">{formData.duration} {language === 'fa' ? 'روز' : 'days'}</span>
              </div>
              
              <div className="border-t border-blue-200 dark:border-blue-700 pt-2 mt-2">
                {appliedDiscount && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>{language === 'fa' ? 'تخفیف:' : 'Discount:'}</span>
                    <span>-{calculateDiscount().toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-blue-800 dark:text-blue-200">
                  <span>{language === 'fa' ? 'مجموع:' : 'Total:'}</span>
                  <span>
                    {calculatePrice().toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserInfoStep;
