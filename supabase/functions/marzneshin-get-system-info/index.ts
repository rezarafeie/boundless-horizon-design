
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

    // Step 1 & 2: Authentication with Fixed Headers (No User-Agent)
    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Attempting authentication with: ${panel.panel_url}/api/admins/token`);
    
    const authUrl = `${panel.panel_url}/api/admins/token`;
    const authData = {
      username: panel.username,
      password: panel.password
    };

    let authResponse;
    let authAttempts = [];

    // Try JSON format first (without User-Agent header)
    try {
      console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Attempting JSON authentication...`);
      
      const jsonHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      console.log(`[MARZNESHIN-GET-SYSTEM-INFO] JSON Auth Headers:`, jsonHeaders);
      
      authResponse = await fetch(authUrl, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(authData)
      });

      const responseText = await authResponse.text();
      console.log(`[MARZNESHIN-GET-SYSTEM-INFO] JSON Auth Response:`, {
        status: authResponse.status,
        statusText: authResponse.statusText,
        headers: Object.fromEntries(authResponse.headers.entries()),
        body: responseText,
        bodyLength: responseText.length,
        bodyType: typeof responseText
      });
      
      // Try to parse and examine the response structure
      try {
        const parsedResponse = JSON.parse(responseText);
        console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Parsed JSON Auth Response:`, parsedResponse);
        console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Available keys in response:`, Object.keys(parsedResponse));
      } catch (parseErr) {
        console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Could not parse auth response as JSON:`, parseErr);
      }

      authAttempts.push({
        format: 'JSON',
        status: authResponse.status,
        success: authResponse.ok,
        response: responseText
      });

      // If JSON format fails with 422, try form-encoded format
      if (!authResponse.ok && authResponse.status === 422) {
        console.log(`[MARZNESHIN-GET-SYSTEM-INFO] JSON format failed with 422, trying form-encoded...`);
        
        const formHeaders = {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        };
        
        console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Form Auth Headers:`, formHeaders);
        
        const formData = new URLSearchParams();
        formData.append('username', panel.username);
        formData.append('password', panel.password);

        authResponse = await fetch(authUrl, {
          method: 'POST',
          headers: formHeaders,
          body: formData.toString()
        });

        const formResponseText = await authResponse.text();
        console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Form Auth Response:`, {
          status: authResponse.status,
          statusText: authResponse.statusText,
          headers: Object.fromEntries(authResponse.headers.entries()),
          body: formResponseText,
          bodyLength: formResponseText.length,
          bodyType: typeof formResponseText
        });
        
        // Try to parse and examine the form response structure
        try {
          const parsedFormResponse = JSON.parse(formResponseText);
          console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Parsed Form Auth Response:`, parsedFormResponse);
          console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Available keys in form response:`, Object.keys(parsedFormResponse));
        } catch (parseErr) {
          console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Could not parse form response as JSON:`, parseErr);
        }

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

    // Step 4: Enhanced Token Handling - Use the last successful response
    let authDataResponse;
    let responseText;
    
    try {
      // Get the response text from the most recent successful authentication
      responseText = await authResponse.text();
      console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Raw auth response:`, responseText);
      
      authDataResponse = JSON.parse(responseText);
      
      console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Final parsed auth response:`, authDataResponse);
      console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Auth response keys:`, Object.keys(authDataResponse || {}));
      console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Auth response type:`, typeof authDataResponse);
      
    } catch (parseError: any) {
      console.error(`[MARZNESHIN-GET-SYSTEM-INFO] Failed to parse auth response:`, parseError);
      console.error(`[MARZNESHIN-GET-SYSTEM-INFO] Raw response that failed:`, responseText);
      throw new Error(`Invalid response format from panel ${panel.name} authentication: ${parseError.message}`);
    }

    // Try different possible token field names
    const token = authDataResponse.access_token || 
                  authDataResponse.token || 
                  authDataResponse.accessToken ||
                  authDataResponse.access ||
                  authDataResponse.auth_token;

    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Looking for token in response...`);
    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] access_token:`, authDataResponse.access_token);
    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] token:`, authDataResponse.token);
    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] accessToken:`, authDataResponse.accessToken);
    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Found token:`, !!token);

    if (!token) {
      console.error(`[MARZNESHIN-GET-SYSTEM-INFO] No access token in response. Full response:`, JSON.stringify(authDataResponse, null, 2));
      console.error(`[MARZNESHIN-GET-SYSTEM-INFO] Panel: ${panel.name}, URL: ${panel.panel_url}`);
      throw new Error(`No access token received from authentication. Response keys: ${Object.keys(authDataResponse || {}).join(', ')}`);
    }

    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Authentication successful for panel: ${panel.name}`);
    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Token received (first 20 chars): ${token.substring(0, 20)}...`);

    // Validate token format
    if (typeof token !== 'string' || token.length < 10) {
      console.error(`[MARZNESHIN-GET-SYSTEM-INFO] Invalid token format:`, { tokenType: typeof token, tokenLength: token?.length });
      throw new Error('Invalid token format received');
    }

    // Step 5: Enhanced User Stats API Call with Proper Token Handling
    const userStatsUrl = `${panel.panel_url}/api/system/stats/users`;
    console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Fetching user stats from: ${userStatsUrl}`);
    let userStatsData = null;
    
    try {
      // Use minimal headers - only Authorization and Accept
      const statsHeaders = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };
      
      console.log(`[MARZNESHIN-GET-SYSTEM-INFO] User Stats Headers:`, statsHeaders);
      console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Making authenticated API call to get user stats...`);
      
      const userStatsResponse = await fetch(userStatsUrl, {
        method: 'GET',
        headers: statsHeaders
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
          
          // Validate that we have the expected data structure
          if (!userStatsData || typeof userStatsData !== 'object') {
            throw new Error('Invalid user stats data structure');
          }
          
        } catch (parseError: any) {
          console.error(`[MARZNESHIN-GET-SYSTEM-INFO] Failed to parse user stats response:`, parseError);
          console.error(`[MARZNESHIN-GET-SYSTEM-INFO] Raw response that failed to parse:`, responseText);
          
          // Try to continue with null data instead of throwing
          userStatsData = null;
        }
      } else {
        const errorText = await userStatsResponse.text();
        console.error(`[MARZNESHIN-GET-SYSTEM-INFO] User stats API FAILED - AUTHENTICATION ISSUE:`, {
          status: userStatsResponse.status,
          statusText: userStatsResponse.statusText,
          url: userStatsUrl,
          errorResponse: errorText,
          tokenUsed: `Bearer ${token.substring(0, 20)}...`,
          headersUsed: statsHeaders,
          panelName: panel.name,
          panelUrl: panel.panel_url
        });
        
        // This is likely the authentication error the user is seeing
        throw new Error(`Authentication failed for user stats API call. Status: ${userStatsResponse.status}. Panel may have invalid credentials or token expired.`);
      }
    } catch (userStatsError: any) {
      console.error(`[MARZNESHIN-GET-SYSTEM-INFO] User stats API network error:`, userStatsError);
      
      // Re-throw authentication errors, but handle network errors gracefully
      if (userStatsError.message.includes('Authentication failed')) {
        throw userStatsError;
      }
      
      console.log(`[MARZNESHIN-GET-SYSTEM-INFO] Continuing with null user stats data due to network error`);
      userStatsData = null;
    }

    // Step 6: Enhanced Response Format with Detailed Success Info
    const systemInfo = {
      total: userStatsData?.total || 0,
      active: userStatsData?.active || 0,
      expired: userStatsData?.expired || 0,
      limited: userStatsData?.limited || 0,
      on_hold: userStatsData?.on_hold || 0,
      online: userStatsData?.online || 0
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
        headersFix: 'Removed User-Agent and Content-Type from GET requests',
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
