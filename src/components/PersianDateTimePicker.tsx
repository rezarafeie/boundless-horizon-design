
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';

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

  // Convert Persian date input to ISO format for storage
  const handlePersianDateChange = (persianDate: string) => {
    // For now, we'll use the standard datetime-local but with better Persian formatting
    // This can be enhanced with a proper Persian calendar library later
    onChange(persianDate);
  };

  // Format for display in Persian
  const formatPersianDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return '';
    
    try {
      const date = new Date(dateTimeString);
      if (language === 'fa') {
        return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
          year: 'numeric',
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          numberingSystem: 'latn'
        }).format(date);
      }
      return date.toLocaleString();
    } catch (error) {
      return dateTimeString;
    }
  };

  return (
    <div>
      <Label htmlFor="persian-datetime" className="text-sm font-medium">
        {label} {required && '*'}
      </Label>
      <div className="relative mt-1">
        <Input
          id="persian-datetime"
          type="datetime-local"
          value={value}
          onChange={(e) => handlePersianDateChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
          required={required}
        />
        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      </div>
      {value && language === 'fa' && (
        <p className="text-xs text-muted-foreground mt-1">
          تاریخ شمسی: {formatPersianDateTime(value)}
        </p>
      )}
    </div>
  );
};
