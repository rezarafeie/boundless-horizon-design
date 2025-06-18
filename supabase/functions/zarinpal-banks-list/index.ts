
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
    console.log('=== ZARINPAL BANKS LIST FUNCTION STARTED ===');
    
    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Method not allowed' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      });
    }

    console.log('Fetching banks list from Zarinpal');

    // Send request to Zarinpal banks list endpoint
    const response = await fetch('https://api.zarinpal.com/pg/v4/payman/banksList.json', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log('Zarinpal banks list response status:', response.status);

    // Get raw response text first
    const responseText = await response.text();
    console.log('Zarinpal banks list raw response:', responseText.substring(0, 500));

    // Check if response is not 2xx
    if (!response.ok) {
      console.error('Zarinpal banks list request failed:', {
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

    console.log('Zarinpal banks list parsed response:', responseData);

    // Check for successful banks list retrieval
    if (responseData.data && responseData.data.code === 100 && responseData.data.banks) {
      console.log('Banks list retrieved successfully:', {
        banksCount: responseData.data.banks.length
      });

      return new Response(JSON.stringify({ 
        success: true, 
        banks: responseData.data.banks,
        data: responseData.data
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.error('Banks list retrieval failed:', responseData);

      return new Response(JSON.stringify({
        success: false,
        error: responseData.errors?.message || 'Banks list retrieval failed',
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
    console.error('💥 CRITICAL ERROR in Zarinpal banks list retrieval:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Banks list service error',
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
