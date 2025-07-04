
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

    // For Marzneshin panels, the API connection is not yet implemented
    // Return an error instead of fake data
    throw new Error('Marzneshin API integration not yet implemented');

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
