
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PanelUserCreationService implementation (copied from frontend service)
class PanelUserCreationService {
  static async createUserFromPanel({ planId, username, dataLimitGB, durationDays, notes, subscriptionId }) {
    console.log(`🔵 Creating user from panel for plan: ${planId}`);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );
    
    try {
      // Get plan details with panel mapping
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select(`
          id,
          plan_id,
          api_type,
          assigned_panel_id,
          plan_panel_mappings (
            panel_id,
            is_primary,
            inbound_ids,
            panel_servers (
              id,
              name,
              type,
              panel_url,
              username,
              password
            )
          )
        `)
        .eq('id', planId)
        .single();

      if (planError || !plan) {
        console.error('❌ Plan not found:', planError);
        throw new Error(`Plan not found: ${planError?.message}`);
      }

      console.log('📋 Plan found:', plan.plan_id);
      
      // Find the primary panel or first available panel
      const panelMapping = plan.plan_panel_mappings?.find(mapping => mapping.is_primary) || 
                          plan.plan_panel_mappings?.[0];
      
      if (!panelMapping?.panel_servers) {
        console.error('❌ No panel server found for plan');
        throw new Error('No panel server configured for this plan');
      }

      const panel = panelMapping.panel_servers;
      console.log('🖥️ Using panel:', panel.name, 'Type:', panel.type);

      // Choose the appropriate edge function based on panel type
      const functionName = panel.type === 'marzneshin' ? 'marzneshin-create-user' : 'marzban-create-user';
      
      console.log(`🚀 Calling ${functionName} with:`, {
        username,
        dataLimitGB,
        durationDays,
        notes,
        subscriptionId,
        panelId: panel.id
      });

      // Call the appropriate edge function
      const { data: result, error } = await supabase.functions.invoke(functionName, {
        body: {
          username,
          dataLimitGB,
          durationDays,
          notes,
          subscriptionId,
          panelId: panel.id
        }
      });

      console.log(`📡 ${functionName} response:`, { result, error });

      if (error) {
        console.error(`❌ ${functionName} error:`, error);
        throw new Error(`Failed to create user via ${functionName}: ${error.message}`);
      }

      if (!result?.success) {
        console.error(`❌ ${functionName} failed:`, result);
        throw new Error(`User creation failed: ${result?.error || 'Unknown error'}`);
      }

      console.log('✅ User created successfully:', result.data);
      return result;

    } catch (error) {
      console.error('❌ PanelUserCreationService error:', error);
      throw error;
    }
  }
}

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
    const subscriptionId = metadata.subscription_id;
    const mobile = metadata.mobile;
    const originalAmountToman = parseInt(metadata.original_amount_toman || '0');

    console.log('Session metadata:', { subscriptionId, mobile, originalAmountToman });

    if (!subscriptionId || !mobile) {
      console.error('Missing required metadata');
      throw new Error('Missing subscription_id or mobile in metadata');
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find existing subscription by ID
    console.log('Finding existing subscription:', subscriptionId);
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (subscriptionError || !subscription) {
      console.error('Subscription not found:', subscriptionError);
      throw new Error('Subscription not found for the provided ID');
    }

    console.log('Found existing subscription:', subscription.username);

    // Update subscription status to active with Stripe payment details
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        notes: `${subscription.notes || ''} - Stripe payment verified - Session ID: ${sessionId}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Failed to update subscription status:', updateError);
      throw new Error('Failed to update subscription status');
    }

    console.log('Subscription status updated to active');

    // Create VPN user using PanelUserCreationService (same as PaymentSuccess.tsx)
    console.log('Creating VPN user with PanelUserCreationService...');
    
    if (!subscription.plan_id) {
      console.error('No plan_id found in subscription');
      throw new Error('No plan_id found in subscription');
    }

    const vpnResult = await PanelUserCreationService.createUserFromPanel({
      planId: subscription.plan_id,
      username: subscription.username,
      dataLimitGB: subscription.data_limit_gb,
      durationDays: subscription.duration_days,
      notes: `Stripe payment verification - Session ID: ${sessionId}`,
      subscriptionId: subscription.id
    });

    console.log('VPN creation result:', vpnResult);

    if (!vpnResult.success || !vpnResult.data?.subscription_url) {
      console.error('VPN creation failed:', vpnResult);
      throw new Error('Failed to create VPN user');
    }

    console.log('VPN user created successfully');

    // Update subscription with VPN details
    const { error: vpnUpdateError } = await supabase
      .from('subscriptions')
      .update({
        subscription_url: vpnResult.data.subscription_url,
        marzban_user_created: true,
        expire_at: new Date(Date.now() + (subscription.duration_days * 24 * 60 * 60 * 1000)).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);

    if (vpnUpdateError) {
      console.error('Failed to update subscription with VPN details:', vpnUpdateError);
      // Don't fail completely, VPN was created
    }

    // Get final subscription data
    const { data: finalSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscription.id)
      .single();

    const responseData = finalSubscription || {
      ...subscription,
      status: 'active',
      subscription_url: vpnResult.data.subscription_url,
      marzban_user_created: true,
      expire_at: new Date(Date.now() + (subscription.duration_days * 24 * 60 * 60 * 1000)).toISOString()
    };

    console.log('Returning successful response for subscription:', responseData.id);

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
