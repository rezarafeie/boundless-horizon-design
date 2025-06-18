
import { supabase } from '@/integrations/supabase/client';

interface PaymentRequestParams {
  amount: number;
  description: string;
  callback_url: string;
  mobile?: string;
  email?: string;
}

interface PaymentRequestResponse {
  success: boolean;
  authority?: string;
  gateway_url?: string;
  error?: string;
  details?: any;
}

export const createZarinpalPaymentRequest = async (
  params: PaymentRequestParams
): Promise<PaymentRequestResponse> => {
  try {
    console.log('Creating Zarinpal payment request:', {
      amount: params.amount,
      description: params.description.substring(0, 50),
      callback_url: params.callback_url,
      mobile: params.mobile || 'not provided'
    });

    const { data, error } = await supabase.functions.invoke('zarinpal-payment-request', {
      body: {
        merchant_id: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX', // This should come from environment
        amount: params.amount,
        description: params.description,
        callback_url: params.callback_url,
        mobile: params.mobile,
        email: params.email
      }
    });

    if (error) {
      console.error('Payment request function error:', error);
      return {
        success: false,
        error: error.message || 'Function invocation failed',
        details: error
      };
    }

    return data;
  } catch (error) {
    console.error('Payment request error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
};

interface VerifyPaymentParams {
  authority: string;
}

interface VerifyPaymentResponse {
  success: boolean;
  reference_id?: string;
  amount?: number;
  error?: string;
  details?: any;
}

export const verifyZarinpalPayment = async (
  params: VerifyPaymentParams
): Promise<VerifyPaymentResponse> => {
  try {
    console.log('Verifying Zarinpal payment:', {
      authority: params.authority.substring(0, 20) + '...'
    });

    const { data, error } = await supabase.functions.invoke('zarinpal-verify', {
      body: {
        merchant_id: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX', // This should come from environment
        authority: params.authority
      }
    });

    if (error) {
      console.error('Payment verification function error:', error);
      return {
        success: false,
        error: error.message || 'Function invocation failed',
        details: error
      };
    }

    return data;
  } catch (error) {
    console.error('Payment verification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
};
