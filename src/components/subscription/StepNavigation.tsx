
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { StepNumber } from './types';

interface StepNavigationProps {
  currentStep: StepNumber;
  canProceed: boolean;
  isCreatingSubscription: boolean;
  onNext: () => void;
  onPrevious: () => void;
}

const StepNavigation = ({ 
  currentStep, 
  canProceed, 
  isCreatingSubscription, 
  onNext, 
  onPrevious 
}: StepNavigationProps) => {
  const { language } = useLanguage();

  // Only show navigation buttons for steps 2 and 3
  if (currentStep !== 2 && currentStep !== 3) {
    return null;
  }

  // Check if we're on the first step (should be step 1, but since we only show on step 2, this is always false)
  const isFirstStep = false;

  return (
    <div className="flex justify-between items-center pt-8 border-t border-gray-200 dark:border-gray-700">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={isFirstStep}
        className="flex items-center gap-2"
      >
        <ChevronLeft className="w-4 h-4" />
        {language === 'fa' ? 'قبلی' : 'Previous'}
      </Button>

      <Button
        variant="hero-primary"
        onClick={onNext}
        disabled={!canProceed || isCreatingSubscription}
        className="flex items-center gap-2 w-full max-w-xs"
      >
        {isCreatingSubscription ? (
          language === 'fa' ? 'در حال ایجاد سفارش...' : 'Creating Order...'
        ) : (
          <>
            {language === 'fa' ? 'بعدی' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </Button>
    </div>
  );
};

export default StepNavigation;
