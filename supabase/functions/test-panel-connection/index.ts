
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
    addLog(detailedLogs, 'Request Parse', 'info', 'Starting panel connection test');

    const { panelId, dynamicProxies, enabledProtocols, createUser, userData } = await req.json();
    
    addLog(detailedLogs, 'Request Parse', 'info', 'Request parameters received', { 
      panelId, 
      dynamicProxies, 
      enabledProtocols,
      createUser,
      hasUserData: !!userData
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let panel;
    
    if (panelId) {
      // Use specific panel
      addLog(detailedLogs, 'Panel Selection', 'info', `Fetching specific panel: ${panelId}`);
      
      const { data: panelData, error: panelError } = await supabase
        .from('panel_servers')
        .select('*')
        .eq('id', panelId)
        .single();

      if (panelError || !panelData) {
        addLog(detailedLogs, 'Panel Selection', 'error', `Failed to fetch panel: ${panelError?.message}`);
        throw new Error(`Panel not found: ${panelError?.message}`);
      }
      
      panel = panelData;
    } else {
      // Auto-select panel based on user data panel type or default
      const targetPanelType = userData?.panelType || 'marzban';
      
      addLog(detailedLogs, 'Panel Selection', 'info', `Auto-selecting panel of type: ${targetPanelType}`);
      
      const { data: panels, error: panelError } = await supabase
        .from('panel_servers')
        .select('*')
        .eq('type', targetPanelType)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (panelError) {
        addLog(detailedLogs, 'Panel Selection', 'error', 'Database query failed', panelError);
        throw new Error(`Database query failed: ${panelError.message}`);
      }

      if (!panels || panels.length === 0) {
        addLog(detailedLogs, 'Panel Selection', 'error', `No ${targetPanelType} panels found`, { targetPanelType, totalPanels: 0 });
        throw new Error(`No active ${targetPanelType} panels available`);
      }

      // Prefer healthy panels
      let availablePanels = panels.filter(p => p.health_status === 'online');
      if (availablePanels.length === 0) {
        addLog(detailedLogs, 'Panel Selection', 'info', 'No healthy panels found, using any active panel');
        availablePanels = panels;
      }

      panel = availablePanels[0];
    }

    addLog(detailedLogs, 'Panel Selection', 'success', 'Panel selected', {
      id: panel.id,
      name: panel.name,
      url: panel.panel_url,
      type: panel.type,
      health_status: panel.health_status
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
    let token: string;
    
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

      addLog(detailedLogs, 'Authentication', 'info', `Auth request sent`, {
        status: authResponse.status,
        statusText: authResponse.statusText,
        ok: authResponse.ok
      });

      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        addLog(detailedLogs, 'Authentication', 'error', `Authentication failed: ${authResponse.status}`, {
          responseBody: errorText
        });
        throw new Error(`Authentication failed: ${authResponse.status}`);
      }

      const authData = await authResponse.json();
      token = authData.access_token;

      if (!token) {
        addLog(detailedLogs, 'Authentication', 'error', 'No access token received');
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

      // Fetch template user configuration from 'reza'
      let templateConfig = null;
      
      addLog(detailedLogs, 'Template Fetch', 'info', 'Fetching template user configuration from "reza"');
      
      const templateResponse = await fetch(`${panel.panel_url}/api/user/reza`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      addLog(detailedLogs, 'Template Fetch', 'info', 'Template user fetch response', {
        status: templateResponse.status,
        statusText: templateResponse.statusText,
        ok: templateResponse.ok
      });

      if (templateResponse.ok) {
        templateConfig = await templateResponse.json();
        addLog(detailedLogs, 'Template Fetch', 'success', 'Template user configuration fetched successfully', {
          username: templateConfig.username,
          hasProxies: !!templateConfig.proxies,
          proxiesCount: templateConfig.proxies ? Object.keys(templateConfig.proxies).length : 0,
          hasExcludedInbounds: !!templateConfig.excluded_inbounds,
          originalNote: templateConfig.note
        });
      } else {
        const errorText = await templateResponse.text();
        addLog(detailedLogs, 'Template Fetch', 'error', 'Failed to fetch template user, will use fallback config', {
          status: templateResponse.status,
          errorText: errorText
        });
      }

      // Create User or Test User Creation
      const isActualUserCreation = createUser && userData;
      const targetUsername = isActualUserCreation ? userData.username : `test_${Date.now()}`;
      const targetDataLimit = isActualUserCreation ? userData.dataLimitGB : 1;
      const targetDuration = isActualUserCreation ? userData.durationDays : 1;
      const testExpire = Math.floor(Date.now() / 1000) + (targetDuration * 24 * 60 * 60);
      const targetNotes = isActualUserCreation ? 
        'Created via bnets.co - Subscription' : 
        'Test user - will be deleted';

      addLog(detailedLogs, 'User Creation', 'info', `${isActualUserCreation ? 'Creating actual user' : 'Creating test user'}: ${targetUsername}`);

      // Build user payload using template configuration or fallback
      let userPayload;
      
      if (templateConfig && templateConfig.proxies) {
        // Use template configuration
        addLog(detailedLogs, 'User Creation', 'info', 'Using template configuration from "reza"');
        
        userPayload = {
          username: targetUsername,
          data_limit: targetDataLimit * 1024 * 1024 * 1024, // Convert GB to bytes
          expire: testExpire,
          proxies: templateConfig.proxies, // Use exact proxies from template
          note: targetNotes
        };

        // Include excluded_inbounds if present in template
        if (templateConfig.excluded_inbounds) {
          userPayload.excluded_inbounds = templateConfig.excluded_inbounds;
        }

        // Include any other template fields that might be important
        if (templateConfig.inbounds) {
          userPayload.inbounds = templateConfig.inbounds;
        }

      } else {
        // Fallback to original logic if template fetch failed
        addLog(detailedLogs, 'User Creation', 'info', 'Using fallback configuration (template not available)');
        
        const protocolsToUse = enabledProtocols || panel.enabled_protocols || ['vless', 'vmess', 'trojan', 'shadowsocks'];
        
        userPayload = {
          username: targetUsername,
          data_limit: targetDataLimit * 1024 * 1024 * 1024, // Convert GB to bytes
          expire: testExpire,
          proxies: protocolsToUse.reduce((acc: any, protocol: string) => {
            acc[protocol] = {};
            return acc;
          }, {}),
          note: targetNotes
        };
      }

      addLog(detailedLogs, 'User Creation', 'info', 'Creating user with payload', {
        username: userPayload.username,
        dataLimit: userPayload.data_limit,
        expire: userPayload.expire,
        proxiesCount: Object.keys(userPayload.proxies || {}).length,
        proxiesTypes: Object.keys(userPayload.proxies || {}),
        hasExcludedInbounds: !!userPayload.excluded_inbounds,
        note: userPayload.note
      });

      const createResponse = await fetch(`${panel.panel_url}/api/user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userPayload),
      });

      addLog(detailedLogs, 'User Creation', 'info', 'User creation response', {
        status: createResponse.status,
        statusText: createResponse.statusText,
        ok: createResponse.ok
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        addLog(detailedLogs, 'User Creation', 'error', `User creation failed: ${createResponse.status}`, {
          errorText: errorText
        });
        throw new Error(`User creation failed: ${createResponse.status} - ${errorText}`);
      }

      const createdUserData = await createResponse.json();
      
      addLog(detailedLogs, 'User Creation', 'success', `User created successfully`, {
        username: createdUserData.username,
        hasSubscriptionUrl: !!createdUserData.subscription_url
      });

      testResult.userCreation = {
        success: true,
        username: createdUserData.username,
        subscriptionUrl: createdUserData.subscription_url,
        expire: createdUserData.expire,
        dataLimit: createdUserData.data_limit
      };

      // If this is a test (not actual user creation), clean up by deleting the test user
      if (!isActualUserCreation) {
        addLog(detailedLogs, 'Cleanup', 'info', `Deleting test user: ${targetUsername}`);

        const deleteResponse = await fetch(`${panel.panel_url}/api/user/${targetUsername}`, {
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
      } else if (userData.subscriptionId) {
        // Update subscription record for actual user creation
        addLog(detailedLogs, 'Subscription Update', 'info', 'Updating subscription record');
        
        try {
          const subscriptionUrl = createdUserData.subscription_url || `${panel.panel_url}/sub/${createdUserData.username}`;
          const expireAt = createdUserData.expire ? 
            new Date(createdUserData.expire * 1000).toISOString() : 
            new Date(Date.now() + targetDuration * 24 * 60 * 60 * 1000).toISOString();

          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              subscription_url: subscriptionUrl,
              marzban_user_created: true,
              expire_at: expireAt,
              updated_at: new Date().toISOString()
            })
            .eq('id', userData.subscriptionId);

          if (updateError) {
            addLog(detailedLogs, 'Subscription Update', 'error', 'Failed to update subscription record', updateError);
          } else {
            addLog(detailedLogs, 'Subscription Update', 'success', 'Subscription record updated successfully');
          }
        } catch (updateError) {
          addLog(detailedLogs, 'Subscription Update', 'error', 'Exception during subscription update', updateError);
        }
      }

      testResult.success = true;
    }

    // Update panel health status
    const healthStatus = testResult.success ? 'online' : 'offline';
    addLog(detailedLogs, 'Health Update', 'info', `Updating panel health status to: ${healthStatus}`);

    const { error: updateError } = await supabase
      .from('panel_servers')
      .update({ 
        health_status: healthStatus,
        last_health_check: new Date().toISOString()
      })
      .eq('id', panel.id);

    if (updateError) {
      addLog(detailedLogs, 'Health Update', 'error', `Failed to update panel status: ${updateError.message}`);
    } else {
      addLog(detailedLogs, 'Health Update', 'success', 'Panel health status updated successfully');
    }

    testResult.responseTime = Date.now() - startTime;
    testResult.detailedLogs = detailedLogs;

    addLog(detailedLogs, 'Test Complete', 'success', 'Panel connection test completed', { success: testResult.success });

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
