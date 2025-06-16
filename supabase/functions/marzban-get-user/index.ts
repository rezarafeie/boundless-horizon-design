
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

    // Enhanced environment check with more details
    logStep("Environment variables check", {
      baseUrlExists: !!marzbanBaseUrl,
      usernameExists: !!marzbanUsername,
      passwordExists: !!marzbanPassword,
      baseUrl: marzbanBaseUrl ? `${marzbanBaseUrl.substring(0, 30)}...` : 'NOT_SET',
      username: marzbanUsername ? `${marzbanUsername.substring(0, 3)}***` : 'NOT_SET',
      allEnvVars: Object.keys(Deno.env.toObject()).filter(key => key.includes('MARZBAN')),
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

    // First, get auth token with enhanced error handling
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
      headers: Object.fromEntries(authResponse.headers.entries()),
      url: authUrl
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      logStep("Auth failed - detailed error", { 
        status: authResponse.status, 
        statusText: authResponse.statusText,
        error: errorText,
        url: authUrl,
        credentials: {
          username: marzbanUsername ? `${marzbanUsername.substring(0, 3)}***` : 'MISSING',
          passwordLength: marzbanPassword ? marzbanPassword.length : 0
        }
      });
      throw new Error(`Failed to authenticate with Marzban: ${authResponse.status} - ${errorText}`);
    }

    const authData = await authResponse.json();
    
    if (!authData.access_token) {
      logStep("No access token in response", authData);
      throw new Error("No access token received from Marzban authentication");
    }

    const token = authData.access_token;
    logStep("Got auth token successfully", { tokenLength: token.length });

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
      statusText: userResponse.statusText,
      url: userUrl
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
    logStep("ERROR", { message: errorMessage, stack: error instanceof Error ? error.stack : undefined });
    
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
