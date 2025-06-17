
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MarzbanUserRequest {
  username: string;
  data_limit: number;
  expire_duration: number;
  note: string;
}

interface MarzbanUserResponse {
  username: string;
  subscription_url: string;
  expire: number;
  data_limit: number;
}

async function getAuthToken(baseUrl: string, username: string, password: string): Promise<string> {
  console.log('Attempting to authenticate with Marzban API');
  
  const tokenResponse = await fetch(`${baseUrl}/api/admin/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      username: username,
      password: password,
      grant_type: 'password'
    })
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Authentication failed:', errorText);
    throw new Error(`Failed to authenticate with Marzban API: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  console.log('Authentication successful');
  return tokenData.access_token;
}

async function createMarzbanUser(
  baseUrl: string,
  token: string,
  userData: {
    username: string;
    dataLimitGB: number;
    durationDays: number;
    notes: string;
  }
): Promise<MarzbanUserResponse> {
  
  console.log('Starting user creation with data:', userData);
  
  // Calculate expiration timestamp (current time + duration in days)
  const expirationTimestamp = Math.floor(Date.now() / 1000) + (userData.durationDays * 24 * 60 * 60);
  
  const userRequest = {
    username: userData.username,
    proxies: {},
    data_limit: userData.dataLimitGB * 1073741824, // Convert GB to bytes
    expire: expirationTimestamp,
    data_limit_reset_strategy: "no_reset",
    status: "active",
    note: `Purchased via bnets.co - ${userData.notes}`
  };
  
  console.log('Request payload:', JSON.stringify(userRequest, null, 2));

  const response = await fetch(`${baseUrl}/api/user`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userRequest)
  });

  console.log(`Marzban API response status: ${response.status}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    console.error(`Marzban API failed with status ${response.status}:`, errorData);
    
    if (response.status === 409) {
      throw new Error('This username is already taken. Please choose a different one');
    }
    
    if (errorData.detail) {
      if (typeof errorData.detail === 'string') {
        throw new Error(`Marzban API error: ${errorData.detail}`);
      } else if (Array.isArray(errorData.detail)) {
        const validationErrors = errorData.detail.map((err: any) => 
          `${err.loc ? err.loc.join('.') : 'field'}: ${err.msg}`
        ).join(', ');
        throw new Error(`Validation error: ${validationErrors}`);
      } else {
        throw new Error(`API error: ${JSON.stringify(errorData.detail)}`);
      }
    }
    throw new Error(`Failed to create user: ${response.status}`);
  }

  const result = await response.json();
  console.log('Marzban user creation succeeded:', result);
  return result;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received request, parsing body...');
    const requestBody = await req.json();
    console.log('Raw request body:', JSON.stringify(requestBody, null, 2));

    const {
      username,
      data_limit,
      expire_duration,
      note
    } = requestBody;

    // Validate required parameters
    if (!username) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Username is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!data_limit || typeof data_limit !== 'number' || data_limit <= 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Valid data limit (in bytes) is required and must be a positive number' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!expire_duration || typeof expire_duration !== 'number' || expire_duration <= 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Valid expire duration (in days) is required and must be a positive number' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get secrets from environment
    const baseUrl = Deno.env.get('MARZBAN_BASE_URL');
    const adminUsername = Deno.env.get('MARZBAN_ADMIN_USERNAME');
    const adminPassword = Deno.env.get('MARZBAN_ADMIN_PASSWORD');

    if (!baseUrl || !adminUsername || !adminPassword) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Server configuration error. Please contact support.' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Starting Marzban user creation process');

    // Get authentication token
    const token = await getAuthToken(baseUrl, adminUsername, adminPassword);
    
    // Convert bytes back to GB for the API call
    const dataLimitGB = data_limit / 1073741824;
    
    // Create the user
    const result = await createMarzbanUser(
      baseUrl,
      token,
      { 
        username, 
        dataLimitGB, 
        durationDays: expire_duration, 
        notes: note || '' 
      }
    );

    console.log('Marzban user creation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Marzban API Error Details:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to create user' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
