
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Label } from '@/components/ui/label';
import { PersianCalendar } from './PersianCalendar';

interface PersianDateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  required?: boolean;
}

export const PersianDateTimePicker = ({ 
  value, 
  onChange, 
  label, 
  placeholder, 
  required 
}: PersianDateTimePickerProps) => {
  const { language } = useLanguage();

  return (
    <div>
      <Label htmlFor="persian-datetime" className="text-sm font-medium">
        {label} {required && '*'}
      </Label>
      <div className="mt-1">
        <PersianCalendar
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full"
        />
      </div>
    </div>
  );
};
