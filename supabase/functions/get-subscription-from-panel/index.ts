
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
    const { username, panelType } = await req.json();
    
    if (!username) {
      throw new Error("Username is required");
    }

    console.log(`Fetching subscription for ${username} from ${panelType} panel`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let userData = null;

    if (panelType === 'marzneshin') {
      // Call Marzneshin get user function
      const { data, error } = await supabase.functions.invoke('marzneshin-get-user', {
        body: { username }
      });

      if (error) {
        console.error('Marzneshin get user error:', error);
        throw new Error(`Failed to fetch from Marzneshin: ${error.message}`);
      }

      if (data?.success && data?.user) {
        userData = {
          username: data.user.username,
          subscription_url: data.user.subscription_url,
          expire: data.user.expire_date ? new Date(data.user.expire_date).getTime() : null,
          data_limit: data.user.data_limit,
          status: data.user.is_active ? 'active' : 'inactive',
          used_traffic: data.user.used_traffic || 0
        };
      }
    } else if (panelType === 'marzban') {
      // Call Marzban get user function
      const { data, error } = await supabase.functions.invoke('marzban-get-user', {
        body: { username }
      });

      if (error) {
        console.error('Marzban get user error:', error);
        throw new Error(`Failed to fetch from Marzban: ${error.message}`);
      }

      if (data?.success && data?.user) {
        userData = {
          username: data.user.username,
          subscription_url: data.user.subscription_url,
          expire: data.user.expire ? data.user.expire * 1000 : null, // Convert to milliseconds
          data_limit: data.user.data_limit,
          status: data.user.status || 'active',
          used_traffic: data.user.used_traffic || 0
        };
      }
    } else {
      throw new Error(`Unsupported panel type: ${panelType}`);
    }

    if (!userData) {
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
          status: userData.status
        })
        .eq('username', username);

      if (updateError) {
        console.error('Failed to update subscription in database:', updateError);
      }
    }

    console.log(`Successfully fetched subscription data for ${username}`);

    return new Response(JSON.stringify({
      success: true,
      data: userData
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Get subscription from panel error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
