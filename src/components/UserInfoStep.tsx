
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { User, Smartphone, Database, Calendar, FileText } from 'lucide-react';
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

const UserInfoStep: React.FC<UserInfoStepProps> = ({ formData, onUpdate, appliedDiscount }) => {
  const { language } = useLanguage();

  const calculatePrice = () => {
    if (!formData.selectedPlan) return 0;
    
    let basePrice = formData.selectedPlan.price;
    if (appliedDiscount) {
      if (appliedDiscount.type === 'percentage') {
        basePrice = basePrice * (1 - appliedDiscount.value / 100);
      } else {
        basePrice = Math.max(0, basePrice - appliedDiscount.value);
      }
    }
    return basePrice;
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-blue-100 dark:border-blue-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            {language === 'fa' ? 'اطلاعات کاربری' : 'User Information'}
          </CardTitle>
          <CardDescription>
            {language === 'fa' ? 
              'لطفاً اطلاعات مورد نیاز برای ایجاد اشتراک را وارد کنید' : 
              'Please enter the required information to create your subscription'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {language === 'fa' ? 'نام کاربری' : 'Username'}
              </Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => onUpdate('username', e.target.value)}
                placeholder={language === 'fa' ? 'نام کاربری دلخواه' : 'Your desired username'}
                className="text-left"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile" className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                {language === 'fa' ? 'شماره موبایل' : 'Mobile Number'}
              </Label>
              <Input
                id="mobile"
                type="tel"
                value={formData.mobile}
                onChange={(e) => onUpdate('mobile', e.target.value)}
                placeholder={language === 'fa' ? '+98...' : '+98...'}
                className="text-left"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataLimit" className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                {language === 'fa' ? 'حجم داده (گیگابایت)' : 'Data Limit (GB)'}
              </Label>
              <Input
                id="dataLimit"
                type="number"
                min="1"
                max="1000"
                value={formData.dataLimit}
                onChange={(e) => onUpdate('dataLimit', parseInt(e.target.value) || 10)}
                className="text-left"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {language === 'fa' ? 'مدت زمان (روز)' : 'Duration (Days)'}
              </Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="365"
                value={formData.duration}
                onChange={(e) => onUpdate('duration', parseInt(e.target.value) || 30)}
                className="text-left"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {language === 'fa' ? 'یادداشت (اختیاری)' : 'Notes (Optional)'}
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => onUpdate('notes', e.target.value)}
              placeholder={language === 'fa' ? 'یادداشت یا توضیحات اضافی' : 'Additional notes or comments'}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      {formData.selectedPlan && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-green-800 dark:text-green-200">
              {language === 'fa' ? 'خلاصه سفارش' : 'Order Summary'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>{language === 'fa' ? 'پلن انتخابی:' : 'Selected Plan:'}</span>
                <Badge variant="secondary">{formData.selectedPlan.name}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>{language === 'fa' ? 'حجم داده:' : 'Data Limit:'}</span>
                <span className="font-medium">{formData.dataLimit} GB</span>
              </div>
              <div className="flex justify-between items-center">
                <span>{language === 'fa' ? 'مدت زمان:' : 'Duration:'}</span>
                <span className="font-medium">{formData.duration} {language === 'fa' ? 'روز' : 'days'}</span>
              </div>
              {appliedDiscount && (
                <div className="flex justify-between items-center text-green-600">
                  <span>{language === 'fa' ? 'تخفیف:' : 'Discount:'}</span>
                  <span className="font-medium">
                    {appliedDiscount.type === 'percentage' 
                      ? `${appliedDiscount.value}%` 
                      : `${appliedDiscount.value.toLocaleString()} ${language === 'fa' ? 'تومان' : 'Toman'}`
                    }
                  </span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between items-center text-lg font-bold">
                <span>{language === 'fa' ? 'قیمت نهایی:' : 'Final Price:'}</span>
                <span className="text-green-600">
                  {calculatePrice().toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserInfoStep;
