
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
      expire_strategy: currentUser.expire_strategy,
      current_data_limit: currentUser.data_limit,
      current_expire_date: currentUser.expire_date || 'N/A',
      current_expire_after: currentUser.expire_after || 'N/A'
    });

    // Step 3: Calculate total values based on expire strategy
    const newDataLimitBytes = dataLimitGB * 1024 * 1024 * 1024; // Convert GB to bytes
    const totalDataLimit = (currentUser.data_limit || 0) + newDataLimitBytes;
    
    let updatePayload: any;
    
    if (currentUser.expire_strategy === 'fixed_date') {
      // Handle fixed_date strategy - Include username in payload
      console.log('[MARZNESHIN-UPDATE-USER] Using fixed_date strategy');
      
      // Calculate new expire_date by adding days to current expire_date
      let currentExpireDate: Date;
      
      if (currentUser.expire_date) {
        currentExpireDate = new Date(currentUser.expire_date);
      } else {
        // If no current expire date, use current time
        currentExpireDate = new Date();
      }
      
      // Add duration days to current expire date
      const newExpireDate = new Date(currentExpireDate.getTime() + (durationDays * 24 * 60 * 60 * 1000));
      const expireDateISO = newExpireDate.toISOString();
      
      updatePayload = {
        username: username,
        expire_strategy: "fixed_date",
        expire_date: expireDateISO,
        data_limit: totalDataLimit
      };
      
      console.log('[MARZNESHIN-UPDATE-USER] Fixed date payload:', {
        ...updatePayload,
        calculated_from_date: currentUser.expire_date || 'now',
        days_added: durationDays,
        new_expire_date: expireDateISO
      });
      
    } else {
      // Handle expire_after strategy - Include username in payload
      console.log('[MARZNESHIN-UPDATE-USER] Using expire_after strategy');
      
      const expireAfterDays = durationDays;
      const usageDuration = expireAfterDays * 86400; // Convert days to seconds

      updatePayload = {
        username: username,
        expire_strategy: "expire_after",
        expire_after: expireAfterDays,
        usage_duration: usageDuration,
        data_limit: totalDataLimit
      };
      
      console.log('[MARZNESHIN-UPDATE-USER] Expire after payload:', {
        ...updatePayload,
        days_added: durationDays
      });
    }

    console.log('[MARZNESHIN-UPDATE-USER] Final update payload:', updatePayload);

    // Step 4: Update user using PUT method (the one that works based on logs)
    console.log(`[MARZNESHIN-UPDATE-USER] Sending PUT request to ${baseUrl}/api/users/${username}...`);
    
    const updateResponse = await fetch(`${baseUrl}/api/users/${username}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    console.log('[MARZNESHIN-UPDATE-USER] PUT response:', {
      status: updateResponse.status,
      statusText: updateResponse.statusText,
      url: `${baseUrl}/api/users/${username}`
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('[MARZNESHIN-UPDATE-USER] PUT failed:', {
        status: updateResponse.status,
        statusText: updateResponse.statusText,
        body: errorText
      });
      
      // Try to parse error details for better debugging
      let parsedError;
      try {
        parsedError = JSON.parse(errorText);
      } catch {
        parsedError = errorText;
      }
      
      throw new Error(`Update failed: ${updateResponse.status} ${updateResponse.statusText} - ${JSON.stringify(parsedError)}`);
    }

    const updateResult = await updateResponse.json();
    console.log('[MARZNESHIN-UPDATE-USER] Update successful:', updateResult);

    // Return success response with detailed info
    const response = {
      success: true,
      data: {
        username,
        strategy_used: currentUser.expire_strategy,
        previous_data_limit: currentUser.data_limit || 0,
        added_data_limit: newDataLimitBytes,
        total_data_limit: totalDataLimit,
        duration_days_added: durationDays,
        payload_sent: updatePayload,
        api_response: {
          status_code: updateResponse.status,
          status_text: updateResponse.statusText,
          data: updateResult
        },
        update_response: updateResult,
        previous_expire_info: currentUser.expire_strategy === 'fixed_date' 
          ? { expire_date: currentUser.expire_date }
          : { expire_after: currentUser.expire_after },
        new_expire_info: currentUser.expire_strategy === 'fixed_date'
          ? { expire_date: updatePayload.expire_date }
          : { expire_after: updatePayload.expire_after, usage_duration: updatePayload.usage_duration }
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
      error_details: {
        type: 'marzneshin_update_error',
        timestamp: new Date().toISOString(),
        function: 'marzneshin-update-user'
      },
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
