
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
    const { panelId } = await req.json();
    
    console.log(`[MARZBAN-GET-SYSTEM-INFO] Getting system info for panel: ${panelId}`);

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
      throw new Error(`Panel not found: ${panelError?.message}`);
    }

    console.log(`[MARZBAN-GET-SYSTEM-INFO] Found panel: ${panel.name}`);

    // Get admin token first
    const tokenResponse = await fetch(`${panel.panel_url}/api/admin/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: panel.username,
        password: panel.password,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to get admin token: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const adminToken = tokenData.access_token;

    if (!adminToken) {
      throw new Error('No access token received from panel');
    }

    // Get system info
    const systemResponse = await fetch(`${panel.panel_url}/api/system`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!systemResponse.ok) {
      throw new Error(`Failed to get system info: ${systemResponse.status}`);
    }

    const systemInfo = await systemResponse.json();
    
    console.log(`[MARZBAN-GET-SYSTEM-INFO] Successfully retrieved system info for ${panel.name}`);

    return new Response(JSON.stringify({
      success: true,
      systemInfo: systemInfo
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('[MARZBAN-GET-SYSTEM-INFO] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
