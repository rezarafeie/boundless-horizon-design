
import { SubscriptionPlan, DiscountCode } from '@/types/subscription';

export interface FormData {
  username: string;
  dataLimit: number;
  duration: number;
  notes: string;
  mobile: string;
  selectedPlan: SubscriptionPlan | null;
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
