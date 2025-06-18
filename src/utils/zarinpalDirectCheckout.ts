
import { supabase } from '@/integrations/supabase/client';

interface DirectCheckoutParams {
  authority: string;
  signature: string;
  amount: number;
}

interface DirectCheckoutResponse {
  success: boolean;
  reference_id?: number;
  amount?: number;
  error?: string;
  details?: any;
}

export const performZarinpalDirectCheckout = async (
  params: DirectCheckoutParams
): Promise<DirectCheckoutResponse> => {
  try {
    console.log('Performing Zarinpal direct checkout:', {
      authority: params.authority.substring(0, 20) + '...',
      signature: 'present',
      amount: params.amount
    });

    const { data, error } = await supabase.functions.invoke('zarinpal-checkout', {
      body: {
        authority: params.authority,
        signature: params.signature,
        amount: params.amount
      }
    });

    if (error) {
      console.error('Direct checkout function error:', error);
      return {
        success: false,
        error: error.message || 'Function invocation failed',
        details: error
      };
    }

    return data;
  } catch (error) {
    console.error('Direct checkout error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
};
