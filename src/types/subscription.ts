

export interface SubscriptionPlan {
  id: 'lite' | 'pro';
  name: string;
  description: string;
  pricePerGB: number;
  apiType: 'marzban' | 'marzneshin';
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

export interface MarzneshinUserRequest {
  username: string;
  expire_strategy: string;
  usage_duration: number;
  data_limit: number;
  service_ids: number[];
  note: string;
}

export interface MarzneshinUserResponse {
  username: string;
  subscription_url: string;
  expire: number;
  data_limit: number;
  usage_duration: number;
  service_ids: number[];
}

