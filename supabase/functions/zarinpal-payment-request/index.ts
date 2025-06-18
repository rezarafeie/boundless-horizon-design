
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
    console.log('=== ZARINPAL PAYMENT REQUEST FUNCTION STARTED ===');
    
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
    console.log('Request data:', { 
      merchant_id: merchant_id.substring(0, 8) + '...',
      amount,
      description: description?.substring(0, 50) || 'missing',
      callback_url: callback_url || 'missing',
      mobile: mobile || 'missing'
    });

    // Validate required parameters
    if (!amount || !description || !callback_url) {
      console.error('Missing required parameters');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required parameters',
        details: {
          amount: !!amount,
          description: !!description,
          callback_url: !!callback_url
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log('Creating payment request for amount:', amount);

    // Prepare payment request payload
    const paymentPayload = {
      merchant_id,
      amount,
      description,
      callback_url,
      metadata: {
        mobile: mobile || '',
        email: email || ''
      }
    };

    console.log('Sending payment request to Zarinpal:', {
      merchant_id: merchant_id.substring(0, 8) + '...',
      amount,
      description: description.substring(0, 50),
      callback_url
    });

    // Send request to Zarinpal payment request endpoint
    const response = await fetch('https://api.zarinpal.com/pg/v4/payment/request.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(paymentPayload)
    });

    console.log('Zarinpal payment request response status:', response.status);

    // Get raw response text first
    const responseText = await response.text();
    console.log('Zarinpal payment request raw response:', responseText.substring(0, 500));

    // Check if response is not 2xx
    if (!response.ok) {
      console.error('Zarinpal payment request failed:', {
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

    console.log('Zarinpal payment request parsed response:', responseData);

    // Check for successful payment request
    if (responseData.data && responseData.data.code === 100 && responseData.data.authority) {
      console.log('Payment request created successfully:', {
        authority: responseData.data.authority,
        amount
      });

      return new Response(JSON.stringify({ 
        success: true, 
        authority: responseData.data.authority,
        amount,
        gateway_url: `https://www.zarinpal.com/pg/StartPay/${responseData.data.authority}`,
        data: responseData.data
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.error('Payment request creation failed:', responseData);

      return new Response(JSON.stringify({
        success: false,
        error: responseData.errors?.message || 'Payment request creation failed',
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
    console.error('💥 CRITICAL ERROR in Zarinpal payment request:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Payment request service error',
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
