
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
        formData={formData}
        onFormDataChange={onUpdateFormData}
      />
    </div>
  );
};

export default UserDetailsForm;
