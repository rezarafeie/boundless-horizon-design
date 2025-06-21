
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetailedLog {
  step: string;
  status: 'success' | 'error' | 'info';
  message: string;
  details?: any;
  timestamp: string;
}

function addLog(logs: DetailedLog[], step: string, status: 'success' | 'error' | 'info', message: string, details?: any) {
  const logEntry = {
    step,
    status,
    message,
    details,
    timestamp: new Date().toISOString()
  };
  logs.push(logEntry);
  console.log(`[TEST-PANEL-CONNECTION] ${status.toUpperCase()}: ${step} - ${message}`, details ? JSON.stringify(details, null, 2) : '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const detailedLogs: DetailedLog[] = [];
  const startTime = Date.now();

  try {
    addLog(detailedLogs, 'Test Initialization', 'info', 'Starting panel connection test');

    const { panelId, dynamicProxies, enabledProtocols } = await req.json();
    
    addLog(detailedLogs, 'Request Parsing', 'info', 'Test parameters received', { 
      panelId, 
      dynamicProxies, 
      enabledProtocols 
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    addLog(detailedLogs, 'Database Query', 'info', `Fetching panel data for ID: ${panelId}`);

    // Get panel information
    const { data: panel, error: panelError } = await supabase
      .from('panel_servers')
      .select('*')
      .eq('id', panelId)
      .single();

    if (panelError || !panel) {
      addLog(detailedLogs, 'Database Query', 'error', `Failed to fetch panel: ${panelError?.message}`);
      throw new Error(`Panel not found: ${panelError?.message}`);
    }

    addLog(detailedLogs, 'Database Query', 'success', 'Panel data retrieved successfully', {
      name: panel.name,
      type: panel.type,
      url: panel.panel_url,
      username: panel.username,
      enabledProtocols: enabledProtocols
    });

    const testResult = {
      success: false,
      panel: {
        id: panel.id,
        name: panel.name,
        type: panel.type,
        url: panel.panel_url
      },
      authentication: { success: false },
      userCreation: { success: false },
      responseTime: 0,
      detailedLogs: detailedLogs,
      timestamp: new Date().toISOString()
    };

    // Test Authentication
    if (panel.type === 'marzban') {
      addLog(detailedLogs, 'Authentication', 'info', 'Testing Marzban authentication');

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

      addLog(detailedLogs, 'Authentication', 'info', `Auth request sent to ${panel.panel_url}/api/admin/token`, {
        status: authResponse.status,
        statusText: authResponse.statusText,
        ok: authResponse.ok
      });

      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        addLog(detailedLogs, 'Authentication', 'error', `Authentication failed: ${authResponse.status} ${authResponse.statusText}`, {
          responseBody: errorText
        });
        throw new Error(`Authentication failed: ${authResponse.status}`);
      }

      const authData = await authResponse.json();
      const token = authData.access_token;

      if (!token) {
        addLog(detailedLogs, 'Authentication', 'error', 'No access token received from panel');
        throw new Error('No access token received');
      }

      addLog(detailedLogs, 'Authentication', 'success', 'Authentication successful', {
        hasAccessToken: !!token,
        tokenType: authData.token_type || 'bearer'
      });

      testResult.authentication = {
        success: true,
        tokenReceived: true,
        tokenType: authData.token_type || 'bearer'
      };

      // Test User Creation with fallback protocols
      const testUsername = `test_${Date.now()}`;
      const testExpire = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours from now

      addLog(detailedLogs, 'User Creation', 'info', `Creating test user: ${testUsername}`);

      // Try creating user with minimal protocol setup first
      const protocolsToTry = [
        ['vless'], // Try VLESS only first
        ['trojan'], // Then Trojan only
        ['shadowsocks'], // Then Shadowsocks only
        enabledProtocols || ['vless', 'vmess', 'trojan', 'shadowsocks'] // Finally try all enabled
      ];

      let userCreationSuccess = false;
      let userData = null;
      let lastError = null;

      for (const protocols of protocolsToTry) {
        try {
          const userPayload = {
            username: testUsername,
            data_limit: 1 * 1024 * 1024 * 1024, // 1GB in bytes
            expire: testExpire,
            proxies: protocols.reduce((acc, protocol) => {
              acc[protocol] = {};
              return acc;
            }, {} as Record<string, {}>)
          };

          addLog(detailedLogs, 'User Creation', 'info', `Trying user creation with protocols: ${protocols.join(', ')}`, userPayload);

          const createResponse = await fetch(`${panel.panel_url}/api/user`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userPayload),
          });

          addLog(detailedLogs, 'User Creation', 'info', `User creation response for ${protocols.join(', ')}`, {
            status: createResponse.status,
            statusText: createResponse.statusText,
            ok: createResponse.ok
          });

          if (createResponse.ok) {
            userData = await createResponse.json();
            addLog(detailedLogs, 'User Creation', 'success', `Test user created successfully with protocols: ${protocols.join(', ')}`, {
              username: userData.username,
              hasSubscriptionUrl: !!userData.subscription_url,
              workingProtocols: protocols
            });
            userCreationSuccess = true;
            break;
          } else {
            const errorBody = await createResponse.text();
            lastError = errorBody;
            addLog(detailedLogs, 'User Creation', 'info', `Failed with protocols ${protocols.join(', ')}: ${createResponse.status}`, {
              status: createResponse.status,
              statusText: createResponse.statusText,
              errorBody: errorBody
            });
            // Continue to next protocol combination
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Unknown error';
          addLog(detailedLogs, 'User Creation', 'info', `Error with protocols ${protocols.join(', ')}: ${lastError}`);
          // Continue to next protocol combination
        }
      }

      if (!userCreationSuccess) {
        addLog(detailedLogs, 'User Creation', 'error', 'All protocol combinations failed', {
          lastError: lastError
        });
        throw new Error(`User creation failed with all protocol combinations. Last error: ${lastError}`);
      }

      testResult.userCreation = {
        success: true,
        username: userData.username,
        subscriptionUrl: userData.subscription_url
      };

      // Clean up - Delete test user
      addLog(detailedLogs, 'Cleanup', 'info', `Deleting test user: ${testUsername}`);

      const deleteResponse = await fetch(`${panel.panel_url}/api/user/${testUsername}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (deleteResponse.ok) {
        addLog(detailedLogs, 'Cleanup', 'success', 'Test user deleted successfully');
      } else {
        addLog(detailedLogs, 'Cleanup', 'error', 'Failed to delete test user (non-critical)', {
          status: deleteResponse.status,
          statusText: deleteResponse.statusText
        });
      }

      testResult.success = true;
    }

    // Update panel health status
    const healthStatus = testResult.success ? 'online' : 'offline';
    addLog(detailedLogs, 'Database Update', 'info', `Updating panel health status to: ${healthStatus}`);

    const { error: updateError } = await supabase
      .from('panel_servers')
      .update({ 
        health_status: healthStatus,
        last_health_check: new Date().toISOString()
      })
      .eq('id', panelId);

    if (updateError) {
      addLog(detailedLogs, 'Database Update', 'error', `Failed to update panel status: ${updateError.message}`);
    } else {
      addLog(detailedLogs, 'Database Update', 'success', 'Panel health status updated successfully');
    }

    // Save test log
    addLog(detailedLogs, 'Test Log Save', 'info', 'Saving test results to database');

    const { error: logError } = await supabase
      .from('panel_test_logs')
      .insert({
        panel_id: panelId,
        test_result: testResult.success,
        response_time_ms: Date.now() - startTime,
        test_details: {
          authentication: testResult.authentication,
          userCreation: testResult.userCreation,
          enabledProtocols: enabledProtocols,
          dynamicProxies: dynamicProxies,
          detailedLogs: detailedLogs
        },
        error_message: testResult.success ? null : detailedLogs.filter(log => log.status === 'error').map(log => log.message).join('; ')
      });

    if (logError) {
      addLog(detailedLogs, 'Test Log Save', 'error', `Failed to save test log: ${logError.message}`);
    } else {
      addLog(detailedLogs, 'Test Log Save', 'success', 'Test log saved successfully');
    }

    testResult.responseTime = Date.now() - startTime;
    testResult.detailedLogs = detailedLogs;

    addLog(detailedLogs, 'Test Completion', 'success', 'Panel connection test completed', { success: testResult.success });

    return new Response(JSON.stringify(testResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    addLog(detailedLogs, 'Test Error', 'error', `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    const errorResult = {
      success: false,
      panel: { id: '', name: '', type: '', url: '' },
      authentication: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      userCreation: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      responseTime: Date.now() - startTime,
      detailedLogs: detailedLogs,
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(errorResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
