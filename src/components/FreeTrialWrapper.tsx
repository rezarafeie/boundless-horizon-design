import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Gift } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import FreeTrialDialog from './FreeTrialDialog';
import FreeTrialResult from './FreeTrialResult';

interface FreeTrialWrapperProps {
  className?: string;
  size?: 'sm' | 'lg' | 'xl' | 'default' | 'icon';
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
}

const FreeTrialWrapper: React.FC<FreeTrialWrapperProps> = ({ 
  className = "", 
  size = "xl",
  variant = "default"
}) => {
  const { language } = useLanguage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [trialResult, setTrialResult] = useState<any>(null);

  const handleSuccess = (result: any) => {
    console.log('FREE_TRIAL_WRAPPER: Trial created successfully:', result);
    setTrialResult(result);
    setIsDialogOpen(false);
  };

  // If we have a trial result, show the result component
  if (trialResult) {
    return (
      <div className="space-y-4">
        <FreeTrialResult result={{
          username: trialResult.username,
          subscription_url: trialResult.subscription_url,
          planName: trialResult.panel_name || 'Free Trial',
          apiType: trialResult.panel_type || 'marzban',
          dataLimit: 1, // 1GB for free trial
          duration: 7 // 7 days for free trial
        }} />
        <Button 
          onClick={() => setTrialResult(null)}
          className="w-full"
          variant="outline"
        >
          {language === 'fa' ? 'بستن' : 'Close'}
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button 
        size={size}
        variant={variant}
        className={`w-full group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 font-semibold ${className}`}
        onClick={() => setIsDialogOpen(true)}
      >
        <Gift className={`w-4 h-4 group-hover:rotate-12 transition-transform duration-200 ${language === 'fa' ? 'ml-2' : 'mr-2'}`} />
        {language === 'fa' ? 'دریافت آزمایش رایگان' : 'Get Free Trial'}
      </Button>

      <FreeTrialDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
};

export default FreeTrialWrapper;