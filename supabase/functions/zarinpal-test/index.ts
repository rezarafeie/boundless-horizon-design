
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

    // Test payload
    const testPayload = {
      merchant_id: merchantId,
      amount: 1000,
      description: "Test Payment",
      callback_url: "https://bnets.co/test"
    };

    console.log('Testing Zarinpal connectivity');

    // Test multiple endpoints
    const endpoints = [
      'https://api.zarinpal.com/pg/v4/payment/request.json',
      'https://www.zarinpal.com/pg/rest/WebGate/PaymentRequest.json',
      'https://sandbox.zarinpal.com/pg/rest/WebGate/PaymentRequest.json'
    ];

    const results = [];

    for (const endpoint of endpoints) {
      console.log(`Testing endpoint: ${endpoint}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`Test timeout for ${endpoint} after 3 seconds`);
        controller.abort();
      }, 3000);

      let result = {
        endpoint,
        success: false,
        error: null,
        responseTime: 0,
        status: null
      };

      try {
        const startTime = Date.now();
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(testPayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        result.responseTime = Date.now() - startTime;
        result.status = response.status;

        console.log(`${endpoint} responded in ${result.responseTime}ms with status: ${response.status}`);

        if (response.ok || response.status === 422) { // 422 might be expected for test data
          result.success = true;
          
          try {
            const responseText = await response.text();
            const responseData = JSON.parse(responseText);
            result.data = responseData;
          } catch (parseError) {
            result.error = 'Parse error';
          }
        } else {
          result.error = `HTTP ${response.status}`;
        }

      } catch (fetchError) {
        clearTimeout(timeoutId);
        result.responseTime = Date.now() - startTime;
        
        if (fetchError.name === 'AbortError') {
          result.error = 'Timeout (3s)';
        } else {
          result.error = fetchError.message;
        }
        
        console.error(`${endpoint} test failed:`, fetchError.name, fetchError.message);
      }

      results.push(result);
    }

    // Find working endpoints
    const workingEndpoints = results.filter(r => r.success);
    const fastestEndpoint = workingEndpoints.length > 0 ? 
      workingEndpoints.reduce((prev, current) => 
        (prev.responseTime < current.responseTime) ? prev : current
      ) : null;

    return new Response(JSON.stringify({ 
      success: workingEndpoints.length > 0, 
      message: workingEndpoints.length > 0 ? 
        `Found ${workingEndpoints.length} working endpoint(s)` : 
        'No working endpoints found',
      details: {
        merchantIdConfigured: true,
        totalEndpoints: endpoints.length,
        workingEndpoints: workingEndpoints.length,
        fastestEndpoint: fastestEndpoint?.endpoint,
        fastestResponseTime: fastestEndpoint?.responseTime,
        results
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

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
