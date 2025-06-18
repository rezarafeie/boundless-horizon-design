
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

    // Prepare request payload
    const requestPayload = {
      merchant_id: merchantId,
      amount: Number(amount),
      description: description || `VPN Subscription Payment - ${subscriptionId}`,
      callback_url: `https://bnets.co/delivery?payment=zarinpal&subscriptionId=${subscriptionId}`
    };

    console.log('Sending request to Zarinpal:', {
      ...requestPayload,
      merchant_id: requestPayload.merchant_id.substring(0, 8) + '...'
    });

    // Try multiple API endpoints with shorter timeouts
    const endpoints = [
      'https://api.zarinpal.com/pg/v4/payment/request.json',
      'https://www.zarinpal.com/pg/rest/WebGate/PaymentRequest.json'
    ];

    let lastError = null;
    
    for (const endpoint of endpoints) {
      console.log(`Trying endpoint: ${endpoint}`);
      
      try {
        // Create abort controller with 3 second timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log(`Timeout after 3 seconds for ${endpoint}`);
          controller.abort();
        }, 3000);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestPayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log(`${endpoint} response status:`, response.status);

        // Parse response
        let responseData;
        try {
          const responseText = await response.text();
          console.log(`${endpoint} raw response:`, responseText);
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`Failed to parse response from ${endpoint}:`, parseError);
          lastError = new Error(`Parse error from ${endpoint}`);
          continue;
        }

        console.log(`${endpoint} parsed response:`, responseData);

        // Check for successful response
        if (response.ok) {
          // Check multiple success patterns for different endpoints
          const isSuccess = (
            (responseData.data && responseData.data.code === 100) ||
            (responseData.Status === 100) ||
            (responseData.code === 100) ||
            (responseData.status === 'OK')
          );

          const authority = responseData.data?.authority || 
                          responseData.data?.payman_authority ||
                          responseData.Authority;

          if (isSuccess && authority) {
            const redirectUrl = `https://www.zarinpal.com/pg/StartPay/${authority}`;
            console.log('✅ SUCCESS - Payment request created:', { authority, redirectUrl });

            return new Response(JSON.stringify({ 
              success: true, 
              redirectUrl,
              authority,
              endpoint: endpoint
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // If we get here, this endpoint didn't work, try the next one
        lastError = new Error(`API error from ${endpoint}: ${response.status}`);
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error(`${endpoint} failed:`, fetchError.name, fetchError.message);
        lastError = fetchError;
        
        if (fetchError.name === 'AbortError') {
          console.log(`${endpoint} timed out after 3 seconds`);
        }
        // Continue to next endpoint
      }
    }

    // If all endpoints failed
    console.error('❌ All Zarinpal endpoints failed');
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Unable to connect to payment gateway. Please try manual payment.',
      errorCode: 'ALL_ENDPOINTS_FAILED',
      lastError: lastError?.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 502,
    });

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
