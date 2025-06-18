
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
    console.log('=== ZARINPAL GET SIGNATURE FUNCTION STARTED ===');
    
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
    const { merchant_id, payman_authority } = await req.json();
    console.log('Request data:', { 
      merchant_id: merchant_id ? merchant_id.substring(0, 8) + '...' : 'missing', 
      payman_authority: payman_authority || 'missing'
    });

    // Validate required parameters
    if (!merchant_id || !payman_authority) {
      console.error('Missing required parameters:', { merchant_id: !!merchant_id, payman_authority: !!payman_authority });
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required parameters',
        details: {
          merchant_id: !!merchant_id,
          payman_authority: !!payman_authority
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log('Requesting signature from Zarinpal for authority:', payman_authority);

    // Prepare signature request payload
    const signaturePayload = {
      merchant_id,
      payman_authority
    };

    console.log('Sending signature request to Zarinpal:', {
      merchant_id: merchant_id.substring(0, 8) + '...',
      payman_authority
    });

    // Send request to Zarinpal signature endpoint
    const response = await fetch('https://api.zarinpal.com/pg/v4/payman/verify.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(signaturePayload)
    });

    console.log('Zarinpal signature response status:', response.status);

    // Get raw response text first
    const responseText = await response.text();
    console.log('Zarinpal signature raw response:', responseText.substring(0, 500));

    // Check if response is not 2xx
    if (!response.ok) {
      console.error('Zarinpal signature request failed:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText.substring(0, 500)
      });

      return new Response(JSON.stringify({
        success: false,
        error: `Zarinpal API error: HTTP ${response.status}`,
        details: {
          status: response.status,
          statusText: response.statusText,
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

    console.log('Zarinpal signature parsed response:', responseData);

    // Check for successful signature retrieval
    if (responseData.data && responseData.data.code === 100 && responseData.data.signature) {
      console.log('Signature retrieved successfully:', {
        signatureLength: responseData.data.signature.length,
        payman_authority
      });

      return new Response(JSON.stringify({ 
        success: true, 
        signature: responseData.data.signature,
        payman_authority,
        data: responseData.data
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.error('Signature retrieval failed:', responseData);

      return new Response(JSON.stringify({
        success: false,
        error: responseData.errors?.message || 'Signature retrieval failed',
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
    console.error('💥 CRITICAL ERROR in Zarinpal signature retrieval:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Signature service error',
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
