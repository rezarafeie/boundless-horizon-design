
export interface SubscriptionPlan {
  id: string;
  plan_id: string;
  name: string;
  name_en?: string;
  name_fa?: string;
  description: string;
  description_en?: string;
  description_fa?: string;
  pricePerGB: number;
  price_per_gb?: number;
  apiType: 'marzban' | 'marzneshin';
  api_type?: 'marzban' | 'marzneshin';
  durationDays?: number;
  default_duration_days?: number;
  default_data_limit_gb?: number;
  available_countries?: Array<{
    code: string;
    name: string;
    flag: string;
  }>;
}

export interface DiscountCode {
  code: string;
  percentage: number;
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
