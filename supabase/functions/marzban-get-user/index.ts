
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

    if (!marzbanBaseUrl || !marzbanUsername || !marzbanPassword) {
      throw new Error("Marzban credentials not configured");
    }

    // First, get auth token
    logStep("Getting auth token");
    const authResponse = await fetch(`${marzbanBaseUrl}/api/admin/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        username: marzbanUsername,
        password: marzbanPassword,
      }),
    });

    if (!authResponse.ok) {
      throw new Error(`Failed to authenticate with Marzban: ${authResponse.status}`);
    }

    const authData = await authResponse.json();
    const token = authData.access_token;
    logStep("Got auth token successfully");

    // Now get user data
    logStep("Fetching user data from Marzban");
    const userResponse = await fetch(`${marzbanBaseUrl}/api/users/${username}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
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
      throw new Error(`Failed to fetch user: ${userResponse.status}`);
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
