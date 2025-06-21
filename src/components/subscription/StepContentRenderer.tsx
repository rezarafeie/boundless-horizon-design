
import PlanSelector from '@/components/PlanSelector';
import UserInfoStep from '@/components/UserInfoStep';
import PaymentStep from '@/components/PaymentStep';
import SubscriptionSuccess from '@/components/SubscriptionSuccess';
import { FormData, SubscriptionResponse, StepNumber } from './types';
import { DiscountCode } from '@/types/subscription';

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
  
  switch (currentStep) {
    case 1:
      return (
        <PlanSelector
          selectedPlan={formData.selectedPlan?.id || formData.selectedPlan?.plan_id || ''}
          onPlanSelect={(planId: string) => {
            console.log('Plan selected:', planId);
            // Pass the plan ID to be handled by the parent component
            onUpdateFormData('selectedPlan', { id: planId, plan_id: planId });
          }}
          dataLimit={formData.dataLimit}
        />
      );

    case 2:
      console.log('Rendering UserInfoStep with formData:', formData);
      return (
        <UserInfoStep
          formData={formData}
          appliedDiscount={appliedDiscount}
          onUpdate={onUpdateFormData}
        />
      );

    case 3:
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
      ) : null;

    default:
      console.warn('Unknown step:', currentStep);
      return null;
  }
};

export default StepContentRenderer;
