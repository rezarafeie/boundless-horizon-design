
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== ZARINPAL VERIFY FUNCTION STARTED ===');
    
    const { merchant_id, authority, amount } = await req.json();
    console.log('Verify request received:', { merchant_id, authority, amount });

    if (!merchant_id || !authority || !amount) {
      throw new Error('Merchant ID, authority, and amount are required');
    }

    // Get Zarinpal merchant ID from environment if not provided
    const merchantIdToUse = merchant_id || Deno.env.get('ZARINPAL_MERCHANT_ID');
    if (!merchantIdToUse) {
      console.error('ZARINPAL_MERCHANT_ID not configured');
      throw new Error('Zarinpal merchant ID not configured');
    }

    console.log('Sending verification request to Zarinpal...');

    // Create verification request to Zarinpal
    const zarinpalRequest = {
      merchant_id: merchantIdToUse,
      authority: authority,
      amount: amount // Amount should already be in Rial
    };

    console.log('Sending request to Zarinpal:', zarinpalRequest);

    const response = await fetch('https://api.zarinpal.com/pg/v4/payment/verify.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(zarinpalRequest)
    });

    console.log('Zarinpal verification response status:', response.status);

    const responseText = await response.text();
    console.log('Zarinpal verification raw response:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid response from Zarinpal',
        details: {
          status: response.status,
          rawResponse: responseText.substring(0, 500),
          parseError: parseError.message
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 502,
      });
    }

    if (response.ok && responseData.data) {
      console.log('Payment verification successful:', responseData);

      return new Response(JSON.stringify({ 
        success: true, 
        data: responseData,
        verified: responseData.data.code === 100
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.error('Zarinpal verification error:', responseData);
      return new Response(JSON.stringify({
        success: false,
        error: responseData.errors?.join(', ') || 'Payment verification failed',
        details: responseData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      });
    }

  } catch (error) {
    console.error('Zarinpal verification error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
