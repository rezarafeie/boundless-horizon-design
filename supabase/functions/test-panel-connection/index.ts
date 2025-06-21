
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestConnectionRequest {
  panelId: string;
  planId?: string;
}

interface DetailedLog {
  step: string;
  status: 'success' | 'error' | 'info';
  message: string;
  details?: any;
  timestamp: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const detailedLogs: DetailedLog[] = [];
  const startTime = Date.now();
  
  const addLog = (step: string, status: 'success' | 'error' | 'info', message: string, details?: any) => {
    const logEntry = {
      step,
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    };
    detailedLogs.push(logEntry);
    console.log(`[TEST-PANEL-CONNECTION] ${status.toUpperCase()}: ${step} - ${message}`, details || '');
  };

  try {
    addLog('Test Initialization', 'info', 'Starting panel connection test');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { panelId }: TestConnectionRequest = await req.json();

    if (!panelId) {
      addLog('Validation', 'error', 'Panel ID is required');
      throw new Error('Panel ID is required');
    }

    addLog('Database Query', 'info', `Fetching panel data for ID: ${panelId}`);

    // Get panel information
    const { data: panel, error: panelError } = await supabase
      .from('panel_servers')
      .select('*')
      .eq('id', panelId)
      .single();

    if (panelError || !panel) {
      addLog('Database Query', 'error', `Panel not found: ${panelError?.message}`, { panelError });
      throw new Error(`Panel not found: ${panelError?.message}`);
    }

    addLog('Database Query', 'success', 'Panel data retrieved successfully', {
      name: panel.name,
      type: panel.type,
      url: panel.panel_url,
      username: panel.username
    });

    // Test authentication based on panel type
    let authResult;
    let testUserResult;

    if (panel.type === 'marzban') {
      addLog('Authentication', 'info', 'Testing Marzban authentication');
      
      try {
        // Test Marzban authentication
        const authResponse = await fetch(`${panel.panel_url}/api/admin/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            username: panel.username,
            password: panel.password,
          }),
        });

        addLog('Authentication', 'info', `Auth request sent to ${panel.panel_url}/api/admin/token`, {
          status: authResponse.status,
          statusText: authResponse.statusText,
          ok: authResponse.ok
        });

        if (!authResponse.ok) {
          const errorText = await authResponse.text();
          addLog('Authentication', 'error', `Marzban auth failed: ${authResponse.status} ${authResponse.statusText}`, {
            status: authResponse.status,
            statusText: authResponse.statusText,
            errorBody: errorText
          });
          throw new Error(`Marzban auth failed: ${authResponse.status} ${authResponse.statusText}`);
        }

        const authData = await authResponse.json();
        addLog('Authentication', 'success', 'Authentication successful', {
          hasAccessToken: !!authData.access_token,
          tokenType: authData.token_type
        });

        authResult = {
          success: true,
          tokenReceived: !!authData.access_token,
          tokenType: authData.token_type
        };

        // Test creating a user
        const testUsername = `test_${Date.now()}`;
        addLog('User Creation', 'info', `Creating test user: ${testUsername}`);

        const testUserPayload = {
          username: testUsername,
          data_limit: 1073741824, // 1GB
          expire: Math.floor(Date.now() / 1000) + 86400, // 1 day
          proxies: {
            vless: {},
            vmess: {},
            trojan: {},
            shadowsocks: {}
          }
        };

        addLog('User Creation', 'info', 'Sending user creation request', testUserPayload);

        const testUserResponse = await fetch(`${panel.panel_url}/api/user`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authData.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testUserPayload),
        });

        addLog('User Creation', 'info', `User creation response received`, {
          status: testUserResponse.status,
          statusText: testUserResponse.statusText,
          ok: testUserResponse.ok
        });

        if (testUserResponse.ok) {
          const userData = await testUserResponse.json();
          addLog('User Creation', 'success', 'Test user created successfully', {
            username: userData.username,
            hasSubscriptionUrl: !!userData.subscription_url
          });

          testUserResult = {
            success: true,
            username: userData.username,
            subscriptionUrl: userData.subscription_url
          };

          // Clean up test user
          try {
            addLog('Cleanup', 'info', `Deleting test user: ${testUsername}`);
            const deleteResponse = await fetch(`${panel.panel_url}/api/user/${testUsername}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${authData.access_token}`,
              },
            });
            
            if (deleteResponse.ok) {
              addLog('Cleanup', 'success', 'Test user deleted successfully');
            } else {
              addLog('Cleanup', 'error', `Failed to delete test user: ${deleteResponse.status}`, {
                status: deleteResponse.status,
                statusText: deleteResponse.statusText
              });
            }
          } catch (cleanupError) {
            addLog('Cleanup', 'error', 'Exception during cleanup', { error: cleanupError.message });
          }
        } else {
          const errorText = await testUserResponse.text();
          addLog('User Creation', 'error', `Failed to create test user: ${testUserResponse.status}`, {
            status: testUserResponse.status,
            statusText: testUserResponse.statusText,
            errorBody: errorText
          });
          
          testUserResult = {
            success: false,
            error: `Failed to create test user: ${testUserResponse.status} - ${errorText}`
          };
        }

      } catch (authError) {
        addLog('Authentication', 'error', 'Authentication exception occurred', {
          error: authError.message,
          stack: authError.stack
        });
        authResult = {
          success: false,
          error: authError.message
        };
        testUserResult = {
          success: false,
          error: `Authentication failed: ${authError.message}`
        };
      }

    } else {
      addLog('Authentication', 'info', 'Testing Marzneshin authentication');
      
      try {
        // Test Marzneshin authentication  
        const authPayload = {
          username: panel.username,
          password: panel.password,
        };

        addLog('Authentication', 'info', 'Sending Marzneshin auth request', { username: panel.username });

        const authResponse = await fetch(`${panel.panel_url}/api/admins/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(authPayload),
        });

        addLog('Authentication', 'info', 'Auth response received', {
          status: authResponse.status,
          statusText: authResponse.statusText,
          ok: authResponse.ok
        });

        if (!authResponse.ok) {
          const errorText = await authResponse.text();
          addLog('Authentication', 'error', `Marzneshin auth failed: ${authResponse.status} ${authResponse.statusText}`, {
            status: authResponse.status,
            statusText: authResponse.statusText,
            errorBody: errorText
          });
          throw new Error(`Marzneshin auth failed: ${authResponse.status} ${authResponse.statusText}`);
        }

        const authData = await authResponse.json();
        addLog('Authentication', 'success', 'Authentication successful', {
          hasAccessToken: !!authData.access_token,
          isSudo: authData.is_sudo
        });

        authResult = {
          success: true,
          tokenReceived: !!authData.access_token,
          isSudo: authData.is_sudo
        };

        // Test creating a user
        const testUsername = `test_${Date.now()}`;
        const expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + 1);
        
        const testUserPayload = {
          username: testUsername,
          expire_strategy: 'fixed_date',
          expire_date: expireDate.toISOString().split('T')[0],
          data_limit: 1073741824, // 1GB
          service_ids: [7], // Basic service
          note: 'Test connection user',
          data_limit_reset_strategy: 'no_reset'
        };

        addLog('User Creation', 'info', `Creating test user: ${testUsername}`, testUserPayload);

        const testUserResponse = await fetch(`${panel.panel_url}/api/users`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authData.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testUserPayload),
        });

        addLog('User Creation', 'info', 'User creation response received', {
          status: testUserResponse.status,
          statusText: testUserResponse.statusText,
          ok: testUserResponse.ok
        });

        if (testUserResponse.ok) {
          const userData = await testUserResponse.json();
          addLog('User Creation', 'success', 'Test user created successfully', {
            username: userData.username,
            hasSubscriptionUrl: !!userData.subscription_url
          });

          testUserResult = {
            success: true,
            username: userData.username,
            subscriptionUrl: userData.subscription_url
          };

          // Clean up test user
          try {
            addLog('Cleanup', 'info', `Deleting test user: ${userData.id}`);
            const deleteResponse = await fetch(`${panel.panel_url}/api/users/${userData.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${authData.access_token}`,
              },
            });
            
            if (deleteResponse.ok) {
              addLog('Cleanup', 'success', 'Test user deleted successfully');
            } else {
              addLog('Cleanup', 'error', `Failed to delete test user: ${deleteResponse.status}`, {
                status: deleteResponse.status,
                statusText: deleteResponse.statusText
              });
            }
          } catch (cleanupError) {
            addLog('Cleanup', 'error', 'Exception during cleanup', { error: cleanupError.message });
          }
        } else {
          const errorText = await testUserResponse.text();
          addLog('User Creation', 'error', `Failed to create test user: ${testUserResponse.status}`, {
            status: testUserResponse.status,
            statusText: testUserResponse.statusText,
            errorBody: errorText
          });
          
          testUserResult = {
            success: false,
            error: `Failed to create test user: ${testUserResponse.status} - ${errorText}`
          };
        }

      } catch (authError) {
        addLog('Authentication', 'error', 'Authentication exception occurred', {
          error: authError.message,
          stack: authError.stack
        });
        authResult = {
          success: false,
          error: authError.message
        };
        testUserResult = {
          success: false,
          error: `Authentication failed: ${authError.message}`
        };
      }
    }

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Update panel health status
    const healthStatus = authResult.success && testUserResult.success ? 'online' : 'offline';
    addLog('Database Update', 'info', `Updating panel health status to: ${healthStatus}`);

    await supabase
      .from('panel_servers')
      .update({
        health_status: healthStatus,
        last_health_check: new Date().toISOString()
      })
      .eq('id', panelId);

    addLog('Database Update', 'success', 'Panel health status updated successfully');

    // Save test log to database
    const testSuccess = authResult.success && testUserResult.success;
    const errorMessage = !testSuccess ? (authResult.error || testUserResult.error || 'Unknown error') : null;

    addLog('Test Log Save', 'info', 'Saving test results to database');

    const { error: logError } = await supabase
      .from('panel_test_logs')
      .insert({
        panel_id: panelId,
        test_result: testSuccess,
        response_time_ms: responseTime,
        error_message: errorMessage,
        test_details: {
          authentication: authResult,
          userCreation: testUserResult,
          logs: detailedLogs
        }
      });

    if (logError) {
      addLog('Test Log Save', 'error', `Failed to save test log: ${logError.message}`, { logError });
    } else {
      addLog('Test Log Save', 'success', 'Test log saved successfully');
    }

    const result = {
      success: testSuccess,
      panel: {
        id: panel.id,
        name: panel.name,
        type: panel.type,
        url: panel.panel_url
      },
      authentication: authResult,
      userCreation: testUserResult,
      responseTime,
      detailedLogs,
      timestamp: new Date().toISOString()
    };

    addLog('Test Completion', 'success', 'Panel connection test completed', { success: result.success });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    addLog('Test Failure', 'error', 'Panel connection test failed', {
      error: error.message,
      stack: error.stack
    });

    console.error('[TEST-PANEL-CONNECTION] Error:', error);

    // Try to save error log to database
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { panelId } = await req.json().catch(() => ({}));
      
      if (panelId) {
        await supabase
          .from('panel_test_logs')
          .insert({
            panel_id: panelId,
            test_result: false,
            response_time_ms: responseTime,
            error_message: error.message,
            test_details: { logs: detailedLogs }
          });
      }
    } catch (saveError) {
      console.error('[TEST-PANEL-CONNECTION] Failed to save error log:', saveError);
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      responseTime,
      detailedLogs,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
