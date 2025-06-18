
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
    console.log('=== ZARINPAL PAYMAN NEW IMPLEMENTATION STARTED ===');
    
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
    const { amount, mobile, callback_url } = await req.json();
    console.log('Request received:', { amount, mobile, callback_url });

    // Validate required parameters
    if (!amount || !mobile || !callback_url) {
      console.error('Missing required parameters');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required parameters: amount, mobile, and callback_url are required'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create expire_at date (30 days in the future)
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 30);
    const expire_at = expireDate.toISOString().slice(0, 19).replace('T', ' ');

    // Prepare the EXACT payload format as specified
    const paymanPayload = {
      merchant_id: merchant_id,
      mobile: mobile,
      expire_at: expire_at,
      max_daily_count: "100",
      max_monthly_count: "1000", 
      max_amount: amount.toString(),
      callback_url: callback_url
    };

    console.log('Sending Payman request with payload:', JSON.stringify(paymanPayload, null, 2));

    // Test network connectivity first
    console.log('Testing network connectivity to Zarinpal...');
    
    // Send request to Zarinpal Payman endpoint
    const response = await fetch('https://api.zarinpal.com/pg/v4/payman/request.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(paymanPayload)
    });

    console.log('Zarinpal response status:', response.status);
    console.log('Zarinpal response headers:', Object.fromEntries(response.headers.entries()));

    // Get response text
    const responseText = await response.text();
    console.log('Zarinpal raw response:', responseText);

    // Check if response is not 2xx
    if (!response.ok) {
      console.error('Zarinpal API error:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });

      return new Response(JSON.stringify({
        success: false,
        error: `Zarinpal API error: HTTP ${response.status}`,
        details: {
          status: response.status,
          statusText: response.statusText,
          rawResponse: responseText
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
      console.error('Failed to parse JSON response:', parseError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON response from Zarinpal',
        details: {
          parseError: parseError.message,
          rawResponse: responseText
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 502,
      });
    }

    console.log('Zarinpal parsed response:', JSON.stringify(responseData, null, 2));

    // Check for successful Payman contract creation
    if (responseData.data && responseData.data.code === 100 && responseData.data.payman_authority) {
      console.log('Payman contract created successfully!');
      console.log('Payman Authority:', responseData.data.payman_authority);

      // Generate the correct gateway URL for Payman
      const gateway_url = `https://www.zarinpal.com/pg/StartPayman/${responseData.data.payman_authority}`;
      
      console.log('Gateway URL:', gateway_url);

      return new Response(JSON.stringify({ 
        success: true, 
        payman_authority: responseData.data.payman_authority,
        gateway_url: gateway_url,
        amount: amount,
        data: responseData.data
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.error('Payman contract creation failed:', responseData);

      // Handle specific error codes
      let errorMessage = 'Payman contract creation failed';
      if (responseData.errors) {
        if (responseData.errors.code === -80) {
          errorMessage = 'Merchant does not have access to Payman service';
        } else if (responseData.errors.code === -9) {
          errorMessage = 'Invalid validation parameters';
        } else if (responseData.errors.code === -11) {
          errorMessage = 'Request not found';
        }
      }

      return new Response(JSON.stringify({
        success: false,
        error: errorMessage,
        details: responseData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

  } catch (error) {
    console.error('💥 CRITICAL ERROR in Zarinpal Payman:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Payman service error',
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
