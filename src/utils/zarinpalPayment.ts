
import { supabase } from '@/integrations/supabase/client';

interface ZarinpalPaymentRequest {
  amount: number;
  mobile: string;
  callback_url: string;
}

interface ZarinpalPaymentResponse {
  success: boolean;
  payman_authority?: string;
  gateway_url?: string;
  error?: string;
  details?: any;
}

export const createZarinpalPayment = async (
  params: ZarinpalPaymentRequest
): Promise<ZarinpalPaymentResponse> => {
  try {
    console.log('Creating Zarinpal Payman payment:', {
      amount: params.amount,
      mobile: params.mobile,
      callback_url: params.callback_url
    });

    const { data, error } = await supabase.functions.invoke('zarinpal-payman', {
      body: {
        amount: params.amount,
        mobile: params.mobile,
        callback_url: params.callback_url
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
