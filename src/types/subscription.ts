
export interface SubscriptionPlan {
  id: 'lite' | 'pro';
  name: string;
  description: string;
  price: number; // Added missing price property
  pricePerGB: number;
  apiType: 'marzban' | 'marzneshin';
  durationDays?: number;
}

export interface DiscountCode {
  code: string;
  type: 'percentage' | 'fixed'; // Added type property
  value: number; // Changed from percentage to value
  description: string;
}

export interface MarzneshinInbound {
  id: number;
  tag: string;
  protocol: string;
  network: string;
  tls: string;
  port: number;
}

export interface MarzneshinService {
  id: number;
  name: string;
  inbound_ids: number[];
  user_ids?: number[];
  created_at?: string;
  updated_at?: string;
}

export interface MarzneshinServicesResponse {
  items: MarzneshinService[];
  total: number;
  page: number;
  size: number;
  pages: number;
  links: any;
}

export interface MarzneshinServiceRequest {
  name: string;
  inbound_ids: number[];
}

export interface MarzneshinUserRequest {
  username: string;
  expire_strategy: string;
  expire_after?: number;
  usage_duration: number;
  data_limit: number;
  service_ids: number[];
  note: string;
  data_limit_reset_strategy?: string;
}

export interface MarzneshinUserResponse {
  username: string;
  subscription_url: string;
  expire: number;
  data_limit: number;
  usage_duration: number;
  service_ids: number[];
}
