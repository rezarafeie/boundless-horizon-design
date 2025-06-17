
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== STRIPE VERIFY SESSION FUNCTION STARTED ===');
    
    const { sessionId } = await req.json();
    console.log('Request body:', { sessionId });

    if (!sessionId) {
      console.error('No session ID provided');
      throw new Error('Session ID is required');
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error('Stripe secret key not configured');
      throw new Error('Stripe secret key not configured');
    }

    console.log('Initializing Stripe with session ID:', sessionId);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Retrieve the session from Stripe
    console.log('Retrieving session from Stripe...');
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('Stripe session retrieved:', {
      id: session.id,
      payment_status: session.payment_status,
      metadata: session.metadata
    });
    
    if (session.payment_status !== 'paid') {
      console.error('Payment not completed, status:', session.payment_status);
      throw new Error('Payment not completed');
    }

    // Get metadata from session
    const metadata = session.metadata || {};
    const username = metadata.username;
    const mobile = metadata.mobile;
    const dataLimit = parseInt(metadata.dataLimit || '50');
    const duration = parseInt(metadata.duration || '30');
    const protocol = metadata.protocol || 'vmess';

    console.log('Session metadata:', { username, mobile, dataLimit, duration, protocol });

    if (!username || !mobile) {
      console.error('Missing subscription metadata');
      throw new Error('Missing subscription metadata');
    }

    console.log('Creating subscription for verified Stripe payment');

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create subscription in database
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        username,
        mobile,
        data_limit_gb: dataLimit,
        duration_days: duration,
        protocol,
        price_toman: session.amount_total ? session.amount_total / 100 * 60000 : 0,
        status: 'paid',
        user_id: null
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('Subscription creation error:', subscriptionError);
      throw new Error('Failed to create subscription');
    }

    console.log('Subscription created:', subscription.id);

    // Create VPN user
    console.log('Creating VPN user...');
    const { data: vpnResult, error: vpnError } = await supabase.functions.invoke(
      'marzneshin-create-user',
      {
        body: {
          username,
          dataLimitGB: dataLimit,
          durationDays: duration,
          notes: `Stripe payment: ${sessionId}`
        }
      }
    );

    if (vpnError || !vpnResult.success) {
      console.error('VPN creation error:', vpnError || vpnResult);
      throw new Error('Failed to create VPN user');
    }

    console.log('VPN user created successfully');

    // Update subscription with VPN details
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        subscription_url: vpnResult.data.subscription_url,
        marzban_user_created: true,
        expire_at: new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Failed to update subscription:', updateError);
    }

    const responseData = {
      username,
      subscription_url: vpnResult.data.subscription_url,
      expire: Date.now() + (duration * 24 * 60 * 60 * 1000),
      data_limit: dataLimit * 1073741824,
      status: 'active'
    };

    console.log('Returning successful response:', responseData);

    return new Response(JSON.stringify({ 
      success: true, 
      subscription: responseData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Stripe verification error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
