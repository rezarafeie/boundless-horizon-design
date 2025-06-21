
import PlanSelector from '@/components/PlanSelector';
import UserInfoStep from '@/components/UserInfoStep';
import PaymentStep from '@/components/PaymentStep';
import SubscriptionSuccess from '@/components/SubscriptionSuccess';
import { FormData, SubscriptionResponse, StepNumber } from './types';
import { DiscountCode } from '@/types/subscription';
import { PlanWithPanels } from '@/services/planService';

interface StepContentRendererProps {
  currentStep: StepNumber;
  formData: FormData;
  appliedDiscount: DiscountCode | null;
  result: SubscriptionResponse | null;
  subscriptionId: string;
  calculateTotalPrice: () => number;
  onUpdateFormData: (field: keyof FormData, value: any) => void;
  onPaymentSuccess: (subscriptionUrl?: string) => void;
  onPrevious: () => void;
}

const StepContentRenderer = ({
  currentStep,
  formData,
  appliedDiscount,
  result,
  subscriptionId,
  calculateTotalPrice,
  onUpdateFormData,
  onPaymentSuccess,
  onPrevious
}: StepContentRendererProps) => {
  console.log('StepContentRenderer - Current step:', currentStep);
  console.log('StepContentRenderer - Form data:', formData);
  console.log('StepContentRenderer - Subscription ID:', subscriptionId);
  
  switch (currentStep) {
    case 1:
      return (
        <PlanSelector
          selectedPlan={formData.selectedPlan?.id || formData.selectedPlan?.plan_id || ''}
          onPlanSelect={(plan: any) => {
            console.log('StepContentRenderer - Plan selected:', plan);
            // Convert the plan to PlanWithPanels format if needed
            onUpdateFormData('selectedPlan', plan);
          }}
          dataLimit={formData.dataLimit}
        />
      );

    case 2:
      console.log('StepContentRenderer - Rendering UserInfoStep with formData:', formData);
      return (
        <UserInfoStep
          formData={formData}
          appliedDiscount={appliedDiscount}
          onUpdate={onUpdateFormData}
        />
      );

    case 3:
      if (!subscriptionId) {
        console.error('StepContentRenderer - No subscription ID for payment step');
        return (
          <div className="text-center py-8">
            <p className="text-red-600">خطا در ایجاد سفارش. لطفاً دوباره تلاش کنید.</p>
          </div>
        );
      }
      return (
        <PaymentStep
          amount={calculateTotalPrice()}
          subscriptionId={subscriptionId}
          onSuccess={onPaymentSuccess}
          onBack={onPrevious}
        />
      );

    case 4:
      return result ? (
        <SubscriptionSuccess 
          result={result} 
          subscriptionId={subscriptionId}
        />
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600">در حال بارگذاری...</p>
        </div>
      );

    default:
      console.warn('StepContentRenderer - Unknown step:', currentStep);
      return (
        <div className="text-center py-8">
          <p className="text-red-600">خطای نامشخص در سیستم</p>
        </div>
      );
  }
};

export default StepContentRenderer;
