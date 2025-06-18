
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
    console.log('=== ZARINPAL CHECKOUT FUNCTION STARTED ===');
    
    const { amount, subscriptionId, description } = await req.json();
    console.log('Checkout request received:', { amount, subscriptionId, description });

    if (!amount || !subscriptionId) {
      throw new Error('Amount and subscription ID are required');
    }

    // Get Zarinpal merchant ID from environment
    const merchantId = Deno.env.get('ZARINPAL_MERCHANT_ID');
    if (!merchantId) {
      console.error('ZARINPAL_MERCHANT_ID not configured');
      throw new Error('Zarinpal merchant ID not configured');
    }

    console.log('Sending payment request to Zarinpal...');
    console.log(`Using amount: ${amount} Toman (NOT converting to Rial)`);

    // Create payment request to Zarinpal
    const zarinpalRequest = {
      merchant_id: merchantId,
      amount: amount, // Keep in Toman
      description: description || `VPN Subscription Payment`,
      callback_url: `https://bnets.co/delivery?payment=zarinpal&subscriptionId=${subscriptionId}`,
      metadata: {
        subscription_id: subscriptionId
      }
    };

    console.log('Sending request to Zarinpal:', zarinpalRequest);

    const response = await fetch('https://api.zarinpal.com/pg/v4/payment/request.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(zarinpalRequest)
    });

    console.log('Zarinpal response status:', response.status);
    console.log('Zarinpal response headers:', Object.fromEntries(response.headers.entries()));

    // Get response text first to debug
    const responseText = await response.text();
    console.log('Zarinpal raw response:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Zarinpal response:', parseError);
      throw new Error(`Invalid JSON response from Zarinpal: ${responseText.substring(0, 200)}`);
    }

    console.log('Zarinpal parsed response data:', responseData);

    // Check for successful response
    if (response.ok) {
      console.log('Zarinpal API call was successful, checking response data...');
      
      // Check different possible success conditions
      let isSuccess = false;
      let authority = null;
      let errors = null;

      // Check for data.code === 100 (most common success condition)
      if (responseData.data && responseData.data.code === 100) {
        isSuccess = true;
        authority = responseData.data.authority;
        console.log('Success condition met: data.code === 100');
      }
      // Check for direct code === 100
      else if (responseData.code === 100) {
        isSuccess = true;
        authority = responseData.authority;
        console.log('Success condition met: code === 100');
      }
      // Check for status === 'OK' or similar
      else if (responseData.status === 'OK' || responseData.Status === 'OK') {
        isSuccess = true;
        authority = responseData.authority || responseData.Authority;
        console.log('Success condition met: status === OK');
      }
      // Check for direct authority presence
      else if (responseData.authority || responseData.Authority) {
        isSuccess = true;
        authority = responseData.authority || responseData.Authority;
        console.log('Success condition met: authority present');
      }

      if (responseData.errors) {
        errors = responseData.errors;
        console.log('Zarinpal returned errors:', errors);
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
        console.error('❌ PAYMENT REQUEST FAILED - No authority or success condition not met');
        console.log('Response structure analysis:', {
          hasData: !!responseData.data,
          dataCode: responseData.data?.code,
          directCode: responseData.code,
          status: responseData.status || responseData.Status,
          authority: responseData.authority || responseData.Authority,
          errors: responseData.errors
        });
        
        const errorMessage = errors ? errors.join(', ') : 
                           responseData.message || 
                           'Payment request failed - no authority received';
        
        throw new Error(errorMessage);
      }
    } else {
      console.error('❌ ZARINPAL API HTTP ERROR');
      console.log('HTTP Status:', response.status);
      console.log('Response data:', responseData);
      
      const errorMessage = responseData.errors?.join(', ') || 
                         responseData.message || 
                         `HTTP ${response.status}: ${response.statusText}`;
      
      throw new Error(`Zarinpal API error: ${errorMessage}`);
    }

  } catch (error) {
    console.error('💥 ZARINPAL CHECKOUT ERROR:', error);
    console.log('Error details:', {
      message: error.message,
      stack: error.stack
    });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Payment request failed',
      details: {
        timestamp: new Date().toISOString(),
        errorType: error.constructor.name
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
