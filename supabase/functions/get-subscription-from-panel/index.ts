
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, panelType, panelUrl, panelId } = await req.json();
    
    if (!username) {
      throw new Error("Username is required");
    }

    console.log(`[GET-SUBSCRIPTION-FROM-PANEL] Fetching subscription for ${username} from ${panelType} panel (${panelUrl || 'default'})`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let userData = null;

    // If panelId is provided, get panel credentials from database
    let panelConfig = null;
    if (panelId) {
      const { data: panel, error: panelError } = await supabase
        .from('panel_servers')
        .select('*')
        .eq('id', panelId)  
        .single();

      if (!panelError && panel) {
        panelConfig = panel;
        console.log(`[GET-SUBSCRIPTION-FROM-PANEL] Using panel configuration: ${panel.name} (${panel.panel_url})`);
      }
    }

    if (panelType === 'marzneshin') {
      // Call Marzneshin get user function with dynamic config
      const { data, error } = await supabase.functions.invoke('marzneshin-get-user', {
        body: { 
          username,
          panelConfig: panelConfig // Pass panel config if available
        }
      });

      if (error) {
        console.error('[GET-SUBSCRIPTION-FROM-PANEL] Marzneshin get user error:', error);
        throw new Error(`Failed to fetch from Marzneshin: ${error.message}`);
      }

      if (data?.success && data?.user) {
        userData = {
          username: data.user.username,
          subscription_url: data.user.subscription_url,
          expire_at: data.user.expire_date ? new Date(data.user.expire_date).toISOString() : null,
          data_limit: data.user.data_limit,
          status: data.user.is_active ? 'active' : 'inactive',
          used_traffic: data.user.used_traffic || 0
        };
      }
    } else if (panelType === 'marzban') {
      // Call Marzban get user function with dynamic config
      const { data, error } = await supabase.functions.invoke('marzban-get-user', {
        body: { 
          username,
          panelConfig: panelConfig // Pass panel config if available
        }
      });

      if (error) {
        console.error('[GET-SUBSCRIPTION-FROM-PANEL] Marzban get user error:', error);
        throw new Error(`Failed to fetch from Marzban: ${error.message}`);
      }

      if (data?.success && data?.user) {
        userData = {
          username: data.user.username,
          subscription_url: data.user.subscription_url,
          expire_at: data.user.expire ? new Date(data.user.expire * 1000).toISOString() : null,
          data_limit: data.user.data_limit,
          status: data.user.status || 'active',
          used_traffic: data.user.used_traffic || 0
        };
      }
    } else {
      throw new Error(`Unsupported panel type: ${panelType}`);
    }

    if (!userData) {
      console.log(`[GET-SUBSCRIPTION-FROM-PANEL] User not found: ${username}`);
      return new Response(JSON.stringify({
        success: false,
        error: "User not found in panel"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Update the subscription in database with fresh data
    if (userData.subscription_url) {
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ 
          subscription_url: userData.subscription_url,
          status: userData.status,
          expire_at: userData.expire_at
        })
        .eq('username', username);

      if (updateError) {
        console.error('[GET-SUBSCRIPTION-FROM-PANEL] Failed to update subscription in database:', updateError);
      } else {
        console.log(`[GET-SUBSCRIPTION-FROM-PANEL] Updated subscription in database for ${username}`);
      }
    }

    console.log(`[GET-SUBSCRIPTION-FROM-PANEL] Successfully fetched subscription data for ${username} from ${panelType} panel`);

    // FIXED: Return the format that DeliveryPage expects
    return new Response(JSON.stringify({
      success: true,
      subscription: userData  // Changed from 'data' to 'subscription'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('[GET-SUBSCRIPTION-FROM-PANEL] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
