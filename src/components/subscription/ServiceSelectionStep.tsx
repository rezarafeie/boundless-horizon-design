import React, { useState } from 'react';
import UserInfoStep from '@/components/UserInfoStep';
import { ServiceSelection } from './ServiceSelection';
import { useLanguage } from '@/contexts/LanguageContext';
import { FormData } from './types';
import { VpnService } from '@/services/vpnServicesService';
import { Button } from '@/components/ui/button';

interface ServiceSelectionStepProps {
  formData: FormData;
  onUpdateFormData: (field: keyof FormData, value: any) => void;
}

const ServiceSelectionStep = ({ formData, onUpdateFormData }: ServiceSelectionStepProps) => {
  const { language } = useLanguage();
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Create adapter for UserInfoStep which expects different FormData type
  const adaptedFormData = {
    username: formData.username,
    dataLimit: formData.dataLimit,
    duration: formData.duration,
    notes: formData.notes,
    mobile: formData.mobile,
    email: formData.email,
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
          {language === 'fa' ? 'انتخاب سرویس' : 'Select Service'}
        </h2>
        <p className="text-muted-foreground">
          {language === 'fa' ? 'سرویس مورد نظر خود را انتخاب کنید' : 'Choose your desired service'}
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

      {/* Show custom plan button and form */}
      {!formData.selectedService && !showCustomForm && (
        <div className="text-center py-4">
          <Button 
            variant="outline" 
            onClick={() => setShowCustomForm(true)}
            className="text-primary"
          >
            {language === 'fa' ? 'استفاده از پلن سفارشی' : 'Use Custom Plan'}
          </Button>
        </div>
      )}

      {/* Show user info form only if custom form is requested */}
      {!formData.selectedService && showCustomForm && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {language === 'fa' ? 'پلن سفارشی' : 'Custom Plan'}
            </h3>
            <Button 
              variant="ghost" 
              onClick={() => setShowCustomForm(false)}
              className="text-muted-foreground"
            >
              {language === 'fa' ? 'بستن' : 'Close'}
            </Button>
          </div>
          <UserInfoStep
            formData={adaptedFormData as any}
            onUpdate={onUpdateFormData}
            appliedDiscount={null}
          />
        </div>
      )}

      {/* Show selected service summary */}
      {formData.selectedService && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <h3 className="text-lg font-semibold">
            {language === 'fa' ? 'سرویس انتخابی' : 'Selected Service'}
          </h3>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium">
                {language === 'fa' ? 'نام سرویس:' : 'Service Name:'}
              </label>
              <p className="text-sm text-muted-foreground">{formData.selectedService.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  {language === 'fa' ? 'حجم:' : 'Data Limit:'}
                </label>
                <p className="text-sm text-muted-foreground">
                  {formData.selectedService.data_limit_gb} {language === 'fa' ? 'گیگابایت' : 'GB'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">
                  {language === 'fa' ? 'مدت:' : 'Duration:'}
                </label>
                <p className="text-sm text-muted-foreground">
                  {formData.selectedService.duration_days} {language === 'fa' ? 'روز' : 'days'}
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">
                {language === 'fa' ? 'قیمت:' : 'Price:'}
              </label>
              <p className="text-sm text-muted-foreground">
                {formData.selectedService.price_toman.toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceSelectionStep;