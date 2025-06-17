
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
    const { price_amount, price_currency, pay_currency, order_id, order_description } = await req.json();

    const nowpaymentsApiKey = Deno.env.get('NOWPAYMENTS_API_KEY');
    if (!nowpaymentsApiKey) {
      throw new Error('NowPayments API key not configured');
    }

    console.log('Creating NowPayments invoice:', {
      price_amount,
      price_currency,
      pay_currency,
      order_id,
      order_description
    });

    // Ensure minimum amount for crypto payments ($5 minimum)
    const minAmount = 5;
    const adjustedAmount = Math.max(price_amount, minAmount);
    
    if (adjustedAmount !== price_amount) {
      console.log(`Adjusted amount from $${price_amount} to $${adjustedAmount} to meet minimum requirement`);
    }

    const response = await fetch('https://api.nowpayments.io/v1/payment', {
      method: 'POST',
      headers: {
        'x-api-key': nowpaymentsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: adjustedAmount,
        price_currency,
        pay_currency,
        order_id,
        order_description: `${order_description} (Adjusted to $${adjustedAmount} minimum)`,
        ipn_callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/nowpayments-webhook`,
      }),
    });

    const data = await response.json();
    console.log('NowPayments API response:', data);

    if (response.ok && data.payment_id) {
      return new Response(JSON.stringify({ success: true, invoice: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.error('NowPayments API error:', data);
      
      // Handle specific error cases
      if (data.code === 'AMOUNT_MINIMAL_ERROR') {
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Minimum amount is $${minAmount}. Please increase your order amount.`,
          code: 'AMOUNT_TOO_LOW'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      
      throw new Error(data.message || 'Payment creation failed');
    }
  } catch (error) {
    console.error('NowPayments error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      type: 'server_error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
