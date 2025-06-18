
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
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    // Validate request method
    if (req.method !== 'POST') {
      console.error('Invalid request method:', req.method);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Method not allowed' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      });
    }

    // Parse request body with error handling
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log('Raw request body:', bodyText);
      requestBody = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid JSON in request body' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { amount, subscriptionId, description } = requestBody;
    console.log('Parsed request data:', { amount, subscriptionId, description });

    // Validate required fields
    if (!amount || !subscriptionId) {
      console.error('Missing required fields:', { amount: !!amount, subscriptionId: !!subscriptionId });
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Amount and subscription ID are required' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Check environment variables
    const merchantId = Deno.env.get('ZARINPAL_MERCHANT_ID');
    console.log('Environment check:', {
      merchantIdExists: !!merchantId,
      merchantIdLength: merchantId?.length || 0,
      allEnvVars: Object.keys(Deno.env.toObject()).filter(key => key.includes('ZARINPAL'))
    });

    if (!merchantId) {
      console.error('ZARINPAL_MERCHANT_ID environment variable not found');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Payment gateway configuration error' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Prepare Zarinpal request
    const zarinpalRequest = {
      merchant_id: merchantId,
      amount: amount,
      description: description || `VPN Subscription Payment`,
      callback_url: `https://bnets.co/delivery?payment=zarinpal&subscriptionId=${subscriptionId}`,
      metadata: {
        subscription_id: subscriptionId
      }
    };

    console.log('Zarinpal request payload:', zarinpalRequest);

    // Make request to Zarinpal with timeout and proper error handling
    let zarinpalResponse;
    try {
      console.log('Sending request to Zarinpal API...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      zarinpalResponse = await fetch('https://api.zarinpal.com/pg/v4/payment/request.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(zarinpalRequest),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('Zarinpal API response status:', zarinpalResponse.status);
      console.log('Zarinpal API response headers:', Object.fromEntries(zarinpalResponse.headers.entries()));

    } catch (fetchError) {
      console.error('Failed to fetch from Zarinpal:', fetchError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to connect to payment gateway',
        details: fetchError.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Parse Zarinpal response
    let responseData;
    try {
      const responseText = await zarinpalResponse.text();
      console.log('Zarinpal raw response:', responseText);
      responseData = JSON.parse(responseText);
      console.log('Zarinpal parsed response:', responseData);
    } catch (parseError) {
      console.error('Failed to parse Zarinpal response:', parseError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid response from payment gateway' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 502,
      });
    }

    // Check for successful response
    if (zarinpalResponse.ok && responseData) {
      let isSuccess = false;
      let authority = null;

      // Check multiple success conditions
      if (responseData.data && responseData.data.code === 100) {
        isSuccess = true;
        authority = responseData.data.authority;
        console.log('✅ Success: data.code === 100');
      } else if (responseData.code === 100) {
        isSuccess = true;
        authority = responseData.authority;
        console.log('✅ Success: code === 100');
      } else if (responseData.status === 'OK' || responseData.Status === 'OK') {
        isSuccess = true;
        authority = responseData.authority || responseData.Authority;
        console.log('✅ Success: status === OK');
      }

      if (isSuccess && authority) {
        const redirectUrl = `https://www.zarinpal.com/pg/StartPay/${authority}`;
        console.log('✅ PAYMENT REQUEST SUCCESSFUL');
        console.log('Authority:', authority);
        console.log('Redirect URL:', redirectUrl);

        return new Response(JSON.stringify({ 
          success: true, 
          redirectUrl,
          authority,
          zarinpalResponse: responseData
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        console.error('❌ Payment request failed - no authority');
        console.log('Response analysis:', {
          hasData: !!responseData.data,
          dataCode: responseData.data?.code,
          directCode: responseData.code,
          status: responseData.status,
          authority: responseData.authority,
          errors: responseData.errors
        });

        const errorMessage = responseData.errors?.join(', ') || 
                           responseData.message || 
                           'Payment request failed';
        
        return new Response(JSON.stringify({ 
          success: false, 
          error: errorMessage,
          zarinpalResponse: responseData
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
    } else {
      console.error('❌ Zarinpal API error');
      const errorMessage = responseData?.errors?.join(', ') || 
                         responseData?.message || 
                         `HTTP ${zarinpalResponse.status}`;
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Payment gateway error: ${errorMessage}`,
        zarinpalResponse: responseData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: zarinpalResponse.status,
      });
    }

  } catch (error) {
    console.error('💥 ZARINPAL CHECKOUT CRITICAL ERROR:', error);
    console.log('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error',
      details: error.message,
      stack: error.stack
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
