
import React from 'react';
import UserInfoStep from '@/components/UserInfoStep';
import { useLanguage } from '@/contexts/LanguageContext';
import { FormData } from './types';

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

      <UserInfoStep
        formData={adaptedFormData as any}
        onUpdate={onUpdateFormData}
        appliedDiscount={null}
      />
    </div>
  );
};

export default UserDetailsForm;
