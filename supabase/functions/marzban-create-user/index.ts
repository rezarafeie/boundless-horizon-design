
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

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MARZBAN-CREATE] ${step}${detailsStr}`);
};

async function testPanelHealth(baseUrl: string): Promise<boolean> {
  try {
    logStep('Testing panel health', { url: baseUrl });
    const response = await fetch(`${baseUrl}/docs`, {
      method: 'GET',
      headers: { 'Accept': 'text/html' }
    });
    
    logStep('Panel health check result', { 
      status: response.status, 
      accessible: response.ok || response.status === 404 
    });
    
    // 404 is OK for /docs, means panel is accessible but docs might not be enabled
    return response.ok || response.status === 404;
  } catch (error) {
    logStep('Panel health check failed', { error: error.message });
    return false;
  }
}

async function getAuthToken(baseUrl: string, username: string, password: string): Promise<string> {
  // Try multiple possible authentication endpoints
  const authEndpoints = [
    '/api/admin/token',
    '/api/admin/auth',
    '/admin/token',
    '/token'
  ];
  
  for (const endpoint of authEndpoints) {
    try {
      const authUrl = `${baseUrl}${endpoint}`;
      logStep('Attempting authentication', { url: authUrl, endpoint });
      
      const tokenResponse = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams({
          username: username,
          password: password,
          grant_type: 'password'
        })
      });

      logStep('Auth response', { 
        endpoint,
        status: tokenResponse.status, 
        statusText: tokenResponse.statusText 
      });

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        if (tokenData.access_token) {
          logStep('Authentication successful', { endpoint, tokenLength: tokenData.access_token.length });
          return tokenData.access_token;
        }
      } else {
        const errorText = await tokenResponse.text();
        logStep('Auth endpoint failed', { endpoint, status: tokenResponse.status, error: errorText });
      }
    } catch (error) {
      logStep('Auth endpoint error', { endpoint, error: error.message });
    }
  }
  
  throw new Error('Failed to authenticate with any known Marzban authentication endpoint');
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
  
  logStep('Starting user creation', userData);
  
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
  
  logStep('User creation request', userRequest);

  const response = await fetch(`${baseUrl}/api/user`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(userRequest)
  });

  logStep('User creation response', { 
    status: response.status, 
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries())
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    logStep('User creation failed', { status: response.status, error: errorData });
    
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
  logStep('User creation successful', result);
  
  // Marzban doesn't return subscription_url, so we need to construct it manually
  const subscriptionUrl = `${baseUrl}/sub/${userData.username}`;
  logStep('Constructed subscription URL', { subscriptionUrl });
  
  // Return response in the same format as Marzneshin for consistency
  const marzbanResponse: MarzbanUserResponse = {
    username: result.username || userData.username,
    subscription_url: subscriptionUrl,
    expire: result.expire || expirationTimestamp,
    data_limit: result.data_limit || userData.dataLimitGB * 1073741824
  };
  
  logStep('Final Marzban response', marzbanResponse);
  return marzbanResponse;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Function started - parsing request');
    const requestBody = await req.json();
    logStep('Request body received', requestBody);

    const {
      username,
      dataLimitGB,
      durationDays,
      notes
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

    if (!dataLimitGB || typeof dataLimitGB !== 'number' || dataLimitGB <= 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Valid data limit (in GB) is required and must be a positive number' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!durationDays || typeof durationDays !== 'number' || durationDays <= 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Valid duration (in days) is required and must be a positive number' 
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

    logStep('Environment check', {
      baseUrlExists: !!baseUrl,
      usernameExists: !!adminUsername,
      passwordExists: !!adminPassword,
      baseUrlValue: baseUrl || 'NOT_SET'
    });

    if (!baseUrl || !adminUsername || !adminPassword) {
      const missingVars = [];
      if (!baseUrl) missingVars.push('MARZBAN_BASE_URL');
      if (!adminUsername) missingVars.push('MARZBAN_ADMIN_USERNAME');
      if (!adminPassword) missingVars.push('MARZBAN_ADMIN_PASSWORD');
      
      logStep('Missing environment variables', { missing: missingVars });
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Server configuration error. Missing: ${missingVars.join(', ')}. Please contact support.` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Clean base URL (remove trailing slash)
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    logStep('Using clean base URL', { cleanBaseUrl });
    
    // Test panel health first
    const isPanelHealthy = await testPanelHealth(cleanBaseUrl);
    if (!isPanelHealthy) {
      logStep('Panel health check failed - panel unreachable');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Marzban panel is currently unreachable. Please try again later or contact support.' 
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    logStep('Starting Marzban user creation process');

    // Get authentication token with retry logic
    let token: string;
    try {
      token = await getAuthToken(cleanBaseUrl, adminUsername, adminPassword);
    } catch (authError) {
      logStep('Authentication completely failed', { error: authError.message });
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to authenticate with Marzban panel. Please contact support.' 
        }),
        { 
          status: 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Create the user
    const result = await createMarzbanUser(
      cleanBaseUrl,
      token,
      { 
        username, 
        dataLimitGB, 
        durationDays, 
        notes: notes || '' 
      }
    );

    logStep('Marzban user creation completed successfully');

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
    logStep('ERROR - User creation failed', {
      message: error.message,
      stack: error.stack
    });
    
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
