
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== MARZNESHIN CREATE USER FUNCTION STARTED ===');
    
    const { username, dataLimitGB, durationDays, notes } = await req.json();
    console.log('Create user request:', { username, dataLimitGB, durationDays });

    if (!username || !dataLimitGB || !durationDays) {
      throw new Error('Username, data limit, and duration are required');
    }

    // Get Marzneshin configuration from environment
    const baseUrl = Deno.env.get('MARZNESHIN_BASE_URL');
    const adminUsername = Deno.env.get('MARZNESHIN_ADMIN_USERNAME');
    const adminPassword = Deno.env.get('MARZNESHIN_ADMIN_PASSWORD');

    if (!baseUrl || !adminUsername || !adminPassword) {
      console.error('Marzneshin configuration missing:', { 
        hasBaseUrl: !!baseUrl, 
        hasUsername: !!adminUsername, 
        hasPassword: !!adminPassword 
      });
      throw new Error('Marzneshin panel configuration not complete');
    }

    console.log('Authenticating with Marzneshin panel...');

    // Get authentication token
    const authResponse = await fetch(`${baseUrl}/api/admin/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'username': adminUsername,
        'password': adminPassword
      })
    });

    if (!authResponse.ok) {
      const authError = await authResponse.text();
      console.error('Marzneshin authentication failed:', authResponse.status, authError);
      throw new Error(`Failed to authenticate with Marzneshin panel: ${authResponse.status}`);
    }

    const authData = await authResponse.json();
    console.log('Authentication successful, creating user...');

    // Calculate expiry timestamp (current time + duration in days)
    const expireTimestamp = Math.floor((Date.now() + (durationDays * 24 * 60 * 60 * 1000)) / 1000);
    
    // Create user
    const createUserResponse = await fetch(`${baseUrl}/api/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.access_token}`
      },
      body: JSON.stringify({
        username: username,
        proxies: {
          vmess: {},
          vless: {}
        },
        data_limit: dataLimitGB * 1073741824, // Convert GB to bytes
        expire: expireTimestamp,
        status: 'active',
        note: notes || `Created via BoundlessNets - ${new Date().toISOString()}`
      })
    });

    if (!createUserResponse.ok) {
      const createError = await createUserResponse.text();
      console.error('User creation failed:', createUserResponse.status, createError);
      throw new Error(`Failed to create user in Marzneshin panel: ${createUserResponse.status}`);
    }

    const userData = await createUserResponse.json();
    console.log('User created successfully:', userData);

    // Generate subscription URL
    const subscriptionUrl = `${baseUrl}/sub/${userData.subscription_token}`;
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: {
        username: userData.username,
        subscription_url: subscriptionUrl,
        subscription_token: userData.subscription_token,
        data_limit: userData.data_limit,
        expire: userData.expire,
        status: userData.status
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Marzneshin create user error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
