
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
    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Using credentials - Username: ${panel.username}, Password length: ${panel.password.length}`);

    // Step 1 & 2: Enhanced Authentication with Multiple Formats
    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Attempting authentication with: ${panel.panel_url}/api/admins/token`);
    
    const authUrl = `${panel.panel_url}/api/admins/token`;
    const authData = {
      username: panel.username,
      password: panel.password
    };

    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Authentication request data:`, {
      url: authUrl,
      username: panel.username,
      passwordLength: panel.password.length,
      requestBody: JSON.stringify(authData)
    });

    let authResponse;
    let authAttempts = [];

    // Try JSON format first (current format)
    try {
      console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Attempting JSON authentication...`);
      authResponse = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Marzneshin-API-Client/1.0'
        },
        body: JSON.stringify(authData)
      });

      const responseText = await authResponse.text();
      console.log(`[MARZNESHIN-GET-SYSTEM-INFO] JSON Auth Response:`, {
        status: authResponse.status,
        statusText: authResponse.statusText,
        headers: Object.fromEntries(authResponse.headers.entries()),
        body: responseText
      });

      authAttempts.push({
        format: 'JSON',
        status: authResponse.status,
        success: authResponse.ok,
        response: responseText
      });

      // If JSON format fails with 422, try form-encoded format
      if (!authResponse.ok && authResponse.status === 422) {
        console.log(`[MARZNESHIN-GET-SYSTEM-INFO] JSON format failed with 422, trying form-encoded...`);
        
        const formData = new URLSearchParams();
        formData.append('username', panel.username);
        formData.append('password', panel.password);

        authResponse = await fetch(authUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'Marzneshin-API-Client/1.0'
          },
          body: formData.toString()
        });

        const formResponseText = await authResponse.text();
        console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Form Auth Response:`, {
          status: authResponse.status,
          statusText: authResponse.statusText,
          headers: Object.fromEntries(authResponse.headers.entries()),
          body: formResponseText
        });

        authAttempts.push({
          format: 'FORM',
          status: authResponse.status,
          success: authResponse.ok,
          response: formResponseText
        });
      }

    } catch (fetchError: any) {
      console.error(`[MARZNESHIN-GET-SYSTEM-INFO] Network error during authentication:`, fetchError);
      throw new Error(`Network error connecting to panel ${panel.name}: ${fetchError.message}`);
    }

    // Step 3: Enhanced Error Handling for Authentication
    if (!authResponse.ok) {
      let errorDetails;
      try {
        const errorText = await authResponse.text();
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          errorDetails = { message: errorText };
        }
      } catch {
        errorDetails = { message: 'Unknown error' };
      }

      console.error(`[MARZNESHIN-GET-SYSTEM-INFO] Authentication failed:`, {
        status: authResponse.status,
        statusText: authResponse.statusText,
        panelUrl: panel.panel_url,
        username: panel.username,
        errorDetails: errorDetails,
        allAttempts: authAttempts
      });

      throw new Error(`Authentication failed for panel ${panel.name}: ${authResponse.status} ${authResponse.statusText}. Error: ${JSON.stringify(errorDetails)}. Tried formats: ${authAttempts.map(a => `${a.format}(${a.status})`).join(', ')}`);
    }

    // Step 4: Enhanced Token Handling
    let authDataResponse;
    try {
      const responseText = await authResponse.text();
      console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Raw auth response:`, responseText);
      authDataResponse = JSON.parse(responseText);
    } catch (parseError: any) {
      console.error(`[MARZNESHIN-GET-SYSTEM-INFO] Failed to parse auth response:`, parseError);
      throw new Error(`Invalid response format from panel ${panel.name} authentication`);
    }

    const token = authDataResponse.access_token;

    if (!token) {
      console.error(`[MARZNESHIN-GET-SYSTEM-INFO] No access token in response:`, authDataResponse);
      throw new Error('No access token received from authentication');
    }

    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Authentication successful for panel: ${panel.name}`);
    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Token received (first 20 chars): ${token.substring(0, 20)}...`);

    // Validate token format
    if (typeof token !== 'string' || token.length < 10) {
      console.error(`[MARZNESHIN-GET-SYSTEM-INFO] Invalid token format:`, { tokenType: typeof token, tokenLength: token?.length });
      throw new Error('Invalid token format received');
    }

    // Step 5: Enhanced User Stats API Call with Better Error Handling
    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Fetching user stats from: ${panel.panel_url}/api/system/stats/users`);
    
    const userStatsUrl = `${panel.panel_url}/api/system/stats/users`;
    let userStatsData = null;
    
    try {
      const userStatsResponse = await fetch(userStatsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Marzneshin-API-Client/1.0'
        }
      });

      console.log(`[MARZNESHIN-GET-SYSTEM-INFO] User stats response:`, {
        status: userStatsResponse.status,
        statusText: userStatsResponse.statusText,
        headers: Object.fromEntries(userStatsResponse.headers.entries())
      });

      if (userStatsResponse.ok) {
        const responseText = await userStatsResponse.text();
        console.log(`[MARZNESHIN-GET-SYSTEM-INFO] User stats raw response:`, responseText);
        
        try {
          userStatsData = JSON.parse(responseText);
          console.log(`[MARZNESHIN-GET-SYSTEM-INFO] User stats parsed successfully:`, userStatsData);
        } catch (parseError: any) {
          console.error(`[MARZNESHIN-GET-SYSTEM-INFO] Failed to parse user stats response:`, parseError);
          throw new Error(`Invalid JSON in user stats response: ${parseError.message}`);
        }
      } else {
        const errorText = await userStatsResponse.text();
        console.error(`[MARZNESHIN-GET-SYSTEM-INFO] User stats API failed:`, {
          status: userStatsResponse.status,
          statusText: userStatsResponse.statusText,
          url: userStatsUrl,
          errorResponse: errorText,
          tokenUsed: `${token.substring(0, 20)}...`
        });
        
        // Don't throw error, just log and continue with null data
        userStatsData = null;
      }
    } catch (userStatsError: any) {
      console.error(`[MARZNESHIN-GET-SYSTEM-INFO] User stats API network error:`, userStatsError);
      userStatsData = null;
    }

    // Step 6: Enhanced Response Format with Detailed Success Info
    const systemInfo = {
      total_user: userStatsData?.total || 0,
      users_active: userStatsData?.active || 0,
      users_expired: userStatsData?.expired || 0,
      users_disabled: userStatsData?.limited || 0,
      users_on_hold: userStatsData?.on_hold || 0,
      users_online: userStatsData?.online || 0,
      traffic_data: null, // No traffic data for now
      incoming_bandwidth: 0,
      outgoing_bandwidth: 0
    };

    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Returning final system info:`, systemInfo);

    return new Response(JSON.stringify({
      success: true,
      systemInfo,
      debugInfo: {
        panelName: panel.name,
        panelUrl: panel.panel_url,
        authAttempts: authAttempts,
        tokenReceived: !!token,
        userStatsSuccess: !!userStatsData,
        timestamp: new Date().toISOString()
      }
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
