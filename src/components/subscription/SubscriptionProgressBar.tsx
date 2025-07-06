
import { useLanguage } from '@/contexts/LanguageContext';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, CreditCard, User, Settings, Package } from 'lucide-react';
import { StepNumber, StepInfo } from './types';

const STEPS: StepInfo[] = [
  { id: 1, name: 'plan', icon: Settings, titleFa: 'انتخاب پلن', titleEn: 'Select Plan' },
  { id: 2, name: 'service', icon: Package, titleFa: 'انتخاب سرویس', titleEn: 'Select Service' },
  { id: 3, name: 'info', icon: User, titleFa: 'اطلاعات کاربری', titleEn: 'User Info' },
  { id: 4, name: 'payment', icon: CreditCard, titleFa: 'پرداخت', titleEn: 'Payment' },
  { id: 5, name: 'success', icon: CheckCircle, titleFa: 'تکمیل', titleEn: 'Complete' },
];

interface SubscriptionProgressBarProps {
  currentStep: StepNumber;
}

const SubscriptionProgressBar = ({ currentStep }: SubscriptionProgressBarProps) => {
  const { language } = useLanguage();
  const progressPercentage = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const isAccessible = currentStep >= step.id;

          return (
            <div key={step.id} className="flex flex-col items-center">
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-300
                ${isCompleted 
                  ? 'bg-green-500 text-white' 
                  : isActive 
                  ? 'bg-blue-500 text-white shadow-lg scale-110' 
                  : isAccessible
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                }
              `}>
                {isCompleted ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <Icon className="w-6 h-6" />
                )}
              </div>
              <span className={`
                text-sm font-medium transition-colors
                ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}
              `}>
                {language === 'fa' ? step.titleFa : step.titleEn}
              </span>
            </div>
          );
        })}
      </div>
      <Progress value={progressPercentage} className="h-2" />
    </div>
  );
};

export default SubscriptionProgressBar;
