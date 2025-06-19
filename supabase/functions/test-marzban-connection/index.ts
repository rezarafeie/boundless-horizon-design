
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
    
    // Test basic connectivity first
    logStep('Testing basic connectivity', { url: cleanBaseUrl });
    
    const connectivityTests = [
      `${cleanBaseUrl}/docs`,
      `${cleanBaseUrl}/api/docs`,
      `${cleanBaseUrl}`,
      `${cleanBaseUrl}/health`,
      `${cleanBaseUrl}/api/health`
    ];
    
    let connectivitySuccess = false;
    let connectivityError = null;
    
    for (const testUrl of connectivityTests) {
      try {
        logStep('Testing connectivity to', { url: testUrl });
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: { 
            'Accept': 'text/html,application/json',
            'User-Agent': 'Supabase-Edge-Function/1.0'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        logStep('Connectivity test result', { 
          url: testUrl,
          status: response.status, 
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        if (response.status < 500) { // Any non-server-error response indicates connectivity
          connectivitySuccess = true;
          break;
        }
        
      } catch (error) {
        logError(`Connectivity test failed for ${testUrl}`, error);
        connectivityError = error;
      }
    }
    
    if (!connectivitySuccess) {
      return {
        success: false,
        message: `Cannot connect to Marzban panel at ${cleanBaseUrl}. Please verify the URL is correct and the panel is accessible.`,
        details: {
          errorType: 'ConnectivityError',
          testedUrls: connectivityTests,
          lastError: connectivityError?.message || 'Connection failed',
          troubleshooting: [
            'Verify the panel URL is correct',
            'Check if the panel is running and accessible',
            'Ensure the panel allows external connections',
            'Check firewall and security settings'
          ],
          timestamp: new Date().toISOString()
        }
      };
    }

    // Test authentication
    logStep('Testing authentication');
    
    const authEndpoints = [
      '/api/admin/token',
      '/api/admin/auth',
      '/admin/token',
      '/token'
    ];
    
    let authSuccess = false;
    let accessToken = null;
    let authError = null;
    
    for (const endpoint of authEndpoints) {
      try {
        const authUrl = `${cleanBaseUrl}${endpoint}`;
        logStep('Attempting authentication', { url: authUrl, endpoint });
        
        const authController = new AbortController();
        const authTimeoutId = setTimeout(() => authController.abort(), 15000);
        
        const tokenResponse = await fetch(authUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'Supabase-Edge-Function/1.0'
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
            authSuccess = true;
            accessToken = tokenData.access_token;
            break;
          }
        } else {
          const errorText = await tokenResponse.text().catch(() => 'Unable to read error response');
          logStep('Auth endpoint failed', { 
            endpoint, 
            status: tokenResponse.status, 
            error: errorText 
          });
          authError = `${endpoint}: ${tokenResponse.status} ${errorText}`;
        }
      } catch (error) {
        logError(`Auth endpoint error at ${endpoint}`, error);
        authError = error instanceof Error ? error.message : String(error);
      }
    }

    if (!authSuccess) {
      return {
        success: false,
        message: `Authentication failed. Please verify your admin credentials are correct.`,
        details: {
          errorType: 'AuthenticationError',
          testedEndpoints: authEndpoints,
          lastError: authError || 'Authentication failed',
          troubleshooting: [
            'Verify MARZBAN_ADMIN_USERNAME is correct',
            'Verify MARZBAN_ADMIN_PASSWORD is correct',
            'Check if the admin user exists in Marzban',
            'Ensure the admin user has proper permissions'
          ],
          timestamp: new Date().toISOString()
        }
      };
    }

    // Test API access with the token
    logStep('Testing API access with token');
    
    const apiEndpoints = [
      '/api/admin',
      '/api/user',
      '/api/users',
      '/admin',
      '/users'
    ];
    
    let apiSuccess = false;
    let apiError = null;
    
    for (const endpoint of apiEndpoints) {
      try {
        const apiUrl = `${cleanBaseUrl}${endpoint}`;
        logStep('Testing API endpoint', { url: apiUrl });
        
        const apiController = new AbortController();
        const apiTimeoutId = setTimeout(() => apiController.abort(), 10000);
        
        const apiResponse = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'User-Agent': 'Supabase-Edge-Function/1.0'
          },
          signal: apiController.signal
        });

        clearTimeout(apiTimeoutId);

        logStep('API test result', { 
          endpoint,
          status: apiResponse.status,
          statusText: apiResponse.statusText
        });

        if (apiResponse.ok) {
          apiSuccess = true;
          break;
        }
        
      } catch (error) {
        logError(`API endpoint error at ${endpoint}`, error);
        apiError = error instanceof Error ? error.message : String(error);
      }
    }

    return {
      success: true,
      message: `Marzban connection test successful! Panel is reachable, authentication works${apiSuccess ? ', and API is accessible' : ' (API access could not be verified)'}.`,
      details: {
        panelUrl: cleanBaseUrl,
        connectivityWorking: true,
        authenticationWorking: true,
        apiAccessible: apiSuccess,
        testedEndpoints: {
          connectivity: connectivityTests,
          authentication: authEndpoints,
          api: apiEndpoints
        },
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    logError('Connection test failed', error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred during connection test',
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
