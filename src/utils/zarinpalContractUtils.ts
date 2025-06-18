
import { supabase } from '@/integrations/supabase/client';

export interface ContractCreationParams {
  mobile: string;
  ssn?: string;
  expire_at: string;
  max_daily_count: number;
  max_monthly_count: number;
  max_amount: number;
  callback_url: string;
}

export interface ContractCreationResponse {
  success: boolean;
  payman_authority?: string;
  error?: string;
  details?: any;
}

export interface SignatureResponse {
  success: boolean;
  signature?: string;
  payman_authority?: string;
  error?: string;
  details?: any;
}

export interface PaymentRequestParams {
  amount: number;
  description: string;
  callback_url: string;
  mobile?: string;
  email?: string;
}

export interface PaymentRequestResponse {
  success: boolean;
  authority?: string;
  gateway_url?: string;
  error?: string;
  details?: any;
}

export interface DirectPaymentParams {
  authority: string;
  signature: string;
  amount: number;
}

export interface DirectPaymentResponse {
  success: boolean;
  reference_id?: number;
  amount?: number;
  error?: string;
  details?: any;
}

// Create a new Zarinpal direct payment contract
export const createZarinpalContract = async (
  params: ContractCreationParams
): Promise<ContractCreationResponse> => {
  try {
    console.log('Creating Zarinpal contract:', params);

    const { data, error } = await supabase.functions.invoke('zarinpal-contract', {
      body: {
        merchant_id: Deno.env.get('ZARINPAL_MERCHANT_ID'),
        ...params
      }
    });

    if (error) {
      console.error('Contract creation function error:', error);
      return {
        success: false,
        error: error.message || 'Function invocation failed',
        details: error
      };
    }

    if (data?.success && data?.data?.payman_authority) {
      // Store contract in database
      const { data: contract, error: dbError } = await supabase
        .from('zarinpal_contracts')
        .insert({
          user_mobile: params.mobile,
          merchant_id: Deno.env.get('ZARINPAL_MERCHANT_ID') || '',
          payman_authority: data.data.payman_authority,
          status: 'pending',
          expire_at: params.expire_at,
          max_daily_count: params.max_daily_count,
          max_monthly_count: params.max_monthly_count,
          max_amount: params.max_amount
        })
        .select()
        .single();

      if (dbError) {
        console.error('Failed to store contract in database:', dbError);
      }

      return {
        success: true,
        payman_authority: data.data.payman_authority
      };
    }

    return data;
  } catch (error) {
    console.error('Contract creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
};

// Get signature for a signed contract
export const getZarinpalSignature = async (
  payman_authority: string
): Promise<SignatureResponse> => {
  try {
    console.log('Getting signature for authority:', payman_authority);

    const { data, error } = await supabase.functions.invoke('zarinpal-get-signature', {
      body: {
        merchant_id: Deno.env.get('ZARINPAL_MERCHANT_ID'),
        payman_authority
      }
    });

    if (error) {
      console.error('Signature retrieval function error:', error);
      return {
        success: false,
        error: error.message || 'Function invocation failed',
        details: error
      };
    }

    if (data?.success && data?.signature) {
      // Update contract with signature
      const { error: updateError } = await supabase
        .from('zarinpal_contracts')
        .update({
          signature: data.signature,
          status: 'active',
          signed_at: new Date().toISOString()
        })
        .eq('payman_authority', payman_authority);

      if (updateError) {
        console.error('Failed to update contract with signature:', updateError);
      }

      return {
        success: true,
        signature: data.signature,
        payman_authority
      };
    }

    return data;
  } catch (error) {
    console.error('Signature retrieval error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
};

// Create a payment request to get authority
export const createPaymentRequest = async (
  params: PaymentRequestParams
): Promise<PaymentRequestResponse> => {
  try {
    console.log('Creating payment request:', params);

    const { data, error } = await supabase.functions.invoke('zarinpal-payment-request', {
      body: {
        merchant_id: Deno.env.get('ZARINPAL_MERCHANT_ID'),
        ...params
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

// Perform direct payment using stored contract
export const performDirectPayment = async (
  params: DirectPaymentParams
): Promise<DirectPaymentResponse> => {
  try {
    console.log('Performing direct payment:', {
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
      console.error('Direct payment function error:', error);
      return {
        success: false,
        error: error.message || 'Function invocation failed',
        details: error
      };
    }

    return data;
  } catch (error) {
    console.error('Direct payment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
};

// Get user's active contracts
export const getUserContracts = async (mobile: string) => {
  try {
    const { data, error } = await supabase
      .from('zarinpal_contracts')
      .select('*')
      .eq('user_mobile', mobile)
      .in('status', ['active', 'pending'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user contracts:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in getUserContracts:', error);
    return { data: null, error };
  }
};

// Cancel a contract
export const cancelZarinpalContract = async (signature: string) => {
  try {
    console.log('Cancelling contract');

    const { data, error } = await supabase.functions.invoke('zarinpal-cancel-contract', {
      body: {
        merchant_id: Deno.env.get('ZARINPAL_MERCHANT_ID'),
        signature
      }
    });

    if (error) {
      console.error('Contract cancellation function error:', error);
      return {
        success: false,
        error: error.message || 'Function invocation failed',
        details: error
      };
    }

    if (data?.success) {
      // Update contract status in database
      const { error: updateError } = await supabase
        .from('zarinpal_contracts')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('signature', signature);

      if (updateError) {
        console.error('Failed to update contract status:', updateError);
      }
    }

    return data;
  } catch (error) {
    console.error('Contract cancellation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
};
