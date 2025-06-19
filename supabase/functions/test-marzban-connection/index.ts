
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details, null, 2)}` : '';
  console.log(`[${timestamp}] [MARZBAN-TEST] ${step}${detailsStr}`);
};

const logError = (step: string, error: any) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [MARZBAN-TEST-ERROR] ${step}:`, {
    message: error?.message || 'Unknown error',
    stack: error?.stack || 'No stack trace',
    details: error
  });
};

async function testMarzbanConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    logStep('Starting Marzban connection test');
    
    // Check environment variables
    const baseUrl = Deno.env.get('MARZBAN_BASE_URL');
    const adminUsername = Deno.env.get('MARZBAN_ADMIN_USERNAME');
    const adminPassword = Deno.env.get('MARZBAN_ADMIN_PASSWORD');

    logStep('Environment check', {
      baseUrlExists: !!baseUrl,
      usernameExists: !!adminUsername,
      passwordExists: !!adminPassword,
      baseUrl: baseUrl ? baseUrl.replace(/\/+$/, '') : 'NOT_SET'
    });

    if (!baseUrl || !adminUsername || !adminPassword) {
      const missingVars = [];
      if (!baseUrl) missingVars.push('MARZBAN_BASE_URL');
      if (!adminUsername) missingVars.push('MARZBAN_ADMIN_USERNAME');
      if (!adminPassword) missingVars.push('MARZBAN_ADMIN_PASSWORD');
      
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    
    // Test panel health
    logStep('Testing panel health', { url: `${cleanBaseUrl}/docs` });
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const healthResponse = await fetch(`${cleanBaseUrl}/docs`, {
      method: 'GET',
      headers: { 'Accept': 'text/html' },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const isHealthy = healthResponse.ok || healthResponse.status === 404;
    logStep('Panel health result', { 
      status: healthResponse.status, 
      statusText: healthResponse.statusText,
      isHealthy
    });
    
    if (!isHealthy) {
      throw new Error(`Panel is not reachable. Status: ${healthResponse.status} ${healthResponse.statusText}`);
    }

    // Test authentication
    logStep('Testing authentication');
    
    const authController = new AbortController();
    const authTimeoutId = setTimeout(() => authController.abort(), 15000);
    
    const tokenResponse = await fetch(`${cleanBaseUrl}/api/admin/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        username: adminUsername,
        password: adminPassword,
        grant_type: 'password'
      }),
      signal: authController.signal
    });

    clearTimeout(authTimeoutId);

    logStep('Auth response', { 
      status: tokenResponse.status, 
      statusText: tokenResponse.statusText,
      contentType: tokenResponse.headers.get('content-type')
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text().catch(() => 'Unable to read error response');
      throw new Error(`Authentication failed: ${tokenResponse.status} ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      throw new Error('No access token received from authentication');
    }
    
    logStep('Authentication successful', { 
      tokenType: tokenData.token_type || 'bearer',
      tokenLength: tokenData.access_token.length 
    });

    // Test API access with the token
    logStep('Testing API access with token');
    
    const apiController = new AbortController();
    const apiTimeoutId = setTimeout(() => apiController.abort(), 10000);
    
    const apiResponse = await fetch(`${cleanBaseUrl}/api/admin`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      },
      signal: apiController.signal
    });

    clearTimeout(apiTimeoutId);

    logStep('API access result', { 
      status: apiResponse.status,
      statusText: apiResponse.statusText
    });

    if (apiResponse.ok) {
      const adminData = await apiResponse.json();
      logStep('API access successful', { 
        adminUser: adminData.username || 'unknown'
      });
    }

    return {
      success: true,
      message: 'Marzban connection test successful! Panel is reachable and authentication works.',
      details: {
        panelUrl: cleanBaseUrl,
        authenticationWorking: true,
        apiAccessible: apiResponse.ok,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    logError('Connection test failed', error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: {
        errorType: error?.name || 'UnknownError',
        timestamp: new Date().toISOString()
      }
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Marzban connection test function started');
    
    const result = await testMarzbanConnection();
    
    logStep('Test completed', { success: result.success });
    
    return new Response(
      JSON.stringify(result),
      { 
        status: result.success ? 200 : 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logError('Function execution failed', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        message: error instanceof Error ? error.message : 'Test function failed',
        details: {
          timestamp: new Date().toISOString()
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
