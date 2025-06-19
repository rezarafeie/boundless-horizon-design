
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
    
    // Check environment variables with detailed logging
    const baseUrl = Deno.env.get('MARZBAN_BASE_URL');
    const adminUsername = Deno.env.get('MARZBAN_ADMIN_USERNAME');
    const adminPassword = Deno.env.get('MARZBAN_ADMIN_PASSWORD');

    logStep('Environment check', {
      baseUrlExists: !!baseUrl,
      usernameExists: !!adminUsername,
      passwordExists: !!adminPassword,
      baseUrl: baseUrl || 'NOT_SET',
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

    // Test authentication with multiple approaches
    logStep('Testing authentication with multiple approaches');
    
    const authResults = [];
    
    // Approach 1: JSON format
    try {
      const authUrl = `${cleanBaseUrl}/api/admin/token`;
      logStep('Attempting JSON authentication', { 
        url: authUrl,
        username: adminUsername,
        passwordMasked: '*'.repeat(adminPassword.length)
      });
      
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

      logStep('JSON Auth response', { 
        status: tokenResponse.status, 
        statusText: tokenResponse.statusText,
        contentType: tokenResponse.headers.get('content-type')
      });

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        if (tokenData.access_token) {
          logStep('JSON Authentication successful', { 
            tokenType: tokenData.token_type || 'bearer',
            tokenLength: tokenData.access_token.length 
          });
          
          authResults.push({
            method: 'JSON',
            success: true,
            token: tokenData.access_token
          });
        }
      } else {
        const errorText = await tokenResponse.text().catch(() => 'Unable to read error response');
        authResults.push({
          method: 'JSON',
          success: false,
          status: tokenResponse.status,
          error: errorText
        });
      }
    } catch (error) {
      logError('JSON Authentication failed', error);
      authResults.push({
        method: 'JSON',
        success: false,
        error: error.message
      });
    }

    // Approach 2: Form data format
    try {
      const authUrl = `${cleanBaseUrl}/api/admin/token`;
      logStep('Attempting form-data authentication', { url: authUrl });
      
      const formData = new FormData();
      formData.append('username', adminUsername);
      formData.append('password', adminPassword);
      
      const authController = new AbortController();
      const authTimeoutId = setTimeout(() => authController.abort(), 15000);
      
      const tokenResponse = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Supabase-Edge-Function/1.0'
        },
        body: formData,
        signal: authController.signal
      });

      clearTimeout(authTimeoutId);

      logStep('Form-data Auth response', { 
        status: tokenResponse.status, 
        statusText: tokenResponse.statusText,
        contentType: tokenResponse.headers.get('content-type')
      });

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        if (tokenData.access_token) {
          logStep('Form-data Authentication successful', { 
            tokenType: tokenData.token_type || 'bearer',
            tokenLength: tokenData.access_token.length 
          });
          
          authResults.push({
            method: 'Form-data',
            success: true,
            token: tokenData.access_token
          });
        }
      } else {
        const errorText = await tokenResponse.text().catch(() => 'Unable to read error response');
        authResults.push({
          method: 'Form-data',
          success: false,
          status: tokenResponse.status,
          error: errorText
        });
      }
    } catch (error) {
      logError('Form-data Authentication failed', error);
      authResults.push({
        method: 'Form-data',
        success: false,
        error: error.message
      });
    }

    // Approach 3: URL-encoded format
    try {
      const authUrl = `${cleanBaseUrl}/api/admin/token`;
      logStep('Attempting URL-encoded authentication', { url: authUrl });
      
      const params = new URLSearchParams();
      params.append('username', adminUsername);
      params.append('password', adminPassword);
      
      const authController = new AbortController();
      const authTimeoutId = setTimeout(() => authController.abort(), 15000);
      
      const tokenResponse = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'Supabase-Edge-Function/1.0'
        },
        body: params.toString(),
        signal: authController.signal
      });

      clearTimeout(authTimeoutId);

      logStep('URL-encoded Auth response', { 
        status: tokenResponse.status, 
        statusText: tokenResponse.statusText,
        contentType: tokenResponse.headers.get('content-type')
      });

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        if (tokenData.access_token) {
          logStep('URL-encoded Authentication successful', { 
            tokenType: tokenData.token_type || 'bearer',
            tokenLength: tokenData.access_token.length 
          });
          
          authResults.push({
            method: 'URL-encoded',
            success: true,
            token: tokenData.access_token
          });
        }
      } else {
        const errorText = await tokenResponse.text().catch(() => 'Unable to read error response');
        authResults.push({
          method: 'URL-encoded',
          success: false,
          status: tokenResponse.status,
          error: errorText
        });
      }
    } catch (error) {
      logError('URL-encoded Authentication failed', error);
      authResults.push({
        method: 'URL-encoded',
        success: false,
        error: error.message
      });
    }

    logStep('All authentication attempts completed', { authResults });

    // Check if any authentication method succeeded
    const successfulAuth = authResults.find(result => result.success);
    
    if (successfulAuth) {
      // Test API access with the successful token
      logStep('Testing API access with successful token', { method: successfulAuth.method });
      
      try {
        const apiUrl = `${cleanBaseUrl}/api/users`;
        const apiController = new AbortController();
        const apiTimeoutId = setTimeout(() => apiController.abort(), 10000);
        
        const apiResponse = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${successfulAuth.token}`,
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
          message: `Marzban connection test successful! Authentication worked with ${successfulAuth.method} format${apiWorking ? ' and API is accessible' : ' (API access needs verification)'}.`,
          details: {
            panelUrl: cleanBaseUrl,
            connectivityWorking: true,
            successfulAuthMethod: successfulAuth.method,
            apiAccessible: apiWorking,
            authResults: authResults,
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        logError('API test failed', error);
        return {
          success: true,
          message: `Authentication successful with ${successfulAuth.method} format, but API test failed.`,
          details: {
            panelUrl: cleanBaseUrl,
            connectivityWorking: true,
            successfulAuthMethod: successfulAuth.method,
            apiAccessible: false,
            authResults: authResults,
            apiError: error.message,
            timestamp: new Date().toISOString()
          }
        };
      }
    } else {
      // All authentication methods failed
      return {
        success: false,
        message: 'All authentication methods failed. Please verify your admin credentials.',
        details: {
          errorType: 'AuthenticationError',
          authResults: authResults,
          troubleshooting: [
            'Verify MARZBAN_ADMIN_USERNAME is correct (should be "bnets")',
            'Verify MARZBAN_ADMIN_PASSWORD is correct (should be "reza1234")',
            'Check if the admin user exists in Marzban',
            'Ensure the admin user has proper permissions',
            'Try accessing the panel manually to verify credentials'
          ],
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
