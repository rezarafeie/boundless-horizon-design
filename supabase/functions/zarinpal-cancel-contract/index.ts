
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
    console.log('=== ZARINPAL CANCEL CONTRACT FUNCTION STARTED ===');
    
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
    const { merchant_id, signature } = await req.json();
    console.log('Request data:', { 
      merchant_id: merchant_id ? merchant_id.substring(0, 8) + '...' : 'missing', 
      signature: signature ? 'present' : 'missing'
    });

    // Validate required parameters
    if (!merchant_id || !signature) {
      console.error('Missing required parameters:', { merchant_id: !!merchant_id, signature: !!signature });
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required parameters',
        details: {
          merchant_id: !!merchant_id,
          signature: !!signature
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log('Cancelling contract with signature');

    // Prepare cancel contract payload
    const cancelPayload = {
      merchant_id,
      signature
    };

    console.log('Sending cancel contract request to Zarinpal');

    // Send request to Zarinpal cancel contract endpoint
    const response = await fetch('https://api.zarinpal.com/pg/v4/payman/cancelContract.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(cancelPayload)
    });

    console.log('Zarinpal cancel contract response status:', response.status);

    // Get raw response text first
    const responseText = await response.text();
    console.log('Zarinpal cancel contract raw response:', responseText.substring(0, 500));

    // Check if response is not 2xx
    if (!response.ok) {
      console.error('Zarinpal cancel contract request failed:', {
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

    console.log('Zarinpal cancel contract parsed response:', responseData);

    // Check for successful contract cancellation
    if (responseData.data && responseData.data.code === 100) {
      console.log('Contract cancelled successfully');

      return new Response(JSON.stringify({ 
        success: true, 
        message: responseData.data.message || 'Contract cancelled successfully',
        data: responseData.data
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.error('Contract cancellation failed:', responseData);

      return new Response(JSON.stringify({
        success: false,
        error: responseData.errors?.message || 'Contract cancellation failed',
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
    console.error('💥 CRITICAL ERROR in Zarinpal contract cancellation:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Contract cancellation service error',
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
