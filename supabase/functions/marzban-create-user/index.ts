
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

interface MarzbanInbound {
  tag: string;
  protocol: string;
  port: number;
  settings: any;
}

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details, null, 2)}` : '';
  console.log(`[${timestamp}] [MARZBAN-CREATE] ${step}${detailsStr}`);
};

const logError = (step: string, error: any) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [MARZBAN-ERROR] ${step}:`, {
    message: error?.message || 'Unknown error',
    stack: error?.stack || 'No stack trace',
    details: error
  });
};

async function validateEnvironment(): Promise<{ baseUrl: string; adminUsername: string; adminPassword: string }> {
  const baseUrl = Deno.env.get('MARZBAN_BASE_URL');
  const adminUsername = Deno.env.get('MARZBAN_ADMIN_USERNAME');
  const adminPassword = Deno.env.get('MARZBAN_ADMIN_PASSWORD');

  logStep('Environment validation', {
    baseUrlExists: !!baseUrl,
    usernameExists: !!adminUsername,
    passwordExists: !!adminPassword,
    baseUrlValue: baseUrl ? baseUrl.replace(/\/+$/, '') : 'NOT_SET'
  });

  if (!baseUrl || !adminUsername || !adminPassword) {
    const missingVars = [];
    if (!baseUrl) missingVars.push('MARZBAN_BASE_URL');
    if (!adminUsername) missingVars.push('MARZBAN_ADMIN_USERNAME');
    if (!adminPassword) missingVars.push('MARZBAN_ADMIN_PASSWORD');
    
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    adminUsername,
    adminPassword
  };
}

async function testPanelHealth(baseUrl: string): Promise<boolean> {
  try {
    logStep('Testing panel connectivity', { url: baseUrl });
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${baseUrl}/docs`, {
      method: 'GET',
      headers: { 'Accept': 'text/html' },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const isHealthy = response.ok || response.status === 404;
    logStep('Panel health check result', { 
      status: response.status, 
      statusText: response.statusText,
      isHealthy
    });
    
    return isHealthy;
  } catch (error) {
    logError('Panel health check failed', error);
    return false;
  }
}

async function getAuthToken(baseUrl: string, username: string, password: string): Promise<string> {
  const authEndpoints = [
    '/api/admin/token',
    '/api/admin/auth', 
    '/admin/token',
    '/token'
  ];
  
  let lastError: Error | null = null;
  
  for (const endpoint of authEndpoints) {
    try {
      const authUrl = `${baseUrl}${endpoint}`;
      logStep('Attempting authentication', { url: authUrl, endpoint });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
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
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      logStep('Auth response received', { 
        endpoint,
        status: tokenResponse.status, 
        statusText: tokenResponse.statusText,
        contentType: tokenResponse.headers.get('content-type')
      });

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        if (tokenData.access_token) {
          logStep('Authentication successful', { 
            endpoint, 
            tokenType: tokenData.token_type || 'bearer',
            tokenLength: tokenData.access_token.length 
          });
          return tokenData.access_token;
        } else {
          logStep('Token data missing access_token', { endpoint, tokenData });
        }
      } else {
        const errorText = await tokenResponse.text().catch(() => 'Unable to read error response');
        logStep('Auth endpoint failed', { 
          endpoint, 
          status: tokenResponse.status, 
          statusText: tokenResponse.statusText,
          error: errorText 
        });
        lastError = new Error(`Auth failed at ${endpoint}: ${tokenResponse.status} ${errorText}`);
      }
    } catch (error) {
      logError(`Auth endpoint error at ${endpoint}`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  
  throw new Error(`Authentication failed on all endpoints. Last error: ${lastError?.message || 'Unknown error'}`);
}

async function fetchAvailableInbounds(baseUrl: string, token: string): Promise<MarzbanInbound[]> {
  logStep('Fetching available inbounds');
  
  const inboundEndpoints = [
    '/api/inbounds',
    '/api/inbound',
    '/inbounds',
    '/inbound'
  ];
  
  for (const endpoint of inboundEndpoints) {
    try {
      const url = `${baseUrl}${endpoint}`;
      logStep('Trying inbound endpoint', { url });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      logStep('Inbound endpoint response', { 
        endpoint, 
        status: response.status,
        contentType: response.headers.get('content-type')
      });

      if (response.ok) {
        const data = await response.json();
        logStep('Inbound data received', { 
          endpoint, 
          dataType: typeof data, 
          isArray: Array.isArray(data),
          keys: Object.keys(data || {})
        });
        
        let inbounds = [];
        if (Array.isArray(data)) {
          inbounds = data;
        } else if (data.inbounds && Array.isArray(data.inbounds)) {
          inbounds = data.inbounds;
        } else if (data.data && Array.isArray(data.data)) {
          inbounds = data.data;
        } else if (data.items && Array.isArray(data.items)) {
          inbounds = data.items;
        }
        
        if (inbounds.length > 0) {
          logStep('Found valid inbounds', { 
            count: inbounds.length, 
            tags: inbounds.map(i => i.tag || i.name || 'unnamed').slice(0, 5)
          });
          return inbounds;
        } else {
          logStep('No inbounds found in response', { endpoint, data });
        }
      } else {
        const errorText = await response.text().catch(() => 'Unable to read error');
        logStep('Inbound endpoint failed', { endpoint, status: response.status, error: errorText });
      }
    } catch (error) {
      logError(`Inbound endpoint error at ${endpoint}`, error);
    }
  }
  
  logStep('No inbounds found, using default VMESS configuration');
  return [{
    tag: 'vmess-inbound',
    protocol: 'vmess',
    port: 443,
    settings: {}
  }];
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
  
  logStep('Starting user creation process', {
    username: userData.username,
    dataLimitGB: userData.dataLimitGB,
    durationDays: userData.durationDays,
    notesLength: userData.notes?.length || 0
  });
  
  // Fetch available inbounds first
  const inbounds = await fetchAvailableInbounds(baseUrl, token);
  
  // Create proxy configuration from available inbounds
  const proxies: Record<string, any> = {};
  
  if (inbounds.length > 0) {
    const primaryInbound = inbounds[0];
    const protocol = primaryInbound.protocol || 'vmess';
    
    proxies[protocol] = {
      id: crypto.randomUUID(),
      flow: protocol === 'vless' ? '' : undefined
    };
    
    logStep('Created proxy configuration', { protocol, uuid: proxies[protocol].id });
  } else {
    proxies.vmess = {
      id: crypto.randomUUID()
    };
    logStep('Using default VMESS proxy configuration', { uuid: proxies.vmess.id });
  }
  
  // Calculate expiration timestamp
  const expirationTimestamp = Math.floor(Date.now() / 1000) + (userData.durationDays * 24 * 60 * 60);
  const dataLimitBytes = userData.dataLimitGB * 1073741824; // Convert GB to bytes
  
  const userRequest = {
    username: userData.username,
    proxies: proxies,
    data_limit: dataLimitBytes,
    expire: expirationTimestamp,
    data_limit_reset_strategy: "no_reset",
    status: "active",
    note: `Purchased via bnets.co - ${userData.notes || 'No additional notes'}`
  };
  
  logStep('Prepared user creation request', {
    username: userRequest.username,
    dataLimitBytes,
    expire: new Date(expirationTimestamp * 1000).toISOString(),
    proxiesCount: Object.keys(proxies).length,
    status: userRequest.status
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(`${baseUrl}/api/user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(userRequest),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    logStep('User creation API response', { 
      status: response.status, 
      statusText: response.statusText,
      contentType: response.headers.get('content-type')
    });

    if (!response.ok) {
      const errorData = await response.json().catch(async () => {
        const textError = await response.text().catch(() => 'Unable to read error response');
        return { detail: textError };
      });
      
      logError('User creation API failed', { 
        status: response.status, 
        statusText: response.statusText,
        errorData 
      });
      
      if (response.status === 409) {
        throw new Error(`Username "${userData.username}" is already taken. Please choose a different username.`);
      }
      
      if (response.status === 422 && errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          const validationErrors = errorData.detail.map((err: any) => 
            `${err.loc ? err.loc.join('.') : 'field'}: ${err.msg}`
          ).join(', ');
          throw new Error(`Validation error: ${validationErrors}`);
        } else if (typeof errorData.detail === 'string') {
          throw new Error(`Marzban API error: ${errorData.detail}`);
        }
      }
      
      throw new Error(`Failed to create user: HTTP ${response.status} - ${errorData.detail || response.statusText}`);
    }

    const result = await response.json();
    logStep('User creation successful', {
      username: result.username,
      hasSubscriptionUrl: !!result.subscription_url,
      expire: result.expire,
      dataLimit: result.data_limit
    });
    
    // Construct subscription URL
    let subscriptionUrl = `${baseUrl}/sub/${userData.username}`;
    
    if (result.subscription_url) {
      subscriptionUrl = result.subscription_url;
      logStep('Using API provided subscription URL');
    } else {
      // Try to get user details for subscription URL
      try {
        const userDetailsResponse = await fetch(`${baseUrl}/api/user/${userData.username}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        
        if (userDetailsResponse.ok) {
          const userDetails = await userDetailsResponse.json();
          if (userDetails.subscription_url) {
            subscriptionUrl = userDetails.subscription_url;
            logStep('Found subscription URL in user details');
          } else if (userDetails.sub_url) {
            subscriptionUrl = userDetails.sub_url;
            logStep('Found sub_url in user details');
          }
        }
      } catch (error) {
        logError('Could not fetch user details for subscription URL', error);
      }
    }
    
    const marzbanResponse: MarzbanUserResponse = {
      username: result.username || userData.username,
      subscription_url: subscriptionUrl,
      expire: result.expire || expirationTimestamp,
      data_limit: result.data_limit || dataLimitBytes
    };
    
    logStep('Final Marzban response prepared', {
      username: marzbanResponse.username,
      subscriptionUrl: marzbanResponse.subscription_url,
      expire: new Date(marzbanResponse.expire * 1000).toISOString(),
      dataLimitGB: Math.round(marzbanResponse.data_limit / 1073741824)
    });
    
    return marzbanResponse;
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logError('User creation timeout', error);
      throw new Error('Request timed out. Please try again.');
    }
    
    logError('User creation failed', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Marzban create user function started');
    
    const requestBody = await req.json();
    logStep('Request body parsed', {
      hasUsername: !!requestBody.username,
      hasDataLimit: !!requestBody.dataLimitGB,
      hasDuration: !!requestBody.durationDays,
      usernameLength: requestBody.username?.length || 0
    });

    const { username, dataLimitGB, durationDays, notes } = requestBody;

    // Input validation
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Username is required and must be a non-empty string' 
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

    // Validate and get environment variables
    const { baseUrl, adminUsername, adminPassword } = await validateEnvironment();
    
    // Test panel health
    const isPanelHealthy = await testPanelHealth(baseUrl);
    if (!isPanelHealthy) {
      logStep('Panel health check failed - service unavailable');
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

    // Get authentication token
    const token = await getAuthToken(baseUrl, adminUsername, adminPassword);
    
    // Create the user
    const result = await createMarzbanUser(
      baseUrl,
      token,
      { 
        username: username.trim(), 
        dataLimitGB, 
        durationDays, 
        notes: notes || '' 
      }
    );

    logStep('Marzban user creation completed successfully', {
      username: result.username,
      success: true
    });

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
    logError('Function execution failed', error);
    
    let errorMessage = 'Failed to create user';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Set specific status codes for known error types
      if (error.message.includes('Missing required environment variables')) {
        statusCode = 500;
      } else if (error.message.includes('already taken')) {
        statusCode = 409;
      } else if (error.message.includes('Validation error')) {
        statusCode = 422;
      } else if (error.message.includes('unreachable') || error.message.includes('timeout')) {
        statusCode = 503;
      } else if (error.message.includes('Authentication failed')) {
        statusCode = 502;
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage
      }),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
