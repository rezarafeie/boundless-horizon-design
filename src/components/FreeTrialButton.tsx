
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { PanelUserCreationService } from '@/services/panelUserCreationService';
import { Loader2, Zap } from 'lucide-react';

interface FreeTrialButtonProps {
  planType: 'lite' | 'plus';
  onSuccess?: (result: any) => void;
}

const FreeTrialButton = ({ planType, onSuccess }: FreeTrialButtonProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const handleFreeTrial = async () => {
    setIsCreating(true);
    
    try {
      console.log('FREE_TRIAL: Starting unified free trial creation for plan:', planType);
      
      // Generate unique username
      const username = `trial_${planType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Use unified creation service that fetches reza config and creates user
      const result = await PanelUserCreationService.createFreeTrial(
        username,
        planType, // This maps to 'lite' or 'plus' plan
        planType === 'lite' ? 1 : 5, // 1GB for lite, 5GB for plus
        planType === 'lite' ? 1 : 3   // 1 day for lite, 3 days for plus
      );

      console.log('FREE_TRIAL: Unified creation result:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create free trial');
      }

      toast({
        title: language === 'fa' ? '🎉 تست رایگان آماده است!' : '🎉 Free Trial Ready!',
        description: language === 'fa' ? 
          `تست رایگان ${planType === 'lite' ? 'لایت' : 'پلاس'} شما ایجاد شد` : 
          `Your ${planType === 'lite' ? 'Lite' : 'Plus'} free trial has been created`,
      });

      if (onSuccess && result.data) {
        onSuccess({
          ...result.data,
          planType: planType === 'lite' ? 'Lite' : 'Plus'
        });
      }

    } catch (error) {
      console.error('FREE_TRIAL: Creation failed:', error);
      
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: error instanceof Error ? error.message : 'Failed to create free trial',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button
      onClick={handleFreeTrial}
      disabled={isCreating}
      className={`w-full ${
        planType === 'lite' 
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' 
          : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
      }`}
    >
      {isCreating ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {language === 'fa' ? 'در حال ایجاد...' : 'Creating...'}
        </>
      ) : (
        <>
          <Zap className="w-4 h-4 mr-2" />
          {language === 'fa' ? 
            `تست رایگان ${planType === 'lite' ? 'لایت' : 'پلاس'}` : 
            `Free ${planType === 'lite' ? 'Lite' : 'Plus'} Trial`
          }
        </>
      )}
    </Button>
  );
};

export default FreeTrialButton;
