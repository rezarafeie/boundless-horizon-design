

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
    const { panelId, dateFrom, dateTo } = await req.json();
    
    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Getting system info for panel: ${panelId}`);
    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Date range: ${dateFrom} to ${dateTo}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get panel configuration
    const { data: panel, error: panelError } = await supabase
      .from('panel_servers')
      .select('*')
      .eq('id', panelId)
      .single();

    if (panelError || !panel) {
      console.error(`[MARZNESHIN-GET-SYSTEM-INFO] Panel not found:`, panelError);
      throw new Error(`Panel not found: ${panelError?.message}`);
    }

    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Found panel: ${panel.name} at ${panel.panel_url}`);

    // Verify panel has credentials
    if (!panel.username || !panel.password) {
      console.error(`[MARZNESHIN-GET-SYSTEM-INFO] Panel missing credentials:`, { 
        panelId: panel.id,
        panelName: panel.name,
        hasUsername: !!panel.username, 
        hasPassword: !!panel.password,
        panelUrl: panel.panel_url
      });
      throw new Error(`Panel ${panel.name} is missing username or password credentials`);
    }

    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Panel credentials check passed for: ${panel.name}`);

    // Authenticate with Marzneshin
    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Attempting authentication with: ${panel.panel_url}/api/admins/token`);
    
    let authResponse;
    try {
      authResponse = await fetch(`${panel.panel_url}/api/admins/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          username: panel.username,
          password: panel.password
        })
      });
    } catch (fetchError: any) {
      console.error(`[MARZNESHIN-GET-SYSTEM-INFO] Network error during authentication:`, fetchError);
      throw new Error(`Network error connecting to panel ${panel.name}: ${fetchError.message}`);
    }

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error(`[MARZNESHIN-GET-SYSTEM-INFO] Auth failed:`, {
        status: authResponse.status,
        statusText: authResponse.statusText,
        panelUrl: panel.panel_url,
        errorResponse: errorText,
        requestBody: { username: panel.username, password: '[REDACTED]' }
      });
      throw new Error(`Authentication failed for panel ${panel.name}: ${authResponse.status} ${authResponse.statusText}. Response: ${errorText}`);
    }

    let authData;
    try {
      authData = await authResponse.json();
    } catch (parseError: any) {
      console.error(`[MARZNESHIN-GET-SYSTEM-INFO] Failed to parse auth response:`, parseError);
      throw new Error(`Invalid response format from panel ${panel.name} authentication`);
    }

    const token = authData.access_token;

    if (!token) {
      console.error(`[MARZNESHIN-GET-SYSTEM-INFO] No access token in response:`, authData);
      throw new Error('No access token received from authentication');
    }

    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Authentication successful for panel: ${panel.name}`);

    // Get user status overview (ONLY user stats, no traffic stats)
    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Fetching user stats`);
    let userStatsData = null;
    try {
      const userStatsResponse = await fetch(`${panel.panel_url}/api/system/stats/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });

      if (userStatsResponse.ok) {
        userStatsData = await userStatsResponse.json();
        console.log(`[MARZNESHIN-GET-SYSTEM-INFO] User stats received successfully:`, userStatsData);
      } else {
        const errorText = await userStatsResponse.text();
        console.warn(`[MARZNESHIN-GET-SYSTEM-INFO] User stats API failed:`, {
          status: userStatsResponse.status,
          statusText: userStatsResponse.statusText,
          url: `${panel.panel_url}/api/system/stats/users`,
          errorResponse: errorText
        });
      }
    } catch (userStatsError: any) {
      console.error(`[MARZNESHIN-GET-SYSTEM-INFO] User stats API network error:`, userStatsError);
    }

    // Format response data to match the expected structure (without traffic data)
    const systemInfo = {
      total_user: userStatsData?.total || 0,
      users_active: userStatsData?.active || 0,
      users_expired: userStatsData?.expired || 0,
      users_disabled: userStatsData?.limited || 0,
      users_on_hold: userStatsData?.on_hold || 0,
      users_online: userStatsData?.online || 0,
      traffic_data: null, // No traffic data
      incoming_bandwidth: 0, // Set to 0 since we're not fetching traffic
      outgoing_bandwidth: 0 // Set to 0 since we're not fetching traffic
    };

    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Returning standardized system info (without traffic):`, systemInfo);

    return new Response(JSON.stringify({
      success: true,
      systemInfo
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error('[MARZNESHIN-GET-SYSTEM-INFO] Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    });
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString(),
      function: 'marzneshin-get-system-info'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

