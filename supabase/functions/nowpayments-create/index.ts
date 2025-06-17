
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
    console.log('=== NOWPAYMENTS CREATE FUNCTION STARTED ===');
    
    const { price_amount, price_currency, pay_currency, order_id, order_description, sandbox = true } = await req.json();
    console.log('Request body:', { price_amount, price_currency, pay_currency, order_id, order_description, sandbox });

    const nowpaymentsApiKey = Deno.env.get('NOWPAYMENTS_API_KEY');
    if (!nowpaymentsApiKey) {
      console.error('NOWPAYMENTS_API_KEY not configured');
      throw new Error('NowPayments API key not configured');
    }

    console.log('NowPayments API key configured:', !!nowpaymentsApiKey);

    // Validate parameters
    if (!price_amount || price_amount < 1) {
      console.error('Invalid price amount:', price_amount);
      throw new Error('Price amount must be at least $1');
    }

    if (!order_id || !order_description) {
      console.error('Missing required fields:', { order_id, order_description });
      throw new Error('Order ID and description are required');
    }

    // Use sandbox environment by default for testing
    const baseUrl = sandbox ? 'https://api-sandbox.nowpayments.io' : 'https://api.nowpayments.io';
    console.log('Using API environment:', sandbox ? 'SANDBOX' : 'PRODUCTION');

    // Ensure minimum amount for crypto payments
    const minAmount = 10;
    const adjustedAmount = Math.max(price_amount, minAmount);
    
    if (adjustedAmount !== price_amount) {
      console.log(`Adjusted amount from $${price_amount} to $${adjustedAmount} to meet minimum requirement`);
    }

    const requestBody = {
      price_amount: adjustedAmount,
      price_currency: price_currency || 'usd',
      pay_currency: pay_currency || 'usdttrc20',
      order_id,
      order_description: `${order_description} (${sandbox ? 'TEST MODE - ' : ''}Min $${adjustedAmount})`,
      ipn_callback_url: `https://bnets.co/delivery?payment=crypto&orderId=${order_id}`,
    };

    console.log('Creating NowPayments invoice with payload:', requestBody);

    const response = await fetch(`${baseUrl}/v1/payment`, {
      method: 'POST',
      headers: {
        'x-api-key': nowpaymentsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('NowPayments API response status:', response.status);
    console.log('NowPayments API response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('NowPayments API raw response:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse NowPayments response:', parseError);
      console.error('Raw response that failed to parse:', responseText);
      throw new Error(`Invalid response from NowPayments API: ${responseText.substring(0, 200)}`);
    }

    console.log('NowPayments API parsed response:', responseData);

    if (response.ok && responseData.payment_id) {
      console.log('Payment created successfully:', {
        payment_id: responseData.payment_id,
        pay_address: responseData.pay_address,
        pay_amount: responseData.pay_amount,
        pay_currency: responseData.pay_currency
      });

      return new Response(JSON.stringify({ 
        success: true, 
        invoice: responseData,
        sandbox_mode: !!sandbox,
        test_mode: sandbox
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.error('NowPayments API error response:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });
      
      // Handle specific error cases
      if (responseData.code === 'AMOUNT_MINIMAL_ERROR') {
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Minimum amount is $${minAmount}. Please increase your order amount.`,
          code: 'AMOUNT_TOO_LOW'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      
      const errorMessage = responseData.message || responseData.error || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('NowPayments error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
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
