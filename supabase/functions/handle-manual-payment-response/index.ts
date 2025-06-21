
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const action = url.searchParams.get('action');

    if (!token || !action) {
      return new Response(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2>❌ Invalid Request</h2>
            <p>Missing token or action parameter.</p>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
        status: 400,
      });
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find subscription by decision token
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('admin_decision_token', token)
      .eq('admin_decision', 'pending')
      .single();

    if (fetchError || !subscription) {
      return new Response(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2>❌ Invalid or Expired Token</h2>
            <p>This decision has already been processed or the token is invalid.</p>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
        status: 404,
      });
    }

    if (action === 'approve') {
      // Approve payment and create VPN user
      try {
        console.log('Approving payment for subscription:', subscription.id);

        // Get the plan configuration from database to determine which API to use
        let planApiType = 'marzneshin'; // Default fallback
        let primaryPanelId = null;
        
        // Try to get plan information from subscription notes or lookup by plan ID
        if (subscription.notes) {
          // Extract plan info from notes - look for patterns like "Plan: lite" or "Plan: pro"
          const planMatch = subscription.notes.match(/Plan:\s*(\w+)/i);
          if (planMatch) {
            const planName = planMatch[1].toLowerCase();
            console.log('Found plan name in notes:', planName);
            
            // Query the subscription_plans table to get the API type
            const { data: planData, error: planError } = await supabase
              .from('subscription_plans')
              .select('api_type, id')
              .ilike('plan_id', planName)
              .eq('is_active', true)
              .single();
            
            if (!planError && planData) {
              planApiType = planData.api_type;
              console.log('Found plan API type from database:', planApiType);
              
              // Get the primary panel for this plan
              const { data: mappingData, error: mappingError } = await supabase
                .from('plan_panel_mappings')
                .select(`
                  panel_id,
                  is_primary,
                  panel_servers (
                    id,
                    name,
                    type,
                    is_active
                  )
                `)
                .eq('plan_id', planData.id)
                .eq('is_primary', true)
                .single();
              
              if (!mappingError && mappingData) {
                primaryPanelId = mappingData.panel_id;
                console.log('Found primary panel for plan:', primaryPanelId);
              }
            } else {
              console.warn('Could not find plan in database, using default API type');
            }
          }
        }

        console.log(`Using API type: ${planApiType} for subscription:`, subscription.id);

        // Create VPN user via the appropriate API
        let vpnResult = null;
        let apiUsed = '';
        
        if (planApiType === 'marzban') {
          console.log('Creating VPN user via Marzban API...');
          const { data: marzbanResult, error: marzbanError } = await supabase.functions.invoke(
            'marzban-create-user',
            {
              body: {
                username: subscription.username,
                dataLimitGB: subscription.data_limit_gb,
                durationDays: subscription.duration_days,
                notes: `Manual payment approved - Amount: ${subscription.price_toman} Toman`
              }
            }
          );
          
          if (marzbanError) {
            console.error('Marzban API error:', marzbanError);
            throw new Error(`VPN user creation failed via Marzban: ${marzbanError.message}`);
          }
          
          if (!marzbanResult?.success) {
            throw new Error(`VPN user creation failed via Marzban: ${marzbanResult?.error || 'Unknown error'}`);
          }
          
          vpnResult = marzbanResult.data;
          apiUsed = 'marzban';
        } else {
          console.log('Creating VPN user via Marzneshin API...');
          const { data: marzneshinResult, error: marzneshinError } = await supabase.functions.invoke(
            'marzneshin-create-user',
            {
              body: {
                username: subscription.username,
                dataLimitGB: subscription.data_limit_gb,
                durationDays: subscription.duration_days,
                notes: `Manual payment approved - Amount: ${subscription.price_toman} Toman`
              }
            }
          );
          
          if (marzneshinError) {
            console.error('Marzneshin API error:', marzneshinError);
            throw new Error(`VPN user creation failed via Marzneshin: ${marzneshinError.message}`);
          }
          
          if (!marzneshinResult?.success) {
            throw new Error(`VPN user creation failed via Marzneshin: ${marzneshinResult?.error || 'Unknown error'}`);
          }
          
          vpnResult = marzneshinResult.data;
          apiUsed = 'marzneshin';
        }

        // Update subscription status
        const updateData: any = {
          admin_decision: 'approved',
          admin_decided_at: new Date().toISOString(),
          status: 'active',
          marzban_user_created: true,
          expire_at: new Date(Date.now() + subscription.duration_days * 24 * 60 * 60 * 1000).toISOString()
        };

        if (vpnResult?.subscription_url) {
          updateData.subscription_url = vpnResult.subscription_url;
        }

        // Update notes to include which API was used
        const existingNotes = subscription.notes || '';
        updateData.notes = `${existingNotes} - VPN created via ${apiUsed}`;

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update(updateData)
          .eq('id', subscription.id);

        if (updateError) {
          throw new Error('Failed to update subscription status');
        }

        console.log(`Payment approved and VPN user created successfully via ${apiUsed}`);

        // Create the delivery page URL with subscription ID
        const deliveryUrl = `https://feamvyruipxtafzhptkh.supabase.co/delivery?id=${subscription.id}`;

        return new Response(`
          <html>
            <head>
              <meta http-equiv="refresh" content="3;url=${deliveryUrl}">
            </head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h2 style="color: #22c55e;">✅ Payment Approved</h2>
              <p>The manual payment has been approved and the VPN subscription has been activated.</p>
              <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Subscription Details</h3>
                <p><strong>Username:</strong> ${subscription.username}</p>
                <p><strong>Data Limit:</strong> ${subscription.data_limit_gb} GB</p>
                <p><strong>Duration:</strong> ${subscription.duration_days} days</p>
                <p><strong>Status:</strong> Active</p>
                <p><strong>API Used:</strong> ${apiUsed}</p>
              </div>
              <p style="color: #6b7280; margin-top: 20px;">Redirecting to subscription details in 3 seconds...</p>
              <a href="${deliveryUrl}" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">View Subscription Details</a>
            </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' },
        });

      } catch (error) {
        console.error('Error approving payment:', error);
        
        // Update with error status
        await supabase
          .from('subscriptions')
          .update({
            admin_decision: 'approved',
            admin_decided_at: new Date().toISOString(),
            status: 'pending_activation',
            notes: `Manual payment approved but VPN creation failed: ${error.message}`
          })
          .eq('id', subscription.id);

        return new Response(`
          <html>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h2 style="color: #f59e0b;">⚠️ Partial Success</h2>
              <p>Payment approved but VPN creation failed. Please check the admin panel.</p>
              <p style="color: #ef4444; font-size: 14px;">Error: ${error.message}</p>
            </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

    } else if (action === 'reject') {
      // Reject payment
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          admin_decision: 'rejected',
          admin_decided_at: new Date().toISOString(),
          status: 'rejected'
        })
        .eq('id', subscription.id);

      if (updateError) {
        throw new Error('Failed to update subscription status');
      }

      console.log('Payment rejected for subscription:', subscription.id);

      return new Response(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2 style="color: #ef4444;">❌ Payment Rejected</h2>
            <p>The manual payment has been rejected.</p>
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Subscription Details</h3>
              <p><strong>Username:</strong> ${subscription.username}</p>
              <p><strong>Amount:</strong> ${subscription.price_toman.toLocaleString()} Toman</p>
              <p><strong>Status:</strong> Rejected</p>
            </div>
            <p style="color: #6b7280; font-size: 14px;">The user will be notified of the rejection.</p>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });

    } else {
      return new Response(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2>❌ Invalid Action</h2>
            <p>Action must be either 'approve' or 'reject'.</p>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
        status: 400,
      });
    }

  } catch (error) {
    console.error('Admin response handling error:', error);
    return new Response(`
      <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h2>❌ Server Error</h2>
          <p>An error occurred while processing your request.</p>
          <p style="color: #ef4444; font-size: 14px;">${error.message}</p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
      status: 500,
    });
  }
});
