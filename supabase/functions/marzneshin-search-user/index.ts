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
    const { panelId, searchQuery } = await req.json();
    
    console.log(`[MARZNESHIN-SEARCH-USER] Searching for: ${searchQuery} in panel: ${panelId}`);

    if (!searchQuery || searchQuery.trim().length < 2) {
      return new Response(JSON.stringify({
        success: true,
        users: []
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

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
      console.error(`[MARZNESHIN-SEARCH-USER] Panel not found:`, panelError);
      throw new Error(`Panel not found: ${panelError?.message}`);
    }

    console.log(`[MARZNESHIN-SEARCH-USER] Found panel: ${panel.name} at ${panel.panel_url}`);

    // Authenticate with Marzneshin
    console.log(`[MARZNESHIN-SEARCH-USER] Authenticating...`);
    const authResponse = await fetch(`${panel.panel_url}/api/admins/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: panel.username,
        password: panel.password
      })
    });

    if (!authResponse.ok) {
      throw new Error(`Authentication failed: ${authResponse.status} ${authResponse.statusText}`);
    }

    const authData = await authResponse.json();
    const token = authData.access_token;

    if (!token) {
      throw new Error('No access token received from authentication');
    }

    console.log(`[MARZNESHIN-SEARCH-USER] Authentication successful`);

    // Search for users
    console.log(`[MARZNESHIN-SEARCH-USER] Searching for users with query: ${searchQuery}`);
    const searchResponse = await fetch(`${panel.panel_url}/api/users?search=${encodeURIComponent(searchQuery.trim())}&limit=20`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!searchResponse.ok) {
      throw new Error(`Search failed: ${searchResponse.status} ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();
    console.log(`[MARZNESHIN-SEARCH-USER] Search response:`, searchData);

    // Handle different response formats
    let users = [];
    if (Array.isArray(searchData)) {
      users = searchData;
    } else if (searchData.users && Array.isArray(searchData.users)) {
      users = searchData.users;
    } else if (searchData.items && Array.isArray(searchData.items)) {
      users = searchData.items;
    } else {
      console.warn(`[MARZNESHIN-SEARCH-USER] Unexpected response format:`, searchData);
      users = [];
    }

    // Format users for consistent response
    const formattedUsers = users.map((user: any) => ({
      id: user.id || user.username,
      username: user.username,
      email: user.email || null,
      status: user.status || 'unknown',
      data_limit: user.data_limit || user.data_limit_bytes,
      used_traffic: user.used_traffic || user.used_traffic_bytes,
      expire_date: user.expire_date || user.expire_at,
      online: user.online || false,
      created_at: user.created_at,
      updated_at: user.updated_at
    }));

    console.log(`[MARZNESHIN-SEARCH-USER] Found ${formattedUsers.length} users`);

    return new Response(JSON.stringify({
      success: true,
      users: formattedUsers
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error('[MARZNESHIN-SEARCH-USER] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      users: []
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});