
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { User, Smartphone, Database, Calendar, FileText } from 'lucide-react';
import { SubscriptionPlan } from '@/types/subscription';

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
}

const UserInfoStep: React.FC<UserInfoStepProps> = ({ formData, onUpdate }) => {
  const { language } = useLanguage();

  return (
    <div className="space-y-8">
      <Card className="border-2 border-blue-100 dark:border-blue-900/20 rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <User className="w-6 h-6 text-blue-600" />
            {language === 'fa' ? 'اطلاعات کاربری' : 'User Information'}
          </CardTitle>
          <CardDescription className="text-base">
            {language === 'fa' ? 
              'لطفاً اطلاعات مورد نیاز برای ایجاد اشتراک را وارد کنید' : 
              'Please enter the required information to create your subscription'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="username" className="flex items-center gap-2 text-base font-medium">
                <User className="w-4 h-4" />
                {language === 'fa' ? 'نام کاربری' : 'Username'}
              </Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => onUpdate('username', e.target.value)}
                placeholder={language === 'fa' ? 'نام کاربری دلخواه' : 'Your desired username'}
                className="text-left h-12 text-base"
                required
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="mobile" className="flex items-center gap-2 text-base font-medium">
                <Smartphone className="w-4 h-4" />
                {language === 'fa' ? 'شماره موبایل' : 'Mobile Number'}
              </Label>
              <Input
                id="mobile"
                type="tel"
                value={formData.mobile}
                onChange={(e) => onUpdate('mobile', e.target.value)}
                placeholder={language === 'fa' ? '+98...' : '+98...'}
                className="text-left h-12 text-base"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="dataLimit" className="flex items-center gap-2 text-base font-medium">
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
                className="text-left h-12 text-base"
                required
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="duration" className="flex items-center gap-2 text-base font-medium">
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
                className="text-left h-12 text-base"
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="notes" className="flex items-center gap-2 text-base font-medium">
              <FileText className="w-4 h-4" />
              {language === 'fa' ? 'یادداشت (اختیاری)' : 'Notes (Optional)'}
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => onUpdate('notes', e.target.value)}
              placeholder={language === 'fa' ? 'یادداشت یا توضیحات اضافی' : 'Additional notes or comments'}
              rows={4}
              className="text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      {formData.selectedPlan && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 rounded-xl">
          <CardHeader>
            <CardTitle className="text-green-800 dark:text-green-200 text-xl">
              {language === 'fa' ? 'خلاصه سفارش' : 'Order Summary'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-base">{language === 'fa' ? 'پلن انتخابی:' : 'Selected Plan:'}</span>
                <Badge variant="secondary" className="text-base px-3 py-1">{formData.selectedPlan.name}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-base">{language === 'fa' ? 'حجم داده:' : 'Data Limit:'}</span>
                <span className="font-medium text-base">{formData.dataLimit} GB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-base">{language === 'fa' ? 'مدت زمان:' : 'Duration:'}</span>
                <span className="font-medium text-base">{formData.duration} {language === 'fa' ? 'روز' : 'days'}</span>
              </div>
              <div className="border-t pt-4 flex justify-between items-center text-lg font-bold">
                <span>{language === 'fa' ? 'قیمت پایه:' : 'Base Price:'}</span>
                <span className="text-green-600">
                  {formData.selectedPlan.price.toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}
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
