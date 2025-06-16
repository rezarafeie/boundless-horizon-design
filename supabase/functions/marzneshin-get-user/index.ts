
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    if (!marzneshinBaseUrl || !marzneshinUsername || !marzneshinPassword) {
      throw new Error("Marzneshin credentials not configured");
    }

    // First, get auth token
    logStep("Getting auth token");
    const authResponse = await fetch(`${marzneshinBaseUrl}/api/admin/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        username: marzneshinUsername,
        password: marzneshinPassword,
      }),
    });

    if (!authResponse.ok) {
      throw new Error(`Failed to authenticate with Marzneshin: ${authResponse.status}`);
    }

    const authData = await authResponse.json();
    const token = authData.access_token;
    logStep("Got auth token successfully");

    // Now search for user by username
    logStep("Searching for user in Marzneshin");
    const userResponse = await fetch(`${marzneshinBaseUrl}/api/users?username=${username}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!userResponse.ok) {
      throw new Error(`Failed to search users: ${userResponse.status}`);
    }

    const searchData = await userResponse.json();
    logStep("Search response received", { count: searchData.users?.length || 0 });

    // Find exact username match
    const user = searchData.users?.find((u: any) => u.username === username);
    
    if (!user) {
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

    logStep("User found successfully", { username: user.username, id: user.id });

    return new Response(JSON.stringify({
      success: true,
      user: user,
      api_type: "marzneshin"
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
