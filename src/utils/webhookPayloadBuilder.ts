// Utility to build standardized webhook payloads with complete subscription data

interface BaseWebhookPayload {
  type: 'new_subscription' | 'new_test_user';
  created_at: string;
}

interface SubscriptionWebhookPayload extends BaseWebhookPayload {
  type: 'new_subscription';
  subscription_id: string;
  username: string;
  mobile?: string;
  email?: string;
  amount?: number;
  payment_method?: string;
  receipt_url?: string;
  approve_link?: string;
  reject_link?: string;
  // Complete subscription data
  subscription_url?: string;
  plan_name?: string;
  plan_id?: string;
  panel_name?: string;
  panel_type?: string;
  panel_url?: string;
  panel_country?: string;
  data_limit_gb?: number;
  duration_days?: number;
  expire_at?: string;
  protocol?: string;
  status?: string;
}

interface TestUserWebhookPayload extends BaseWebhookPayload {
  type: 'new_test_user';
  test_user_id: string;
  username: string;
  email: string;
  mobile: string;
  subscription_url?: string;
  panel_name?: string;
  panel_type?: string;
  panel_url?: string;
  plan_name?: string;
  plan_id?: string;
  data_limit_gb?: number;
  duration_days?: number;
  expire_date?: string;
  is_free_trial: boolean;
}

export type WebhookPayload = SubscriptionWebhookPayload | TestUserWebhookPayload;

export class WebhookPayloadBuilder {
  static buildSubscriptionPayload(data: {
    subscriptionId: string;
    username: string;
    mobile?: string;
    email?: string;
    amount?: number;
    paymentMethod?: string;
    receiptUrl?: string;
    approveLink?: string;
    rejectLink?: string;
    subscriptionUrl?: string;
    planName?: string;
    planId?: string;
    panelName?: string;
    panelType?: string;
    panelUrl?: string;
    panelCountry?: string;
    dataLimitGb?: number;
    durationDays?: number;
    expireAt?: string;
    protocol?: string;
    status?: string;
  }): SubscriptionWebhookPayload {
    return {
      type: 'new_subscription',
      subscription_id: data.subscriptionId,
      username: data.username,
      mobile: data.mobile,
      email: data.email,
      amount: data.amount,
      payment_method: data.paymentMethod,
      receipt_url: data.receiptUrl,
      approve_link: data.approveLink,
      reject_link: data.rejectLink,
      subscription_url: data.subscriptionUrl,
      plan_name: data.planName,
      plan_id: data.planId,
      panel_name: data.panelName,
      panel_type: data.panelType,
      panel_url: data.panelUrl,
      panel_country: data.panelCountry,
      data_limit_gb: data.dataLimitGb,
      duration_days: data.durationDays,
      expire_at: data.expireAt,
      protocol: data.protocol,
      status: data.status,
      created_at: new Date().toISOString()
    };
  }

  static buildTestUserPayload(data: {
    testUserId: string;
    username: string;
    email: string;
    mobile: string;
    subscriptionUrl?: string;
    panelName?: string;
    panelType?: string;
    panelUrl?: string;
    planName?: string;
    planId?: string;
    dataLimitGb?: number;
    durationDays?: number;
    expireDate?: string;
  }): TestUserWebhookPayload {
    return {
      type: 'new_test_user',
      test_user_id: data.testUserId,
      username: data.username,
      email: data.email,
      mobile: data.mobile,
      subscription_url: data.subscriptionUrl,
      panel_name: data.panelName,
      panel_type: data.panelType,
      panel_url: data.panelUrl,
      plan_name: data.planName,
      plan_id: data.planId,
      data_limit_gb: data.dataLimitGb,
      duration_days: data.durationDays,
      expire_date: data.expireDate,
      is_free_trial: true,
      created_at: new Date().toISOString()
    };
  }
}