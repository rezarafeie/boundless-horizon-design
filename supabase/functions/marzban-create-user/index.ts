
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MarzbanUserRequest {
  username: string;
  data_limit: number;
  expire_strategy: string;
  expire_date: string;
  inbounds: string[];
  note: string;
  enabled: boolean;
}

interface MarzbanUserResponse {
  username: string;
  subscription_url: string;
  expire: number;
  data_limit: number;
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
    baseUrlValue: baseUrl || 'NOT_SET',
    usernameLength: adminUsername?.length || 0,
    passwordLength: adminPassword?.length || 0
  });

  if (!baseUrl || !adminUsername || !adminPassword) {
    const missingVars = [];
    if (!baseUrl) missingVars.push('MARZBAN_BASE_URL');
    if (!adminUsername) missingVars.push('MARZBAN_ADMIN_USERNAME');
    if (!adminPassword) missingVars.push('MARZBAN_ADMIN_PASSWORD');
    
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Check for empty values
  if (baseUrl.trim() === '' || adminUsername.trim() === '' || adminPassword.trim() === '') {
    throw new Error('One or more environment variables are empty. Please check your secret values.');
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    adminUsername: adminUsername.trim(),
    adminPassword: adminPassword.trim()
  };
}

async function getAuthToken(baseUrl: string, username: string, password: string): Promise<string> {
  const authUrl = `${baseUrl}/api/admin/token`;
  logStep('Attempting authentication with multiple methods', { url: authUrl });
  
  // Try different authentication methods
  const authMethods = [
    {
      name: 'JSON',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    },
    {
      name: 'Form-data',
      headers: {},
      body: (() => {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        return formData;
      })()
    },
    {
      name: 'URL-encoded',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: (() => {
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('password', password);
        return params.toString();
      })()
    }
  ];

  for (const method of authMethods) {
    try {
      logStep(`Trying ${method.name} authentication`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const tokenResponse = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          ...method.headers
        },
        body: method.body,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      logStep(`${method.name} auth response`, { 
        status: tokenResponse.status, 
        statusText: tokenResponse.statusText,
        contentType: tokenResponse.headers.get('content-type')
      });

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        if (tokenData.access_token) {
          logStep(`${method.name} authentication successful`, { 
            tokenType: tokenData.token_type || 'bearer',
            tokenLength: tokenData.access_token.length 
          });
          return tokenData.access_token;
        }
      } else {
        const errorText = await tokenResponse.text().catch(() => 'Unable to read error response');
        logStep(`${method.name} auth failed`, { 
          status: tokenResponse.status, 
          error: errorText 
        });
      }
    } catch (error) {
      logError(`${method.name} authentication failed`, error);
      if (error instanceof Error && error.name === 'AbortError') {
        logStep(`${method.name} authentication timed out`);
      }
    }
  }

  throw new Error('All authentication methods failed. Please verify your credentials.');
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
  
  // Calculate expiration date
  const expireDate = new Date();
  expireDate.setDate(expireDate.getDate() + userData.durationDays);
  const expireDateString = expireDate.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Convert GB to bytes
  const dataLimitBytes = userData.dataLimitGB * 1073741824;
  
  // Default inbounds - you may need to adjust based on your panel configuration
  const defaultInbounds = ["vmess", "vless", "trojan", "shadowsocks"];
  
  const userRequest: MarzbanUserRequest = {
    username: userData.username,
    data_limit: dataLimitBytes,
    expire_strategy: "fixed_date",
    expire_date: expireDateString,
    inbounds: defaultInbounds,
    note: `Purchased via bnets.co - ${userData.notes || 'No additional notes'}`,
    enabled: true
  };
  
  logStep('Prepared user creation request', {
    username: userRequest.username,
    dataLimitBytes,
    expireDate: expireDateString,
    inbounds: userRequest.inbounds,
    enabled: userRequest.enabled
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(`${baseUrl}/api/users`, {
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
        const userDetailsResponse = await fetch(`${baseUrl}/api/users/${userData.username}`, {
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
    
    // Calculate expire timestamp
    const expireTimestamp = Math.floor(expireDate.getTime() / 1000);
    
    const marzbanResponse: MarzbanUserResponse = {
      username: result.username || userData.username,
      subscription_url: subscriptionUrl,
      expire: result.expire || expireTimestamp,
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
      if (error.message.includes('Missing required environment variables') || 
          error.message.includes('environment variables are empty')) {
        statusCode = 500;
      } else if (error.message.includes('already taken')) {
        statusCode = 409;
      } else if (error.message.includes('Validation error')) {
        statusCode = 422;
      } else if (error.message.includes('timeout')) {
        statusCode = 503;
      } else if (error.message.includes('authentication') || 
                 error.message.includes('Authentication')) {
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
