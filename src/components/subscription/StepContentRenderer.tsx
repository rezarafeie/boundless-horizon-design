
import PlanSelector from '@/components/PlanSelector';
import UserInfoStep from '@/components/UserInfoStep';
import PaymentStep from '@/components/PaymentStep';
import SubscriptionSuccess from '@/components/SubscriptionSuccess';
import { FormData, SubscriptionResponse, StepNumber } from './types';
import { DiscountCode, SubscriptionPlan } from '@/types/subscription';

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
  switch (currentStep) {
    case 1:
      return (
        <div className="space-y-6">
          <PlanSelector
            selectedPlan={formData.selectedPlan}
            onPlanSelect={(plan: SubscriptionPlan) => onUpdateFormData('selectedPlan', plan)}
            dataLimit={formData.dataLimit}
          />
        </div>
      );
    case 2:
      return (
        <UserInfoStep
          formData={formData}
          onUpdate={onUpdateFormData}
          appliedDiscount={appliedDiscount}
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
        <SubscriptionSuccess result={result} />
      ) : null;
    default:
      return null;
  }
};

export default StepContentRenderer;
