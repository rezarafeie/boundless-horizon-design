
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== STRIPE CHECKOUT FUNCTION STARTED ===');
    
    const { amount, currency, productName, metadata, successUrl, cancelUrl } = await req.json();
    console.log('Request body:', { amount, currency, productName, metadata, successUrl, cancelUrl });

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY not configured');
      throw new Error('Stripe secret key not configured');
    }

    console.log('Initializing Stripe...');
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Validate required parameters
    if (!amount || amount < 50) {
      console.error('Invalid amount:', amount);
      throw new Error('Amount must be at least $0.50');
    }

    if (!successUrl || !cancelUrl) {
      console.error('Missing URLs:', { successUrl, cancelUrl });
      throw new Error('Success and cancel URLs are required');
    }

    // Validate metadata
    if (!metadata?.subscription_id) {
      console.error('Missing subscription_id in metadata:', metadata);
      throw new Error('subscription_id is required in metadata');
    }

    console.log('Creating Stripe checkout session with metadata:', metadata);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency || 'usd',
            product_data: {
              name: productName || 'VPN Subscription',
            },
            unit_amount: amount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl, // Use success URL exactly as provided - don't add duplicate session_id
      cancel_url: cancelUrl,
      metadata: metadata || {},
    });

    console.log('Stripe session created successfully:', {
      sessionId: session.id,
      url: session.url,
      metadata: session.metadata
    });

    return new Response(JSON.stringify({ 
      url: session.url,
      session_id: session.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Stripe checkout error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
