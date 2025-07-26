import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let subscriptionId, action, token;

    if (req.method === 'GET') {
      // Handle URL parameters for email links
      const url = new URL(req.url);
      subscriptionId = url.searchParams.get('id');
      action = url.searchParams.get('action');
      token = url.searchParams.get('token');
    } else if (req.method === 'POST') {
      // Handle JSON body for frontend calls
      const body = await req.json();
      subscriptionId = body.id;
      action = body.action;
      token = body.token;
    }

    if (!subscriptionId || !action || !token) {
      return new Response('Missing parameters', { status: 400, headers: corsHeaders });
    }

    console.log('ADMIN_APPROVE: Verifying token for subscription:', subscriptionId);
    
    // Verify token by checking if it exists for this subscription
    const { data: tokenCheck, error: tokenError } = await supabase
      .from('subscriptions')
      .select('id, status, admin_decision')
      .eq('id', subscriptionId)
      .eq('admin_decision_token', token)
      .eq('admin_decision', 'pending')
      .maybeSingle();
    
    if (tokenError) {
      console.error('ADMIN_APPROVE: Token verification error:', tokenError);
      return new Response(`Database error: ${tokenError.message}`, { status: 500, headers: corsHeaders });
    }
    
    if (!tokenCheck) {
      console.error('ADMIN_APPROVE: Invalid token or subscription not found');
      return new Response('Invalid or expired token', { status: 401, headers: corsHeaders });
    }

    if (action === 'approve') {
      console.log('ADMIN_APPROVE: Fetching subscription data for:', subscriptionId);
      
      // First, get the full subscription data
      const { data: subscription, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .maybeSingle();

      if (fetchError) {
        console.error('ADMIN_APPROVE: Error fetching subscription:', fetchError);
        throw new Error(`Failed to fetch subscription: ${fetchError.message}`);
      }
      
      if (!subscription) {
        console.error('ADMIN_APPROVE: Subscription not found:', subscriptionId);
        throw new Error('Subscription not found');
      }

      console.log('ADMIN_APPROVE: Updating subscription status to active for:', subscriptionId);
      
      // Update subscription status
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          admin_decision: 'approved',
          admin_decided_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (updateError) {
        console.error('ADMIN_APPROVE: Error updating subscription status:', updateError);
        throw new Error(`Failed to update subscription: ${updateError.message}`);
      }

      // Create VPN user after approval
      try {
        console.log('ADMIN_APPROVE: Creating VPN user for approved subscription:', subscriptionId);
        
        if (subscription.plan_id) {
          // Get the plan and its assigned panel to determine the correct panel type
          console.log('ADMIN_APPROVE: Fetching plan and panel data for plan_id:', subscription.plan_id);
          
          const { data: planWithPanel, error: planError } = await supabase
            .from('subscription_plans')
            .select(`
              api_type,
              assigned_panel_id,
              panel_servers (
                type
              )
            `)
            .eq('id', subscription.plan_id)
            .maybeSingle();

          if (planError) {
            console.error('ADMIN_APPROVE: Error fetching plan data:', planError);
            throw new Error(`Failed to fetch plan data: ${planError.message}`);
          }

          if (!planWithPanel) {
            console.error('ADMIN_APPROVE: Plan not found for id:', subscription.plan_id);
            throw new Error('Subscription plan not found');
          }

          // Use the actual panel type, not the plan's api_type
          const panelType = planWithPanel.panel_servers?.type || planWithPanel.api_type;
          
          if (!panelType) {
            console.error('ADMIN_APPROVE: No panel type found for plan:', planWithPanel);
            throw new Error('Panel type not configured');
          }

          console.log('ADMIN_APPROVE: Using panel type:', panelType);
          
          const { data: vpnResult, error: vpnError } = await supabase.functions.invoke('create-user-direct', {
            body: {
              username: subscription.username,
              dataLimitGB: subscription.data_limit_gb,
              durationDays: subscription.duration_days,
              notes: `Admin approved subscription - Manual payment verified`,
              panelType: panelType, // Use the actual panel type, not plan.api_type
              subscriptionId: subscription.id,
              isFreeTriaL: false
            }
          });

          console.log('ADMIN_APPROVE: VPN creation result:', vpnResult);

          if (vpnError) {
            console.error('ADMIN_APPROVE: VPN creation function error:', vpnError);
            throw new Error(`VPN creation failed: ${vpnError.message}`);
          }

          if (vpnResult?.success && vpnResult?.data?.subscription_url) {
            // Update subscription with VPN details
            await supabase
              .from('subscriptions')
              .update({
                subscription_url: vpnResult.data.subscription_url,
                marzban_user_created: true,
                expire_at: new Date(Date.now() + (subscription.duration_days * 24 * 60 * 60 * 1000)).toISOString(),
                notes: `${subscription.notes || ''} - VPN created after admin approval`
              })
              .eq('id', subscriptionId);

            subscription.subscription_url = vpnResult.data.subscription_url;
            subscription.marzban_user_created = true;
            
            console.log('ADMIN_APPROVE: VPN user created successfully, subscription URL:', vpnResult.data.subscription_url);
          } else {
            console.error('ADMIN_APPROVE: VPN creation did not return expected data:', vpnResult);
            throw new Error('VPN creation succeeded but no subscription URL returned');
          }
        }
      } catch (vpnError) {
        console.error('ADMIN_APPROVE: VPN creation failed:', vpnError);
        // Don't fail the approval for VPN issues - but log the error clearly
        console.error('ADMIN_APPROVE: Subscription approved but VPN creation failed for subscription:', subscriptionId);
      }

      // Send webhook notification for approved subscription
      try {
        console.log('ADMIN_APPROVE: Sending newsub webhook for approved subscription');
        
        // Get full subscription with plan and panel details
        const { data: fullSubscription } = await supabase
          .from('subscriptions')
          .select(`
            *,
            subscription_plans (
              name_en,
              name_fa,
              plan_id,
              assigned_panel_id,
              panel_servers (
                name,
                type,
                panel_url,
                country_en
              )
            )
          `)
          .eq('id', subscriptionId)
          .single();

        const plan = fullSubscription?.subscription_plans;
        const panel = plan?.panel_servers;
        
        await supabase.functions.invoke('send-webhook-notification', {
          body: {
            type: 'new_subscription',
            webhook_type: 'newsub',
            subscription_id: subscriptionId,
            username: subscription.username,
            mobile: subscription.mobile,
            email: subscription.email,
            amount: subscription.price_toman,
            payment_method: 'manual_payment_approved',
            subscription_url: subscription.subscription_url,
            plan_name: plan?.name_en,
            plan_id: plan?.plan_id,
            panel_name: panel?.name,
            panel_type: panel?.type,
            panel_url: panel?.panel_url,
            panel_country: panel?.country_en,
            data_limit_gb: subscription.data_limit_gb,
            duration_days: subscription.duration_days,
            expire_at: subscription.expire_at,
            protocol: subscription.protocol,
            status: 'active',
            created_at: new Date().toISOString()
          }
        });
      } catch (webhookError) {
        console.error('ADMIN_APPROVE: Failed to send webhook notification:', webhookError);
        // Don't fail the approval for webhook issues
      }

      // Send user confirmation email
      try {
        await supabase.functions.invoke('send-subscription-emails', {
          body: {
            subscriptionId: subscriptionId,
            type: 'user_confirmation'
          }
        });
      } catch (emailError) {
        console.error('ADMIN_APPROVE: Failed to send user confirmation email:', emailError);
      }

      // Return success response with CORS headers
      if (req.method === 'GET') {
        // Return HTML for direct browser access (email links)
        return new Response(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: #16a34a;">✅ Subscription Approved!</h1>
              <p>Subscription ${subscriptionId} has been approved successfully.</p>
              <p>The user will be notified automatically and VPN access has been created.</p>
              <a href="https://e69ef03d-f51d-48e0-ac3f-fd85280ecf09.lovableproject.com/admin/users" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Go to Admin Panel
              </a>
            </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html', ...corsHeaders }
        });
      } else {
        // Return JSON for frontend calls
        return new Response(JSON.stringify({ success: true, message: 'Subscription approved successfully' }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    return new Response('Invalid action', { status: 400, headers: corsHeaders });
  } catch (error) {
    console.error('Approval error:', error);
    return new Response(`Error: ${error.message}`, { status: 500, headers: corsHeaders });
  }
};

serve(handler);