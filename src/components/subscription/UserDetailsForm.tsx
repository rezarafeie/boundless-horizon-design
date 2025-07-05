
import React from 'react';
import UserInfoStep from '@/components/UserInfoStep';
import { ServiceSelection } from './ServiceSelection';
import { useLanguage } from '@/contexts/LanguageContext';
import { FormData } from './types';
import { VpnService } from '@/services/vpnServicesService';

interface UserDetailsFormProps {
  formData: FormData;
  onUpdateFormData: (field: keyof FormData, value: any) => void;
}

const UserDetailsForm = ({ formData, onUpdateFormData }: UserDetailsFormProps) => {
  const { language } = useLanguage();

  // Create adapter for UserInfoStep which expects different FormData type
  const adaptedFormData = {
    username: formData.username,
    dataLimit: formData.dataLimit,
    duration: formData.duration,
    notes: formData.notes,
    mobile: formData.mobile,
    email: formData.email, // Add email field
    selectedPlan: formData.selectedPlan ? {
      id: formData.selectedPlan.id,
      plan_id: formData.selectedPlan.plan_id,
      name: formData.selectedPlan.name_en,
      name_en: formData.selectedPlan.name_en,
      name_fa: formData.selectedPlan.name_fa,
      description: formData.selectedPlan.description_en || '',
      description_en: formData.selectedPlan.description_en,
      description_fa: formData.selectedPlan.description_fa,
      pricePerGB: formData.selectedPlan.price_per_gb,
      price_per_gb: formData.selectedPlan.price_per_gb,
      apiType: formData.selectedPlan.api_type,
      api_type: formData.selectedPlan.api_type,
      durationDays: formData.selectedPlan.default_duration_days,
      default_duration_days: formData.selectedPlan.default_duration_days,
      default_data_limit_gb: formData.selectedPlan.default_data_limit_gb,
      available_countries: formData.selectedPlan.available_countries
    } : null
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">
          {language === 'fa' ? 'اطلاعات کاربر' : 'User Details'}
        </h2>
        <p className="text-muted-foreground">
          {language === 'fa' ? 'اطلاعات خود را وارد کنید' : 'Enter your details'}
        </p>
      </div>

      {/* Service Selection */}
      {formData.selectedPlan && (
        <ServiceSelection
          planId={formData.selectedPlan.id}
          selectedService={formData.selectedService}
          onServiceSelect={(service: VpnService | null) => onUpdateFormData('selectedService', service)}
        />
      )}

      {/* Show user info form only if no service is selected or custom mode */}
      {!formData.selectedService && (
        <UserInfoStep
          formData={adaptedFormData as any}
          onUpdate={onUpdateFormData}
          appliedDiscount={null}
        />
      )}

      {/* Show simplified form when service is selected */}
      {formData.selectedService && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <h3 className="text-lg font-semibold">
            {language === 'fa' ? 'تأیید اطلاعات' : 'Confirm Details'}
          </h3>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium">
                {language === 'fa' ? 'نام کاربری:' : 'Username:'}
              </label>
              <p className="text-sm text-muted-foreground">{formData.username}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  {language === 'fa' ? 'حجم:' : 'Data Limit:'}
                </label>
                <p className="text-sm text-muted-foreground">
                  {formData.dataLimit} {language === 'fa' ? 'گیگابایت' : 'GB'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">
                  {language === 'fa' ? 'مدت:' : 'Duration:'}
                </label>
                <p className="text-sm text-muted-foreground">
                  {formData.duration} {language === 'fa' ? 'روز' : 'days'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  {language === 'fa' ? 'شماره موبایل:' : 'Mobile:'}
                </label>
                <input
                  type="tel"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  value={formData.mobile}
                  onChange={(e) => onUpdateFormData('mobile', e.target.value)}
                  placeholder={language === 'fa' ? 'شماره موبایل' : 'Mobile number'}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {language === 'fa' ? 'ایمیل:' : 'Email:'}
                </label>
                <input
                  type="email"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  value={formData.email}
                  onChange={(e) => onUpdateFormData('email', e.target.value)}
                  placeholder={language === 'fa' ? 'آدرس ایمیل' : 'Email address'}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDetailsForm;
