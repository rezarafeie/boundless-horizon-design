import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { FormData } from './types';

interface UserDetailsFormProps {
  formData: FormData;
  onUpdateFormData: (field: keyof FormData, value: any) => void;
}

const UserDetailsForm = ({ formData, onUpdateFormData }: UserDetailsFormProps) => {
  const { language } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">
          {language === 'fa' ? 'اطلاعات کاربری' : 'User Details'}
        </h2>
        <p className="text-muted-foreground">
          {language === 'fa' ? 'اطلاعات تماس خود را وارد کنید' : 'Enter your contact information'}
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          {language === 'fa' ? 'اطلاعات تماس' : 'Contact Information'}
        </h3>
        <div className="text-center text-muted-foreground">
          {language === 'fa' ? 
            'لطفاً اطلاعات سفارش خود را بررسی کنید' : 
            'Please review your order details'
          }
        </div>

        {/* Show summary of selected service or plan */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">
            {language === 'fa' ? 'خلاصه سفارش:' : 'Order Summary:'}
          </h4>
          {formData.selectedService ? (
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>{language === 'fa' ? 'سرویس:' : 'Service:'}</strong> {formData.selectedService.name}</p>
              <p><strong>{language === 'fa' ? 'حجم:' : 'Data:'}</strong> {formData.selectedService.data_limit_gb} GB</p>
              <p><strong>{language === 'fa' ? 'مدت:' : 'Duration:'}</strong> {formData.selectedService.duration_days} {language === 'fa' ? 'روز' : 'days'}</p>
              <p><strong>{language === 'fa' ? 'قیمت:' : 'Price:'}</strong> {formData.selectedService.price_toman.toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}</p>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>{language === 'fa' ? 'پلن:' : 'Plan:'}</strong> {formData.selectedPlan?.name_fa || formData.selectedPlan?.name_en}</p>
              <p><strong>{language === 'fa' ? 'حجم:' : 'Data:'}</strong> {formData.dataLimit} GB</p>
              <p><strong>{language === 'fa' ? 'مدت:' : 'Duration:'}</strong> {formData.duration} {language === 'fa' ? 'روز' : 'days'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDetailsForm;