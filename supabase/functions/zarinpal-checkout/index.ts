
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
    console.log('=== ZARINPAL CHECKOUT FUNCTION STARTED ===');
    
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
    const { amount, subscriptionId, description } = await req.json();
    console.log('Request data:', { amount, subscriptionId, description });

    if (!amount || !subscriptionId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Amount and subscription ID are required' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Check merchant ID
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

    console.log('Merchant ID configured:', merchantId.substring(0, 8) + '...');

    // Prepare request payload for regular payment (not payman)
    const requestPayload = {
      merchant_id: merchantId,
      amount: Number(amount),
      description: description || `VPN Subscription Payment`,
      callback_url: `https://bnets.co/delivery?payment=zarinpal&subscriptionId=${subscriptionId}`
    };

    console.log('Sending request to Zarinpal with payload:', {
      ...requestPayload,
      merchant_id: requestPayload.merchant_id.substring(0, 8) + '...'
    });

    // Create abort controller with 10 second timeout (reduced from 15)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Request timeout - aborting after 10 seconds');
      controller.abort();
    }, 10000);

    let response;
    try {
      // Use the correct API endpoint for regular payments
      response = await fetch('https://api.zarinpal.com/pg/v4/payment/request.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('Zarinpal API response status:', response.status);

    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('Zarinpal API request failed:', fetchError.name, fetchError.message);

      if (fetchError.name === 'AbortError') {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Payment gateway timeout. Please try again.',
          errorCode: 'TIMEOUT'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 408,
        });
      }

      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Unable to connect to payment gateway. Please try again.',
        errorCode: 'CONNECTION_ERROR'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 502,
      });
    }

    // Parse response
    let responseData;
    try {
      const responseText = await response.text();
      console.log('Zarinpal raw response:', responseText);
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Zarinpal response:', parseError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid response from payment gateway',
        errorCode: 'PARSE_ERROR'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 502,
      });
    }

    console.log('Zarinpal parsed response:', responseData);

    // Check for successful response
    if (response.ok) {
      // Check multiple success patterns
      const isSuccess = (
        (responseData.data && responseData.data.code === 100) ||
        (responseData.code === 100) ||
        (responseData.status === 'OK') ||
        (responseData.Status === 'OK')
      );

      const authority = responseData.data?.authority || responseData.authority || responseData.Authority;

      if (isSuccess && authority) {
        const redirectUrl = `https://www.zarinpal.com/pg/StartPay/${authority}`;
        console.log('✅ SUCCESS - Payment request created:', { authority, redirectUrl });

        return new Response(JSON.stringify({ 
          success: true, 
          redirectUrl,
          authority
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        console.log('❌ Payment request failed - response analysis:', {
          isSuccess,
          authority,
          responseData
        });

        const errorMessage = responseData.errors?.join(', ') || 
                           responseData.message || 
                           'Payment request failed';
        
        return new Response(JSON.stringify({ 
          success: false, 
          error: errorMessage,
          errorCode: 'PAYMENT_REJECTED'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
    } else {
      console.error('❌ Zarinpal API returned error status:', response.status);
      
      const errorMessage = responseData?.errors?.join(', ') || 
                         responseData?.message || 
                         `HTTP ${response.status}`;
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Payment gateway error: ${errorMessage}`,
        errorCode: 'API_ERROR'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      });
    }

  } catch (error) {
    console.error('💥 CRITICAL ERROR:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
