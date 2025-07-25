
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

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
    console.log('=== ZARINPAL REGULAR PAYMENT STARTED ===');
    
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { amount, mobile, callback_url, description, subscription_id } = await req.json();
    console.log('Request received:', { amount, mobile, callback_url, description, subscription_id });

    // Validate required parameters
    if (!amount || !callback_url) {
      console.error('Missing required parameters');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required parameters: amount and callback_url are required'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Prepare the standard Zarinpal payment request
    const paymentPayload = {
      merchant_id: merchant_id,
      amount: amount,
      callback_url: callback_url,
      description: description || 'VPN Subscription Payment',
      mobile: mobile || undefined
    };

    console.log('Sending Zarinpal payment request:', JSON.stringify(paymentPayload, null, 2));

    // Send request to Zarinpal standard payment endpoint
    const response = await fetch('https://api.zarinpal.com/pg/v4/payment/request.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(paymentPayload)
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

    // Check for successful payment request
    if (responseData.data && responseData.data.code === 100 && responseData.data.authority) {
      console.log('Payment request created successfully!');
      console.log('Authority:', responseData.data.authority);

      // If subscription_id is provided, save the authority to the subscription record
      if (subscription_id) {
        console.log('Saving zarinpal_authority to subscription:', subscription_id);
        
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            zarinpal_authority: responseData.data.authority,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription_id);

        if (updateError) {
          console.error('Failed to update subscription with zarinpal_authority:', updateError);
          // Don't fail the payment creation, just log the error
        } else {
          console.log('Successfully saved zarinpal_authority to subscription');
        }
      }

      // Generate the gateway URL
      const gateway_url = `https://www.zarinpal.com/pg/StartPay/${responseData.data.authority}`;
      
      console.log('Gateway URL:', gateway_url);

      return new Response(JSON.stringify({ 
        success: true, 
        authority: responseData.data.authority,
        gateway_url: gateway_url,
        amount: amount,
        data: responseData.data
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.error('Payment request failed:', responseData);

      // Handle specific error codes
      let errorMessage = 'Payment request failed';
      if (responseData.errors) {
        if (responseData.errors.code === -80) {
          errorMessage = 'Merchant does not have access to this service';
        } else if (responseData.errors.code === -9) {
          errorMessage = 'Invalid validation parameters';
        } else if (responseData.errors.code === -11) {
          errorMessage = 'Request not found';
        } else if (responseData.errors.code === -54) {
          errorMessage = 'Invalid amount';
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
    console.error('💥 CRITICAL ERROR in Zarinpal Payment:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Payment service error',
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
