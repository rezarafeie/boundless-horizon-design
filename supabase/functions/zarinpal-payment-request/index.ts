
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
    console.log('=== ZARINPAL PAYMAN CONTRACT REQUEST FUNCTION STARTED ===');
    
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Method not allowed' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      });
    }

    // Get merchant ID from environment
    const merchant_id = Deno.env.get('ZARINPAL_MERCHANT_ID');
    if (!merchant_id) {
      console.error('ZARINPAL_MERCHANT_ID not configured');
      return new Response(JSON.stringify({
        success: false,
        error: 'Zarinpal merchant ID not configured'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Parse request body
    const { amount, description, callback_url, mobile, email } = await req.json();
    console.log('Request data received:', { 
      merchant_id: merchant_id.substring(0, 8) + '...',
      amount,
      description: description?.substring(0, 50) || 'missing',
      callback_url: callback_url || 'missing',
      mobile: mobile || 'missing'
    });

    // Validate required parameters for Payman
    if (!amount || !mobile || !callback_url) {
      console.error('Missing required parameters for Payman contract');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required parameters: amount, mobile, and callback_url are required',
        details: {
          amount: !!amount,
          mobile: !!mobile,
          callback_url: !!callback_url
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create expire_at date (30 days in the future)
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 30);
    const expire_at = expireDate.toISOString().slice(0, 19).replace('T', ' ');

    console.log('Creating Payman contract for amount:', amount);

    // Prepare Payman contract request payload with all required fields
    const paymanPayload = {
      merchant_id,
      mobile,
      expire_at,
      max_daily_count: "100",
      max_monthly_count: "1000", 
      max_amount: amount.toString(),
      callback_url
    };

    console.log('Sending Payman contract request to Zarinpal:', {
      merchant_id: merchant_id.substring(0, 8) + '...',
      mobile,
      expire_at,
      max_daily_count: paymanPayload.max_daily_count,
      max_monthly_count: paymanPayload.max_monthly_count,
      max_amount: paymanPayload.max_amount,
      callback_url
    });

    // Send request to Zarinpal Payman contract endpoint
    const response = await fetch('https://api.zarinpal.com/pg/v4/payman/request.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(paymanPayload)
    });

    console.log('Zarinpal Payman contract response status:', response.status);

    // Get raw response text first
    const responseText = await response.text();
    console.log('Zarinpal Payman contract raw response:', responseText.substring(0, 500));

    // Check if response is not 2xx
    if (!response.ok) {
      console.error('Zarinpal Payman contract request failed:', {
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

    console.log('Zarinpal Payman contract parsed response:', responseData);

    // Check for successful Payman contract creation
    if (responseData.data && responseData.data.code === 100 && responseData.data.payman_authority) {
      console.log('Payman contract created successfully:', {
        payman_authority: responseData.data.payman_authority,
        amount: paymanPayload.max_amount
      });

      // For Payman, we need to redirect to a different URL structure
      const gateway_url = `https://www.zarinpal.com/pg/StartPayman/${responseData.data.payman_authority}`;

      return new Response(JSON.stringify({ 
        success: true, 
        authority: responseData.data.payman_authority,
        payman_authority: responseData.data.payman_authority,
        amount: paymanPayload.max_amount,
        gateway_url,
        data: responseData.data
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.error('Payman contract creation failed:', responseData);

      // Handle specific Payman error codes
      let errorMessage = 'Payman contract creation failed';
      if (responseData.errors) {
        if (responseData.errors.code === -80) {
          errorMessage = 'Merchant does not have access to Payman service';
        } else if (responseData.errors.code === -9) {
          errorMessage = 'Invalid validation parameters for Payman';
        } else if (responseData.errors.code === -11) {
          errorMessage = 'Payman request not found';
        }
      }

      return new Response(JSON.stringify({
        success: false,
        error: errorMessage,
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
    console.error('💥 CRITICAL ERROR in Zarinpal Payman contract:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Payman contract service error',
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
