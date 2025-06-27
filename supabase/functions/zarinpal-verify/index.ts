
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    console.log('=== ZARINPAL VERIFY STARTED ===');
    
    // Get merchant ID from environment
    const merchant_id = Deno.env.get('ZARINPAL_MERCHANT_ID');
    if (!merchant_id) {
      console.error('ZARINPAL_MERCHANT_ID not configured');
      return new Response(JSON.stringify({
        success: false,
        error: 'Zarinpal merchant ID not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestBody = await req.json();
    console.log('Verify request received:', requestBody);

    const { authority } = requestBody;

    if (!authority) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authority parameter is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Query subscription by zarinpal_authority to get the amount
    console.log('Querying subscription by authority:', authority);
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('id, price_toman, mobile, username')
      .eq('zarinpal_authority', authority)
      .single();

    if (subscriptionError || !subscription) {
      console.error('Failed to find subscription by authority:', subscriptionError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Subscription not found for this payment',
        details: subscriptionError
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Found subscription:', subscription);

    // Convert Toman to Rial (multiply by 10) as required by Zarinpal
    const amountInRial = subscription.price_toman * 10;

    const verifyRequest = {
      merchant_id,
      authority,
      amount: amountInRial
    };

    console.log('Sending verify request to Zarinpal:', verifyRequest);

    const zarinpalResponse = await fetch('https://api.zarinpal.com/pg/v4/payment/verify.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(verifyRequest)
    });

    console.log('Zarinpal verify response status:', zarinpalResponse.status);

    const responseText = await zarinpalResponse.text();
    console.log('Zarinpal verify raw response:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid response from Zarinpal',
          details: {
            status: zarinpalResponse.status,
            rawResponse: responseText.substring(0, 500),
            parseError: parseError.message
          }
        }),
        { 
          status: 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!zarinpalResponse.ok) {
      console.error('Zarinpal API error:', responseData);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Zarinpal API error',
          details: responseData,
          status: zarinpalResponse.status,
          rawResponse: responseText
        }),
        { 
          status: zarinpalResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if payment verification was successful
    if (responseData.data && responseData.data.code === 100) {
      console.log('Payment verification successful!');
      console.log('Reference ID:', responseData.data.ref_id);
      
      // Update subscription status to active and store reference ID
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          zarinpal_ref_id: responseData.data.ref_id.toString(),
          notes: `Zarinpal payment verified successfully - Ref ID: ${responseData.data.ref_id}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (updateError) {
        console.error('Failed to update subscription status:', updateError);
        // Don't fail the verification, just log the error
      } else {
        console.log('Subscription status updated to active');
      }

      return new Response(
        JSON.stringify({
          success: true,
          reference_id: responseData.data.ref_id,
          amount: responseData.data.amount,
          card_hash: responseData.data.card_hash,
          card_pan: responseData.data.card_pan,
          data: responseData.data,
          subscription: subscription
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      console.error('Payment verification failed:', responseData);
      
      // Update subscription with failure details
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'failed',
          notes: `Zarinpal payment verification failed - Error: ${JSON.stringify(responseData.errors || responseData)}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (updateError) {
        console.error('Failed to update subscription with failure:', updateError);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment verification failed',
          details: responseData,
          code: responseData.data?.code || responseData.errors?.code
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('💥 CRITICAL ERROR in Zarinpal Verify:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Payment verification service error',
        details: {
          message: error.message,
          stack: error.stack
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
