
import { DiscountCode } from '@/types/subscription';
import { PlanWithPanels } from '@/services/planService';
import { PaymentMethod } from '@/components/PaymentMethodSelector';

export interface FormData {
  username: string;
  dataLimit: number;
  duration: number;
  notes: string;
  mobile: string;
  selectedPlan: PlanWithPanels | null;
  paymentMethod: PaymentMethod;
}

export interface SubscriptionResponse {
  username: string;
  subscription_url: string;
  expire: number;
  data_limit: number;
}

export type StepNumber = 1 | 2 | 3 | 4;

export interface StepInfo {
  id: StepNumber;
  name: string;
  icon: any;
  titleFa: string;
  titleEn: string;
}
