
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdateUserRequest {
  username: string;
  dataLimitGB: number;
  durationDays: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[MARZNESHIN-UPDATE-USER] Function started');
    
    const { username, dataLimitGB, durationDays }: UpdateUserRequest = await req.json();
    
    console.log('[MARZNESHIN-UPDATE-USER] Update request:', {
      username,
      dataLimitGB,
      durationDays
    });

    // Get environment variables
    const baseUrl = Deno.env.get('MARZNESHIN_BASE_URL');
    const adminUsername = Deno.env.get('MARZNESHIN_ADMIN_USERNAME');
    const adminPassword = Deno.env.get('MARZNESHIN_ADMIN_PASSWORD');

    if (!baseUrl || !adminUsername || !adminPassword) {
      console.error('[MARZNESHIN-UPDATE-USER] Missing environment variables');
      throw new Error('Missing Marzneshin configuration');
    }

    console.log('[MARZNESHIN-UPDATE-USER] Environment check passed');

    // Step 1: Authenticate
    console.log('[MARZNESHIN-UPDATE-USER] Authenticating...');
    const authResponse = await fetch(`${baseUrl}/api/admins/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: adminUsername,
        password: adminPassword,
      }),
    });

    if (!authResponse.ok) {
      console.error('[MARZNESHIN-UPDATE-USER] Auth failed:', authResponse.status);
      throw new Error(`Authentication failed: ${authResponse.statusText}`);
    }

    const authData = await authResponse.json();
    const token = authData.access_token;
    
    console.log('[MARZNESHIN-UPDATE-USER] Authentication successful');

    // Step 2: Get current user data
    console.log('[MARZNESHIN-UPDATE-USER] Fetching current user data...');
    const getUserResponse = await fetch(`${baseUrl}/api/users/${username}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!getUserResponse.ok) {
      console.error('[MARZNESHIN-UPDATE-USER] Failed to get user:', getUserResponse.status);
      throw new Error(`Failed to get user: ${getUserResponse.statusText}`);
    }

    const currentUser = await getUserResponse.json();
    console.log('[MARZNESHIN-UPDATE-USER] Current user data:', {
      username: currentUser.username,
      current_data_limit: currentUser.data_limit,
      current_expire_after: currentUser.expire_after || 'N/A'
    });

    // Step 3: Calculate total values
    const newDataLimitBytes = dataLimitGB * 1024 * 1024 * 1024; // Convert GB to bytes
    const totalDataLimit = (currentUser.data_limit || 0) + newDataLimitBytes;
    const expireAfterDays = durationDays;
    const usageDuration = expireAfterDays * 86400; // Convert days to seconds

    const updatePayload = {
      expire_strategy: "expire_after",
      expire_after: expireAfterDays,
      usage_duration: usageDuration,
      data_limit: totalDataLimit
    };

    console.log('[MARZNESHIN-UPDATE-USER] Update payload:', updatePayload);

    // Step 4: Send PATCH request
    console.log('[MARZNESHIN-UPDATE-USER] Sending PATCH request...');
    const updateResponse = await fetch(`${baseUrl}/api/users/${username}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('[MARZNESHIN-UPDATE-USER] PATCH failed:', {
        status: updateResponse.status,
        statusText: updateResponse.statusText,
        body: errorText
      });
      throw new Error(`Update failed: ${updateResponse.statusText} - ${errorText}`);
    }

    const updateResult = await updateResponse.json();
    console.log('[MARZNESHIN-UPDATE-USER] Update successful:', updateResult);

    // Return success response with detailed info
    const response = {
      success: true,
      data: {
        username,
        previous_data_limit: currentUser.data_limit || 0,
        added_data_limit: newDataLimitBytes,
        total_data_limit: totalDataLimit,
        expire_after_days: expireAfterDays,
        usage_duration: usageDuration,
        update_response: updateResult
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[MARZNESHIN-UPDATE-USER] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
