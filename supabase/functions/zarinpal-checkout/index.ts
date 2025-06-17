
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

    // Convert Toman to Rial (Zarinpal expects Rial)
    const amountInRial = amount * 10;
    console.log(`Converting amount: ${amount} Toman = ${amountInRial} Rial`);

    // Create payment request to Zarinpal
    const zarinpalRequest = {
      merchant_id: merchantId,
      amount: amountInRial, // Amount in Rial (Toman * 10)
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

    const responseData = await response.json();
    console.log('Zarinpal response data:', responseData);

    if (response.ok && responseData.data && responseData.data.code === 100) {
      const authority = responseData.data.authority;
      const redirectUrl = `https://www.zarinpal.com/pg/StartPay/${authority}`;
      
      console.log('Payment request successful:', { authority, redirectUrl });

      return new Response(JSON.stringify({ 
        success: true, 
        redirectUrl,
        authority 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.error('Zarinpal API error:', responseData);
      throw new Error(responseData.errors?.join(', ') || 'Payment request failed');
    }

  } catch (error) {
    console.error('Zarinpal checkout error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
