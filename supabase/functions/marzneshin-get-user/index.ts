
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MARZNESHIN-GET-USER] ${step}${detailsStr}`);
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

    // Get Marzneshin API credentials from Supabase secrets
    const marzneshinBaseUrl = Deno.env.get("MARZNESHIN_BASE_URL");
    const marzneshinUsername = Deno.env.get("MARZNESHIN_ADMIN_USERNAME");
    const marzneshinPassword = Deno.env.get("MARZNESHIN_ADMIN_PASSWORD");

    // Enhanced environment check with more details
    logStep("Environment variables check", {
      baseUrlExists: !!marzneshinBaseUrl,
      usernameExists: !!marzneshinUsername,
      passwordExists: !!marzneshinPassword,
      baseUrl: marzneshinBaseUrl ? `${marzneshinBaseUrl.substring(0, 30)}...` : 'NOT_SET',
      username: marzneshinUsername ? `${marzneshinUsername.substring(0, 3)}***` : 'NOT_SET',
    });

    if (!marzneshinBaseUrl || !marzneshinUsername || !marzneshinPassword) {
      const missingVars = [];
      if (!marzneshinBaseUrl) missingVars.push('MARZNESHIN_BASE_URL');
      if (!marzneshinUsername) missingVars.push('MARZNESHIN_ADMIN_USERNAME');
      if (!marzneshinPassword) missingVars.push('MARZNESHIN_ADMIN_PASSWORD');
      
      throw new Error(`Marzneshin credentials not configured. Missing: ${missingVars.join(', ')}`);
    }

    // Clean base URL (remove trailing slash)
    const baseUrl = marzneshinBaseUrl.replace(/\/$/, '');
    
    // Use the correct authentication endpoint for Marzneshin
    const authUrl = `${baseUrl}/api/admins/token`;
    
    logStep("Authentication attempt", { url: authUrl });

    // Authenticate with the correct endpoint and request format
    const authResponse = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        grant_type: "password",
        username: marzneshinUsername,
        password: marzneshinPassword,
      })
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
          username: marzneshinUsername ? `${marzneshinUsername.substring(0, 3)}***` : 'MISSING',
          passwordLength: marzneshinPassword ? marzneshinPassword.length : 0
        }
      });
      throw new Error(`Failed to authenticate with Marzneshin: ${authResponse.status} - ${errorText}`);
    }

    const authData = await authResponse.json();
    logStep("Auth response data", { authData });
    
    if (!authData.access_token) {
      logStep("No access token in response", authData);
      throw new Error("No access token received from Marzneshin authentication");
    }

    const token = authData.access_token;
    logStep("Authentication successful", { tokenLength: token.length });

    // Now search for user by username - try multiple endpoints
    const possibleUserEndpoints = [
      `${baseUrl}/api/users?username=${encodeURIComponent(username)}`,
      `${baseUrl}/api/user?username=${encodeURIComponent(username)}`,
      `${baseUrl}/users?username=${encodeURIComponent(username)}`,
      `${baseUrl}/api/users/${encodeURIComponent(username)}`,
      `${baseUrl}/api/user/${encodeURIComponent(username)}`,
      `${baseUrl}/users/${encodeURIComponent(username)}`,
      `${baseUrl}/user/${encodeURIComponent(username)}`
    ];

    let userData = null;
    let lastUserError = null;

    for (const userUrl of possibleUserEndpoints) {
      try {
        logStep("Trying user endpoint", { url: userUrl, attempt: possibleUserEndpoints.indexOf(userUrl) + 1 });

        const userResponse = await fetch(userUrl, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
        });

        logStep("User response", { 
          url: userUrl,
          status: userResponse.status, 
          statusText: userResponse.statusText,
          headers: Object.fromEntries(userResponse.headers.entries())
        });

        if (userResponse.ok) {
          const data = await userResponse.json();
          logStep("User endpoint response data", { 
            url: userUrl, 
            dataType: typeof data, 
            hasUsers: !!data.users,
            isArray: Array.isArray(data),
            keys: Object.keys(data || {})
          });

          // Handle different response formats
          if (data.users && Array.isArray(data.users)) {
            // Search format response
            const user = data.users.find((u: any) => u.username === username);
            if (user) {
              userData = user;
              logStep("User found in array", { username: user.username, id: user.id });
              break;
            }
          } else if (data.username === username) {
            // Direct user response
            userData = data;
            logStep("User found directly", { username: data.username, id: data.id });
            break;
          } else if (Array.isArray(data)) {
            // Direct array response
            const user = data.find((u: any) => u.username === username);
            if (user) {
              userData = user;
              logStep("User found in direct array", { username: user.username, id: user.id });
              break;
            }
          } else if (data.username) {
            // Single user but wrong username
            logStep("Different user returned", { expected: username, actual: data.username });
          }
        } else if (userResponse.status === 404) {
          logStep("User endpoint not found", { url: userUrl });
          lastUserError = `404: Endpoint not found`;
        } else {
          const errorText = await userResponse.text();
          lastUserError = `${userResponse.status}: ${errorText}`;
          logStep("User endpoint failed", { url: userUrl, status: userResponse.status, error: errorText });
        }
      } catch (error) {
        lastUserError = error.message;
        logStep("User endpoint error", { url: userUrl, error: error.message });
      }
    }
    
    if (!userData) {
      logStep("User not found in any endpoint", { 
        lastError: lastUserError,
        triedEndpoints: possibleUserEndpoints.length,
        searchedUsername: username
      });
      return new Response(JSON.stringify({
        success: false,
        error: "User not found",
        user: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("User found successfully", { username: userData.username, id: userData.id });

    return new Response(JSON.stringify({
      success: true,
      user: userData,
      api_type: "marzneshin"
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
