
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== ZARINPAL DIRECT CHECKOUT FUNCTION STARTED ===');
    
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Method not allowed' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      });
    }

    // Parse request body
    const { authority, signature, amount } = await req.json();
    console.log('Request data:', { authority: authority ? authority.substring(0, 20) + '...' : 'missing', signature: signature ? 'present' : 'missing', amount });

    // Validate required parameters
    if (!authority || !signature) {
      console.error('Missing or invalid payment parameters:', { authority: !!authority, signature: !!signature });
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing or invalid payment parameters',
        details: {
          authority: !!authority,
          signature: !!signature
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Get merchant ID from environment
    const merchantId = Deno.env.get('ZARINPAL_MERCHANT_ID');
    if (!merchantId) {
      console.error('ZARINPAL_MERCHANT_ID not configured');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Payment gateway not configured' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log(`Starting Zarinpal Checkout for amount: ${amount}`);
    console.log('Merchant ID configured:', merchantId.substring(0, 8) + '...');

    // Prepare checkout request payload
    const checkoutPayload = {
      merchant_id: merchantId,
      authority: authority,
      signature: signature
    };

    console.log('Sending checkout request to Zarinpal:', {
      merchant_id: merchantId.substring(0, 8) + '...',
      authority: authority.substring(0, 20) + '...',
      signature: 'present'
    });

    // Send request to Zarinpal direct checkout endpoint
    const response = await fetch('https://api.zarinpal.com/pg/v4/payman/checkout.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(checkoutPayload)
    });

    console.log('Zarinpal checkout response status:', response.status);

    // Get response headers for debugging
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    console.log('Response headers:', responseHeaders);

    // Get raw response text first
    const responseText = await response.text();
    console.log('Zarinpal checkout raw response:', responseText.substring(0, 500));

    // Check if response is not 2xx
    if (!response.ok) {
      console.error('Zarinpal checkout failed:', {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseText.substring(0, 500)
      });

      return new Response(JSON.stringify({
        success: false,
        error: `Zarinpal API error: HTTP ${response.status}`,
        details: {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          rawResponse: responseText.substring(0, 300)
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      });
    }

    // Try to parse JSON response
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Non-JSON response received:', {
        parseError: parseError.message,
        rawResponse: responseText.substring(0, 300)
      });

      return new Response(JSON.stringify({
        success: false,
        error: 'Non-JSON response received',
        details: {
          parseError: parseError.message,
          rawResponse: responseText.substring(0, 300)
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 502,
      });
    }

    console.log('Zarinpal checkout parsed response:', responseData);

    // Check for successful checkout
    if (responseData.data && responseData.data.code === 100) {
      const referenceId = responseData.data.ref_id || responseData.data.reference_id;
      
      console.log('Zarinpal checkout success:', {
        referenceId,
        amount,
        fullResponse: responseData
      });

      return new Response(JSON.stringify({ 
        success: true, 
        reference_id: referenceId,
        amount: amount,
        data: responseData.data
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.error('Zarinpal checkout failed with API error:', responseData);

      return new Response(JSON.stringify({
        success: false,
        error: responseData.errors?.message || 'Checkout failed',
        details: {
          code: responseData.data?.code,
          errors: responseData.errors,
          fullResponse: responseData
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

  } catch (error) {
    console.error('💥 CRITICAL ERROR in Zarinpal direct checkout:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Payment service error',
      details: {
        message: error.message,
        stack: error.stack
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
