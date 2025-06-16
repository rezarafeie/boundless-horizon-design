
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MARZBAN-GET-USER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { username } = await req.json();
    if (!username) {
      throw new Error("Username is required");
    }

    logStep("Searching for user", { username });

    // Get Marzban API credentials from Supabase secrets
    const marzbanBaseUrl = Deno.env.get("MARZBAN_BASE_URL");
    const marzbanUsername = Deno.env.get("MARZBAN_ADMIN_USERNAME");
    const marzbanPassword = Deno.env.get("MARZBAN_ADMIN_PASSWORD");

    // Debug logging for environment variables (safely)
    logStep("Environment check", {
      baseUrlExists: !!marzbanBaseUrl,
      usernameExists: !!marzbanUsername,
      passwordExists: !!marzbanPassword,
      baseUrl: marzbanBaseUrl ? `${marzbanBaseUrl.substring(0, 20)}...` : 'NOT_SET'
    });

    if (!marzbanBaseUrl || !marzbanUsername || !marzbanPassword) {
      const missingVars = [];
      if (!marzbanBaseUrl) missingVars.push('MARZBAN_BASE_URL');
      if (!marzbanUsername) missingVars.push('MARZBAN_ADMIN_USERNAME');
      if (!marzbanPassword) missingVars.push('MARZBAN_ADMIN_PASSWORD');
      
      throw new Error(`Marzban credentials not configured. Missing: ${missingVars.join(', ')}`);
    }

    // Clean base URL (remove trailing slash)
    const baseUrl = marzbanBaseUrl.replace(/\/$/, '');
    const authUrl = `${baseUrl}/api/admin/token`;
    
    logStep("Authentication attempt", { url: authUrl });

    // First, get auth token
    const authResponse = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        username: marzbanUsername,
        password: marzbanPassword,
      }),
    });

    logStep("Auth response received", { 
      status: authResponse.status, 
      statusText: authResponse.statusText,
      headers: Object.fromEntries(authResponse.headers.entries())
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      logStep("Auth failed", { status: authResponse.status, error: errorText });
      throw new Error(`Failed to authenticate with Marzban: ${authResponse.status} - ${errorText}`);
    }

    const authData = await authResponse.json();
    
    if (!authData.access_token) {
      logStep("No access token in response", authData);
      throw new Error("No access token received from Marzban authentication");
    }

    const token = authData.access_token;
    logStep("Got auth token successfully");

    // Now get user data
    const userUrl = `${baseUrl}/api/users/${encodeURIComponent(username)}`;
    logStep("Fetching user data", { url: userUrl });
    
    const userResponse = await fetch(userUrl, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    logStep("User response received", { 
      status: userResponse.status, 
      statusText: userResponse.statusText 
    });

    if (!userResponse.ok) {
      if (userResponse.status === 404) {
        logStep("User not found");
        return new Response(JSON.stringify({
          success: false,
          error: "User not found",
          user: null
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      const errorText = await userResponse.text();
      logStep("User fetch failed", { status: userResponse.status, error: errorText });
      throw new Error(`Failed to fetch user: ${userResponse.status} - ${errorText}`);
    }

    const userData = await userResponse.json();
    logStep("User data retrieved successfully", { username: userData.username });

    return new Response(JSON.stringify({
      success: true,
      user: userData,
      api_type: "marzban"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      user: null
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
