
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
        hasUsername: !!panel.username, 
        hasPassword: !!panel.password 
      });
      throw new Error(`Panel ${panel.name} is missing username or password credentials`);
    }

    // Authenticate with Marzneshin
    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Authenticating with: ${panel.panel_url}`);
    const authResponse = await fetch(`${panel.panel_url}/api/admins/token`, {
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

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error(`[MARZNESHIN-GET-SYSTEM-INFO] Auth failed: ${authResponse.status} - ${errorText}`);
      throw new Error(`Authentication failed for panel ${panel.name}: ${authResponse.status} ${authResponse.statusText}. Response: ${errorText}`);
    }

    const authData = await authResponse.json();
    const token = authData.access_token;

    if (!token) {
      throw new Error('No access token received from authentication');
    }

    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Authentication successful`);

    // Set date range (default to last 7 days if not provided)
    const endDate = dateTo ? new Date(dateTo) : new Date();
    const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get traffic analytics
    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Fetching traffic stats from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    const trafficResponse = await fetch(`${panel.panel_url}/api/system/stats/traffic?start=${startDate.toISOString()}&end=${endDate.toISOString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    let trafficData = null;
    if (trafficResponse.ok) {
      trafficData = await trafficResponse.json();
      console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Traffic data received:`, trafficData);
    } else {
      const errorText = await trafficResponse.text();
      console.warn(`[MARZNESHIN-GET-SYSTEM-INFO] Traffic API failed: ${trafficResponse.status} - ${errorText}`);
    }

    // Get user status overview
    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Fetching user stats`);
    const userStatsResponse = await fetch(`${panel.panel_url}/api/system/stats/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    let userStatsData = null;
    if (userStatsResponse.ok) {
      userStatsData = await userStatsResponse.json();
      console.log(`[MARZNESHIN-GET-SYSTEM-INFO] User stats received:`, userStatsData);
    } else {
      const errorText = await userStatsResponse.text();
      console.warn(`[MARZNESHIN-GET-SYSTEM-INFO] User stats API failed: ${userStatsResponse.status} - ${errorText}`);
    }

    // Format response data
    const systemInfo = {
      total_user: userStatsData?.total || 0,
      users_active: userStatsData?.active || 0,
      users_expired: userStatsData?.expired || 0,
      users_disabled: userStatsData?.limited || 0,
      users_on_hold: userStatsData?.on_hold || 0,
      users_online: userStatsData?.online || 0,
      traffic_data: trafficData || [],
      incoming_bandwidth: 0, // Will be calculated from traffic data
      outgoing_bandwidth: 0  // Will be calculated from traffic data
    };

    // Calculate total bandwidth if traffic data is available
    if (trafficData && Array.isArray(trafficData)) {
      let totalIncoming = 0;
      let totalOutgoing = 0;
      
      trafficData.forEach((point: any) => {
        totalIncoming += point.incoming || 0;
        totalOutgoing += point.outgoing || 0;
      });
      
      systemInfo.incoming_bandwidth = totalIncoming;
      systemInfo.outgoing_bandwidth = totalOutgoing;
    }

    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Returning system info:`, systemInfo);

    return new Response(JSON.stringify({
      success: true,
      systemInfo
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('[MARZNESHIN-GET-SYSTEM-INFO] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
