
import { supabase } from '@/integrations/supabase/client';

interface ZarinpalPaymentRequest {
  amount: number;
  mobile: string;
  callback_url: string;
  description?: string;
}

interface ZarinpalPaymentResponse {
  success: boolean;
  authority?: string;
  gateway_url?: string;
  error?: string;
  details?: any;
}

export const createZarinpalPayment = async (
  params: ZarinpalPaymentRequest
): Promise<ZarinpalPaymentResponse> => {
  try {
    console.log('Creating Zarinpal payment:', {
      amount: params.amount,
      mobile: params.mobile,
      callback_url: params.callback_url,
      description: params.description
    });

    const { data, error } = await supabase.functions.invoke('zarinpal-payment', {
      body: {
        amount: params.amount,
        mobile: params.mobile,
        callback_url: params.callback_url,
        description: params.description || 'VPN Subscription Payment'
      }
    });

    if (error) {
      console.error('Zarinpal payment function error:', error);
      return {
        success: false,
        error: error.message || 'Function invocation failed',
        details: error
      };
    }

    console.log('Zarinpal payment response:', data);
    return data;
  } catch (error) {
    console.error('Zarinpal payment request error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
};
