
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const subscriptionId = url.searchParams.get('id');
  const action = url.searchParams.get('action');
  const token = url.searchParams.get('token');

  if (!subscriptionId || !action || !token) {
    return new Response('Missing parameters', { status: 400 });
  }

  try {
    // Verify token (simple verification - in production, use more secure method)
    const decodedToken = atob(token);
    if (!decodedToken.startsWith(subscriptionId)) {
      return new Response('Invalid token', { status: 401 });
    }

    if (action === 'approve') {
      // First, get the full subscription data
      const { data: subscription, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (fetchError || !subscription) {
        throw new Error('Subscription not found');
      }

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
        throw updateError;
      }

      // Create VPN user after approval
      try {
        console.log('ADMIN_APPROVE: Creating VPN user for approved subscription:', subscriptionId);
        
        if (subscription.plan_id) {
          const { data: vpnResult, error: vpnError } = await supabase.functions.invoke('create-user-direct', {
            body: {
              planId: subscription.plan_id,
              username: subscription.username,
              dataLimitGB: subscription.data_limit_gb,
              durationDays: subscription.duration_days,
              notes: `Admin approved subscription - Manual payment verified`,
              subscriptionId: subscription.id
            }
          });

          console.log('ADMIN_APPROVE: VPN creation result:', vpnResult);

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
          }
        }
      } catch (vpnError) {
        console.error('ADMIN_APPROVE: VPN creation failed:', vpnError);
        // Don't fail the approval for VPN issues
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

      return new Response(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #16a34a;">✅ Subscription Approved!</h1>
            <p>Subscription ${subscriptionId} has been approved successfully.</p>
            <p>The user will be notified automatically and VPN access has been created.</p>
            <a href="https://main.dpng3e8bkfgqh3s5.lovableproject.com/admin/users" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Go to Admin Panel
            </a>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    return new Response('Invalid action', { status: 400 });
  } catch (error) {
    console.error('Approval error:', error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
};

serve(handler);
