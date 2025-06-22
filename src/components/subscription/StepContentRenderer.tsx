
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
  console.log('StepContentRenderer - Form data selected plan:', formData.selectedPlan);
  console.log('StepContentRenderer - Subscription ID:', subscriptionId);
  
  switch (currentStep) {
    case 1:
      return (
        <PlanSelector
          selectedPlan={formData.selectedPlan?.id || ''}
          onPlanSelect={(plan: PlanWithPanels) => {
            console.log('StepContentRenderer - Plan selected with STRICT enforcement:', {
              planId: plan.id,
              planName: plan.name_en,
              assignedPanelId: plan.assigned_panel_id,
              hasAssignedPanel: !!plan.assigned_panel_id
            });
            
            // STRICT VALIDATION: Only allow plans with assigned panels
            if (!plan.assigned_panel_id) {
              console.error('StepContentRenderer - REJECTED: Plan has no assigned panel');
              return;
            }
            
            onUpdateFormData('selectedPlan', plan);
          }}
          dataLimit={formData.dataLimit}
        />
      );

    case 2:
      console.log('StepContentRenderer - Rendering UserInfoStep with formData:', formData);
      return (
        <UserInfoStep
          formData={{
            username: formData.username,
            dataLimit: formData.dataLimit,
            duration: formData.duration,
            notes: formData.notes,
            mobile: formData.mobile,
            selectedPlan: formData.selectedPlan ? {
              id: formData.selectedPlan.id,
              plan_id: formData.selectedPlan.plan_id,
              name: formData.selectedPlan.name_en,
              description: formData.selectedPlan.description_en || '',
              pricePerGB: formData.selectedPlan.price_per_gb,
              apiType: formData.selectedPlan.api_type
            } : null
          }}
          appliedDiscount={appliedDiscount}
          onUpdate={(field: string, value: any) => {
            onUpdateFormData(field as keyof FormData, value);
          }}
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
