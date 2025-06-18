
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== ZARINPAL TEST FUNCTION STARTED ===');
    
    const merchantId = Deno.env.get('ZARINPAL_MERCHANT_ID');
    if (!merchantId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'ZARINPAL_MERCHANT_ID not configured' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Simple test payload
    const testPayload = {
      merchant_id: merchantId,
      amount: 1000, // 1000 Toman test amount
      description: "Test Payment",
      callback_url: "https://bnets.co/test"
    };

    console.log('Testing Zarinpal connectivity with minimal payload');

    // Test with 5-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Test timeout - aborting after 5 seconds');
      controller.abort();
    }, 5000);

    let response;
    const startTime = Date.now();

    try {
      response = await fetch('https://api.zarinpal.com/pg/v4/payment/request.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      console.log(`✅ Zarinpal API responded in ${responseTime}ms with status:`, response.status);

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON response',
          details: { responseText, parseError: parseError.message, responseTime }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Zarinpal API is reachable',
        details: {
          responseTime,
          status: response.status,
          responseData,
          merchantIdConfigured: true
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      console.error('❌ Zarinpal test failed:', fetchError.name, fetchError.message);

      return new Response(JSON.stringify({ 
        success: false, 
        error: `Connection failed: ${fetchError.message}`,
        details: {
          errorName: fetchError.name,
          responseTime,
          merchantIdConfigured: true
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('💥 TEST FUNCTION ERROR:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Test function error',
      details: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
