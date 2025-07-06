import { DiscountCode } from '@/types/subscription';
import { PlanWithPanels } from '@/services/planService';
import { VpnService } from '@/services/vpnServicesService';
import { PaymentMethod } from '@/components/PaymentMethodSelector';

export interface FormData {
  username: string;
  dataLimit: number;
  duration: number;
  notes: string;
  mobile: string;
  email: string; // Add email field
  selectedPlan: PlanWithPanels | null;
  selectedService: VpnService | null;
  paymentMethod: 'zarinpal' | 'stripe' | 'crypto' | 'manual';
}

export interface SubscriptionResponse {
  username: string;
  subscription_url: string;
  expire: number;
  data_limit: number;
}

export type StepNumber = 1 | 2 | 3 | 4 | 5;

export interface StepInfo {
  id: StepNumber;
  name: string;
  icon: any;
  titleFa: string;
  titleEn: string;
}
