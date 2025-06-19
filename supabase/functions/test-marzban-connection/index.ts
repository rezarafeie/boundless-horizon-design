
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
      baseUrl: baseUrl || 'NOT_SET'
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
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(cleanBaseUrl, {
        method: 'GET',
        headers: { 
          'Accept': 'text/html,application/json',
          'User-Agent': 'Supabase-Edge-Function/1.0'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      logStep('Basic connectivity test result', { 
        status: response.status, 
        statusText: response.statusText
      });
      
      if (response.status >= 500) {
        return {
          success: false,
          message: `Marzban panel server error (${response.status}). Please check if the panel is running properly.`,
          details: {
            errorType: 'ServerError',
            status: response.status,
            timestamp: new Date().toISOString()
          }
        };
      }
    } catch (error) {
      logError('Basic connectivity failed', error);
      return {
        success: false,
        message: `Cannot connect to Marzban panel at ${cleanBaseUrl}. Please verify the URL is correct and accessible.`,
        details: {
          errorType: 'ConnectivityError',
          error: error.message,
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

    // Test authentication with the correct endpoint and format
    logStep('Testing authentication with correct API format');
    
    try {
      const authUrl = `${cleanBaseUrl}/api/admin/token`;
      logStep('Attempting authentication', { url: authUrl });
      
      const authController = new AbortController();
      const authTimeoutId = setTimeout(() => authController.abort(), 15000);
      
      const tokenResponse = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Supabase-Edge-Function/1.0'
        },
        body: JSON.stringify({
          username: adminUsername,
          password: adminPassword
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
        logStep('Authentication failed', { 
          status: tokenResponse.status, 
          error: errorText 
        });
        
        return {
          success: false,
          message: `Authentication failed (${tokenResponse.status}). Please verify your admin credentials.`,
          details: {
            errorType: 'AuthenticationError',
            status: tokenResponse.status,
            error: errorText,
            troubleshooting: [
              'Verify MARZBAN_ADMIN_USERNAME is correct (should be "bnets")',
              'Verify MARZBAN_ADMIN_PASSWORD is correct',
              'Check if the admin user exists in Marzban',
              'Ensure the admin user has proper permissions'
            ],
            timestamp: new Date().toISOString()
          }
        };
      }

      const tokenData = await tokenResponse.json();
      if (!tokenData.access_token) {
        logStep('Authentication response missing token', { tokenData });
        return {
          success: false,
          message: 'Authentication succeeded but no token received. Please check panel configuration.',
          details: {
            errorType: 'TokenError',
            response: tokenData,
            timestamp: new Date().toISOString()
          }
        };
      }

      logStep('Authentication successful', { 
        tokenType: tokenData.token_type || 'bearer',
        tokenLength: tokenData.access_token.length 
      });

      // Test API access with the token
      logStep('Testing API access with token');
      
      const apiUrl = `${cleanBaseUrl}/api/users`;
      logStep('Testing users API endpoint', { url: apiUrl });
      
      const apiController = new AbortController();
      const apiTimeoutId = setTimeout(() => apiController.abort(), 10000);
      
      const apiResponse = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json',
          'User-Agent': 'Supabase-Edge-Function/1.0'
        },
        signal: apiController.signal
      });

      clearTimeout(apiTimeoutId);

      logStep('API test result', { 
        status: apiResponse.status,
        statusText: apiResponse.statusText
      });

      const apiWorking = apiResponse.ok;

      return {
        success: true,
        message: `Marzban connection test successful! Panel is reachable, authentication works${apiWorking ? ', and API is accessible' : ' (API access needs verification)'}.`,
        details: {
          panelUrl: cleanBaseUrl,
          connectivityWorking: true,
          authenticationWorking: true,
          apiAccessible: apiWorking,
          authEndpoint: '/api/admin/token',
          usersEndpoint: '/api/users',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logError('Authentication test failed', error);
      
      return {
        success: false,
        message: `Authentication test failed: ${error.message}`,
        details: {
          errorType: 'AuthTestError',
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }

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
