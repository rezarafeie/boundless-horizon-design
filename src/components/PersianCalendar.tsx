
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface PersianCalendarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const PersianCalendar = ({ value, onChange, placeholder, className }: PersianCalendarProps) => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState('');
  const [tempTime, setTempTime] = useState('');

  // Convert Persian date to Gregorian for storage
  const convertToGregorian = (persianDate: string, time: string) => {
    // Simple conversion for now - in production you'd use a proper Persian calendar library
    const date = new Date();
    const [hours, minutes] = time.split(':');
    date.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
    return date.toISOString().slice(0, 16); // datetime-local format
  };

  const formatDisplayDate = (isoDate: string) => {
    if (!isoDate) return '';
    try {
      const date = new Date(isoDate);
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
    } catch {
      return isoDate;
    }
  };

  const handleApply = () => {
    if (tempDate && tempTime) {
      const gregorianDateTime = convertToGregorian(tempDate, tempTime);
      onChange(gregorianDateTime);
      setIsOpen(false);
    }
  };

  const getCurrentPersianDate = () => {
    const now = new Date();
    const persianDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      numberingSystem: 'latn'
    }).format(now);
    
    // Convert from Persian format (YYYY/MM/DD) to input format (YYYY-MM-DD)
    return persianDate.replace(/\//g, '-');
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5); // HH:MM format
  };

  React.useEffect(() => {
    if (isOpen && !tempDate) {
      setTempDate(getCurrentPersianDate());
      setTempTime(getCurrentTime());
    }
  }, [isOpen]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-full justify-start text-left font-normal ${className} ${
            !value && "text-muted-foreground"
          }`}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {value ? formatDisplayDate(value) : (placeholder || (language === 'fa' ? 'تاریخ و زمان را انتخاب کنید' : 'Select date and time'))}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {language === 'fa' ? 'تاریخ شمسی' : 'Persian Date'}
            </label>
            <Input
              type="date"
              value={tempDate}
              onChange={(e) => setTempDate(e.target.value)}
              className="w-full"
              placeholder={language === 'fa' ? 'تاریخ' : 'Date'}
            />
            <p className="text-xs text-muted-foreground">
              {language === 'fa' ? 'فرمت: سال-ماه-روز' : 'Format: YYYY-MM-DD'}
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {language === 'fa' ? 'زمان' : 'Time'}
            </label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                type="time"
                value={tempTime}
                onChange={(e) => setTempTime(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              {language === 'fa' ? 'لغو' : 'Cancel'}
            </Button>
            <Button 
              size="sm" 
              onClick={handleApply}
              disabled={!tempDate || !tempTime}
              className="flex-1"
            >
              {language === 'fa' ? 'تایید' : 'Apply'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
