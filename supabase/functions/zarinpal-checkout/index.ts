
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

    // Try multiple API endpoints with improved error handling
    const endpoints = [
      'https://api.zarinpal.com/pg/v4/payment/request.json',
      'https://www.zarinpal.com/pg/rest/WebGate/PaymentRequest.json'
    ];

    let lastError = null;
    
    for (const endpoint of endpoints) {
      console.log(`Trying endpoint: ${endpoint}`);
      
      // Declare timeout ID outside try block to ensure scope access
      let timeoutId: number | undefined;
      
      try {
        // Create abort controller with 3 second timeout
        const controller = new AbortController();
        timeoutId = setTimeout(() => {
          console.log(`Timeout after 3 seconds for ${endpoint}`);
          controller.abort();
        }, 3000);

        const startTime = Date.now();
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestPayload),
          signal: controller.signal
        });

        // Clear timeout on successful response
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }

        const responseTime = Date.now() - startTime;
        console.log(`${endpoint} response status: ${response.status} (${responseTime}ms)`);

        // Parse response
        let responseData;
        try {
          const responseText = await response.text();
          console.log(`${endpoint} raw response:`, responseText);
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`Failed to parse response from ${endpoint}:`, parseError);
          lastError = new Error(`Parse error from ${endpoint}: ${parseError.message}`);
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
                          responseData.data?.Authority ||
                          responseData.Authority;

          if (isSuccess && authority) {
            const redirectUrl = `https://www.zarinpal.com/pg/StartPay/${authority}`;
            console.log('✅ SUCCESS - Payment request created:', { authority, redirectUrl });

            return new Response(JSON.stringify({ 
              success: true, 
              redirectUrl,
              authority,
              endpoint: endpoint,
              responseTime
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } else {
            console.log(`${endpoint} returned non-success response:`, { isSuccess, authority, responseData });
          }
        } else {
          console.log(`${endpoint} returned HTTP error:`, response.status);
        }

        // If we get here, this endpoint didn't work, try the next one
        lastError = new Error(`API error from ${endpoint}: HTTP ${response.status}`);
        
      } catch (fetchError) {
        // Ensure timeout is cleared in catch block
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
        
        console.error(`${endpoint} failed:`, fetchError.name, fetchError.message);
        lastError = fetchError;
        
        if (fetchError.name === 'AbortError') {
          console.log(`${endpoint} timed out after 3 seconds`);
          lastError = new Error(`Timeout connecting to ${endpoint}`);
        } else if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
          console.log(`${endpoint} network error - possibly unreachable`);
          lastError = new Error(`Network error connecting to ${endpoint}`);
        }
        // Continue to next endpoint
      }
    }

    // If all endpoints failed
    console.error('❌ All Zarinpal endpoints failed. Last error:', lastError?.message);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Payment gateway temporarily unavailable. Please use manual payment.',
      errorCode: 'ALL_ENDPOINTS_FAILED',
      details: {
        lastError: lastError?.message,
        suggestion: 'Try manual payment or contact support'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 502,
    });

  } catch (error) {
    console.error('💥 CRITICAL ERROR in Zarinpal checkout:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Payment service error. Please try manual payment.',
      errorCode: 'INTERNAL_ERROR',
      details: {
        message: error.message,
        suggestion: 'Use manual payment option'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
