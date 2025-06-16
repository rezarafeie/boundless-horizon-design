
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

    // Try multiple endpoints for user lookup
    const possibleUserEndpoints = [
      `${baseUrl}/api/user/${encodeURIComponent(username)}`,
      `${baseUrl}/api/users/${encodeURIComponent(username)}`,
      `${baseUrl}/api/users?username=${encodeURIComponent(username)}`,
      `${baseUrl}/api/user?username=${encodeURIComponent(username)}`,
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

        logStep("User response received", { 
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
            keys: Object.keys(data || {}),
            dataPreview: JSON.stringify(data).substring(0, 200)
          });

          // Handle different response formats
          if (data.username === username) {
            // Direct user response
            userData = data;
            logStep("User found directly", { username: data.username });
            break;
          } else if (data.users && Array.isArray(data.users)) {
            // Search format response
            const user = data.users.find((u: any) => u.username === username);
            if (user) {
              userData = user;
              logStep("User found in users array", { username: user.username });
              break;
            }
          } else if (Array.isArray(data)) {
            // Direct array response
            const user = data.find((u: any) => u.username === username);
            if (user) {
              userData = user;
              logStep("User found in direct array", { username: user.username });
              break;
            }
          } else if (data.username && data.username !== username) {
            // Single user but wrong username
            logStep("Different user returned", { expected: username, actual: data.username });
          } else {
            logStep("Unexpected response format", { data: JSON.stringify(data).substring(0, 200) });
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

    // If no user found, try to get all users to see what's available
    if (!userData) {
      logStep("Attempting to list all users for debugging");
      try {
        const allUsersUrl = `${baseUrl}/api/users`;
        const allUsersResponse = await fetch(allUsersUrl, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
        });

        if (allUsersResponse.ok) {
          const allUsersData = await allUsersResponse.json();
          logStep("All users data", { 
            dataType: typeof allUsersData,
            keys: Object.keys(allUsersData || {}),
            hasUsers: !!allUsersData.users,
            isArray: Array.isArray(allUsersData),
            totalUsers: Array.isArray(allUsersData) ? allUsersData.length : 
                       (allUsersData.users ? allUsersData.users.length : 'unknown'),
            preview: JSON.stringify(allUsersData).substring(0, 300)
          });

          // Check if our user exists in the full list
          let allUsers = [];
          if (Array.isArray(allUsersData)) {
            allUsers = allUsersData;
          } else if (allUsersData.users && Array.isArray(allUsersData.users)) {
            allUsers = allUsersData.users;
          }

          const foundUser = allUsers.find((u: any) => u.username === username);
          if (foundUser) {
            userData = foundUser;
            logStep("User found in all users list", { username: foundUser.username });
          } else {
            const availableUsernames = allUsers.map((u: any) => u.username || 'unknown').slice(0, 10);
            logStep("User not found in all users list", { 
              searchedUsername: username,
              availableUsernames,
              totalAvailableUsers: allUsers.length
            });
          }
        } else {
          logStep("Failed to fetch all users", { status: allUsersResponse.status });
        }
      } catch (error) {
        logStep("Error fetching all users", { error: error.message });
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
        user: null,
        debug: {
          searchedUsername: username,
          triedEndpoints: possibleUserEndpoints,
          lastError: lastUserError
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("User found successfully", { username: userData.username });

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
