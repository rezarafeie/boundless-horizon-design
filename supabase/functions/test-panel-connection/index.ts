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

function createErrorResponse(logs: DetailedLog[], error: string, startTime: number) {
  return {
    success: false,
    panel: { id: '', name: '', type: '', url: '' },
    authentication: { success: false, error },
    userCreation: { success: false, error },
    responseTime: Date.now() - startTime,
    detailedLogs: logs,
    timestamp: new Date().toISOString()
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const detailedLogs: DetailedLog[] = [];
  const startTime = Date.now();

  try {
    addLog(detailedLogs, 'Function Init', 'info', 'Edge function started successfully');

    // Validate request method
    if (req.method !== 'POST') {
      addLog(detailedLogs, 'Request Validation', 'error', `Invalid request method: ${req.method}. Expected POST.`);
      const errorResult = createErrorResponse(detailedLogs, `Invalid request method: ${req.method}`, startTime);
      return new Response(JSON.stringify(errorResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Validate and parse request body with timeout
    let requestBody;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const bodyText = await req.text();
      clearTimeout(timeoutId);
      
      addLog(detailedLogs, 'Request Parse', 'info', 'Request body received', { 
        bodyLength: bodyText.length,
        isEmpty: !bodyText.trim()
      });

      if (!bodyText.trim()) {
        throw new Error('Request body is empty');
      }

      requestBody = JSON.parse(bodyText);
      addLog(detailedLogs, 'Request Parse', 'success', 'Request body parsed successfully');
      
    } catch (parseError) {
      addLog(detailedLogs, 'Request Parse', 'error', 'Failed to parse request body', { 
        error: parseError.message,
        parseError: parseError.name
      });
      const errorResult = createErrorResponse(detailedLogs, `Request parsing failed: ${parseError.message}`, startTime);
      return new Response(JSON.stringify(errorResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { panelId, dynamicProxies, enabledProtocols, createUser, userData } = requestBody;
    
    addLog(detailedLogs, 'Request Parse', 'info', 'Request parameters received', { 
      panelId: panelId || 'auto-select', 
      dynamicProxies: !!dynamicProxies, 
      enabledProtocols: enabledProtocols || 'default',
      createUser: !!createUser,
      hasUserData: !!userData
    });

    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      addLog(detailedLogs, 'Environment Check', 'error', 'Missing required environment variables', {
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
      const errorResult = createErrorResponse(detailedLogs, 'Missing required environment variables', startTime);
      return new Response(JSON.stringify(errorResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    addLog(detailedLogs, 'Supabase Init', 'success', 'Supabase client initialized');

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
        addLog(detailedLogs, 'Panel Selection', 'error', `Failed to fetch panel: ${panelError?.message || 'Panel not found'}`);
        const errorResult = createErrorResponse(detailedLogs, `Panel not found: ${panelError?.message || 'Unknown error'}`, startTime);
        return new Response(JSON.stringify(errorResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      
      panel = panelData;

      // Auto-fix panel URL if it's using the old auth.rain.rest domain
      if (panel.panel_url === 'https://auth.rain.rest' && panel.type === 'marzneshin') {
        addLog(detailedLogs, 'Panel URL Fix', 'info', 'Updating panel URL from auth.rain.rest to p.rain.rest');
        
        const { error: updateError } = await supabase
          .from('panel_servers')
          .update({ panel_url: 'https://p.rain.rest' })
          .eq('id', panelId);

        if (updateError) {
          addLog(detailedLogs, 'Panel URL Fix', 'error', 'Failed to update panel URL', updateError);
        } else {
          panel.panel_url = 'https://p.rain.rest';
          addLog(detailedLogs, 'Panel URL Fix', 'success', 'Panel URL updated successfully');
        }
      }
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
        const errorResult = createErrorResponse(detailedLogs, `Database query failed: ${panelError.message}`, startTime);
        return new Response(JSON.stringify(errorResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      if (!panels || panels.length === 0) {
        addLog(detailedLogs, 'Panel Selection', 'error', `No ${targetPanelType} panels found`, { targetPanelType, totalPanels: 0 });
        const errorResult = createErrorResponse(detailedLogs, `No active ${targetPanelType} panels available`, startTime);
        return new Response(JSON.stringify(errorResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
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
      health_status: panel.health_status,
      hasUsername: !!panel.username,
      hasPassword: !!panel.password,
      usernameLength: panel.username?.length || 0,
      passwordLength: panel.password?.length || 0
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

    // Test basic connectivity first
    addLog(detailedLogs, 'Connectivity Test', 'info', 'Testing basic connectivity to panel');
    
    try {
      const connectivityController = new AbortController();
      const connectivityTimeoutId = setTimeout(() => connectivityController.abort(), 8000);
      
      const connectivityResponse = await fetch(panel.panel_url, {
        method: 'GET',
        headers: { 
          'Accept': 'text/html,application/json',
          'User-Agent': 'Supabase-Edge-Function/1.0'
        },
        signal: connectivityController.signal
      });
      
      clearTimeout(connectivityTimeoutId);
      
      addLog(detailedLogs, 'Connectivity Test', 'success', 'Panel is reachable', {
        status: connectivityResponse.status,
        statusText: connectivityResponse.statusText
      });
    } catch (connectivityError) {
      addLog(detailedLogs, 'Connectivity Test', 'error', 'Panel connectivity failed', {
        error: connectivityError.message,
        isTimeout: connectivityError.name === 'AbortError'
      });
      
      const errorResult = createErrorResponse(detailedLogs, `Panel unreachable: ${connectivityError.message}`, startTime);
      return new Response(JSON.stringify(errorResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Test Authentication
    let token: string;
    
    if (panel.type === 'marzban') {
      addLog(detailedLogs, 'Authentication', 'info', 'Testing Marzban authentication without grant_type');

      try {
        const authController = new AbortController();
        const authTimeoutId = setTimeout(() => authController.abort(), 15000);

        // Create URL-encoded form data without grant_type
        const params = new URLSearchParams();
        params.append('username', panel.username);
        params.append('password', panel.password);

        const authResponse = await fetch(`${panel.panel_url}/api/admin/token`, {
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

        addLog(detailedLogs, 'Authentication', 'info', `Marzban Auth response`, {
          status: authResponse.status,
          statusText: authResponse.statusText,
          ok: authResponse.ok
        });

        if (!authResponse.ok) {
          const errorText = await authResponse.text();
          addLog(detailedLogs, 'Authentication', 'error', 'Marzban authentication failed', {
            status: authResponse.status,
            statusText: authResponse.statusText,
            responseBody: errorText
          });
          throw new Error(`Marzban auth failed: ${authResponse.status} - ${errorText}`);
        }

        const authData = await authResponse.json();
        token = authData.access_token;
        
        if (!token) {
          throw new Error('No access token in Marzban response');
        }

        addLog(detailedLogs, 'Authentication', 'success', 'Marzban Authentication successful', {
          hasAccessToken: !!token,
          tokenType: authData.token_type || 'bearer',
          tokenLength: token.length
        });

        testResult.authentication = {
          success: true,
          tokenReceived: true,
          tokenType: authData.token_type || 'bearer'
        };

        // Fetch template user configuration for proxy data
        addLog(detailedLogs, 'Template Fetch', 'info', 'Fetching template user configuration for proxy data');
        
        let templateUser = null;
        try {
          const templateUserResponse = await fetch(`${panel.panel_url}/api/user/reza`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });

          if (templateUserResponse.ok) {
            templateUser = await templateUserResponse.json();
            addLog(detailedLogs, 'Template Fetch', 'success', 'Template user fetched successfully', {
              username: templateUser.username,
              hasProxies: !!templateUser.proxies,
              hasInbounds: !!templateUser.inbounds,
              proxiesCount: Object.keys(templateUser.proxies || {}).length,
              inboundsCount: Object.keys(templateUser.inbounds || {}).length
            });
          } else {
            addLog(detailedLogs, 'Template Fetch', 'error', 'Template user fetch failed, will use fallback', {
              status: templateUserResponse.status
            });
          }
        } catch (templateError) {
          addLog(detailedLogs, 'Template Fetch', 'error', 'Template user fetch exception, will use fallback', {
            error: templateError.message
          });
        }

        // Create test user for Marzban
        const isActualUserCreation = createUser && userData;
        const targetUsername = isActualUserCreation ? userData.username : `test_${Date.now()}`;
        const targetDataLimit = isActualUserCreation ? userData.dataLimitGB : 1;
        const targetDuration = isActualUserCreation ? userData.durationDays : 1;
        const targetNotes = isActualUserCreation ? 
          'Created via bnets.co - Subscription' : 
          'Test user - will be deleted';

        addLog(detailedLogs, 'User Creation', 'info', `${isActualUserCreation ? 'Creating actual Marzban user' : 'Creating Marzban test user'}: ${targetUsername}`);

        // Calculate expire timestamp for Marzban (Unix timestamp)
        const expireTimestamp = Math.floor((Date.now() + (targetDuration * 24 * 60 * 60 * 1000)) / 1000);

        // Build Marzban user payload with proper proxy configuration
        let userPayload;
        
        if (templateUser && (templateUser.proxies || templateUser.inbounds)) {
          // Use template user proxy/inbound configuration
          userPayload = {
            username: targetUsername,
            proxies: templateUser.proxies || {},
            inbounds: templateUser.inbounds || {},
            data_limit: targetDataLimit * 1024 * 1024 * 1024, // Convert GB to bytes
            expire: expireTimestamp, // Unix timestamp
            data_limit_reset_strategy: templateUser.data_limit_reset_strategy || "no_reset",
            status: "active",
            note: targetNotes,
            excluded_inbounds: templateUser.excluded_inbounds || {}
          };

          addLog(detailedLogs, 'User Creation Debug', 'info', 'Using template user proxy configuration', {
            proxiesUsed: Object.keys(templateUser.proxies || {}).length > 0,
            inboundsUsed: Object.keys(templateUser.inbounds || {}).length > 0
          });
        } else if (dynamicProxies && enabledProtocols) {
          // Use dynamic proxies from enabled protocols
          const proxies: Record<string, {}> = {};
          enabledProtocols.forEach((protocol: string) => {
            proxies[protocol] = {};
          });

          userPayload = {
            username: targetUsername,
            proxies: proxies,
            data_limit: targetDataLimit * 1024 * 1024 * 1024,
            expire: expireTimestamp,
            data_limit_reset_strategy: "no_reset",
            status: "active",
            note: targetNotes
          };

          addLog(detailedLogs, 'User Creation Debug', 'info', 'Using dynamic proxies from enabled protocols', {
            enabledProtocols: enabledProtocols,
            proxiesCount: Object.keys(proxies).length
          });
        } else {
          // Fallback - use stored panel inbound data or default
          const storedInbounds = panel.panel_config_data?.inbounds || [];
          
          if (storedInbounds.length > 0) {
            userPayload = {
              username: targetUsername,
              proxies: {},
              inbounds: storedInbounds.reduce((acc: Record<string, {}>, inbound: any) => {
                acc[inbound.tag] = {};
                return acc;
              }, {}),
              data_limit: targetDataLimit * 1024 * 1024 * 1024,
              expire: expireTimestamp,
              data_limit_reset_strategy: "no_reset",
              status: "active",
              note: targetNotes
            };

            addLog(detailedLogs, 'User Creation Debug', 'info', 'Using stored panel inbound data as fallback', {
              inboundsCount: storedInbounds.length
            });
          } else {
            // Last resort fallback - create with minimal proxy config
            userPayload = {
              username: targetUsername,
              proxies: { "vless": {} }, // Minimal proxy config
              data_limit: targetDataLimit * 1024 * 1024 * 1024,
              expire: expireTimestamp,
              data_limit_reset_strategy: "no_reset",
              status: "active",
              note: targetNotes
            };

            addLog(detailedLogs, 'User Creation Debug', 'info', 'Using minimal fallback proxy configuration', {
              fallbackProxy: 'vless'
            });
          }
        }

        addLog(detailedLogs, 'User Creation Debug', 'info', 'Marzban user payload prepared', {
          username: userPayload.username,
          dataLimitGB: targetDataLimit,
          durationDays: targetDuration,
          expireTimestamp: expireTimestamp,
          expireDate: new Date(expireTimestamp * 1000).toISOString(),
          hasProxies: Object.keys(userPayload.proxies || {}).length > 0,
          hasInbounds: Object.keys(userPayload.inbounds || {}).length > 0
        });

        try {
          const createController = new AbortController();
          const createTimeoutId = setTimeout(() => createController.abort(), 15000);

          const createResponse = await fetch(`${panel.panel_url}/api/user`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(userPayload),
            signal: createController.signal
          });

          clearTimeout(createTimeoutId);

          addLog(detailedLogs, 'User Creation', 'info', 'Marzban user creation response', {
            status: createResponse.status,
            statusText: createResponse.statusText,
            ok: createResponse.ok
          });

          if (!createResponse.ok) {
            const errorText = await createResponse.text();
            addLog(detailedLogs, 'User Creation', 'error', `Marzban user creation failed: ${createResponse.status}`, {
              errorText: errorText
            });
            throw new Error(`Marzban user creation failed: ${createResponse.status} - ${errorText}`);
          }

          const createdUserData = await createResponse.json();
          
          addLog(detailedLogs, 'User Creation', 'success', `Marzban user created successfully`, {
            username: createdUserData.username,
            hasSubscriptionUrl: !!createdUserData.subscription_url,
            expire: createdUserData.expire
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
            addLog(detailedLogs, 'Cleanup', 'info', `Deleting Marzban test user: ${targetUsername}`);

            try {
              const deleteController = new AbortController();
              const deleteTimeoutId = setTimeout(() => deleteController.abort(), 10000);

              const deleteResponse = await fetch(`${panel.panel_url}/api/user/${targetUsername}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/json'
                },
                signal: deleteController.signal
              });

              clearTimeout(deleteTimeoutId);

              if (deleteResponse.ok) {
                addLog(detailedLogs, 'Cleanup', 'success', 'Marzban test user deleted successfully');
              } else {
                addLog(detailedLogs, 'Cleanup', 'error', 'Failed to delete Marzban test user (non-critical)', {
                  status: deleteResponse.status,
                  statusText: deleteResponse.statusText
                });
              }
            } catch (deleteError) {
              addLog(detailedLogs, 'Cleanup', 'error', 'Delete Marzban test user exception (non-critical)', {
                error: deleteError.message
              });
            }
          }

          testResult.success = true;
        } catch (userCreateError) {
          addLog(detailedLogs, 'User Creation', 'error', `Marzban user creation exception: ${userCreateError.message}`);
          throw userCreateError;
        }

      } catch (authError) {
        addLog(detailedLogs, 'Authentication', 'error', 'Marzban authentication failed', {
          error: authError.message,
          name: authError.name,
          isTimeoutError: authError.name === 'AbortError'
        });
        throw new Error(`Marzban authentication failed: ${authError.message}`);
      }

    } else if (panel.type === 'marzneshin') {
      addLog(detailedLogs, 'Authentication', 'info', 'Testing Marzneshin authentication');

      // Log the credentials being used (safely)
      addLog(detailedLogs, 'Authentication Debug', 'info', 'Preparing Marzneshin authentication request', {
        panelUrl: panel.panel_url,
        authEndpoint: `${panel.panel_url}/api/admins/token`,
        hasUsername: !!panel.username,
        hasPassword: !!panel.password,
        username: panel.username, // Show actual username for debugging
        passwordMasked: panel.password ? '*'.repeat(panel.password.length) : 'NO_PASSWORD'
      });

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // Increased timeout to 20 seconds

        // Create form data payload as Marzneshin expects (matching marzneshin-create-user function)
        const formData = new URLSearchParams({
          grant_type: 'password',
          username: panel.username,
          password: panel.password
        });

        addLog(detailedLogs, 'Authentication Debug', 'info', 'Sending authentication request', {
          requestBody: {
            grant_type: 'password',
            username: panel.username,
            password: panel.password ? '*'.repeat(panel.password.length) : 'NO_PASSWORD'
          }
        });

        const authResponse = await fetch(`${panel.panel_url}/api/admins/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'Supabase-Edge-Function/1.0'
          },
          body: formData.toString(),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        addLog(detailedLogs, 'Authentication', 'info', `Marzneshin Auth response`, {
          status: authResponse.status,
          statusText: authResponse.statusText,
          ok: authResponse.ok
        });

        if (!authResponse.ok) {
          const errorText = await authResponse.text();
          addLog(detailedLogs, 'Authentication Debug', 'error', 'Authentication response error details', {
            status: authResponse.status,
            statusText: authResponse.statusText,
            responseBody: errorText
          });
          throw new Error(`Marzneshin auth failed: ${authResponse.status} - ${errorText}`);
        }

        const authData = await authResponse.json();
        token = authData.access_token;
        
        if (!token) {
          throw new Error('No access token in Marzneshin response');
        }

        addLog(detailedLogs, 'Authentication', 'success', 'Marzneshin Authentication successful', {
          hasAccessToken: !!token,
          tokenType: authData.token_type || 'bearer'
        });

        testResult.authentication = {
          success: true,
          tokenReceived: true,
          tokenType: authData.token_type || 'bearer'
        };
      } catch (authError) {
        addLog(detailedLogs, 'Authentication', 'error', 'Marzneshin authentication failed', {
          error: authError.message,
          name: authError.name,
          isTimeoutError: authError.name === 'AbortError'
        });
        throw new Error(`Marzneshin authentication failed: ${authError.message}`);
      }

      // Create test user for Marzneshin
      const isActualUserCreation = createUser && userData;
      const targetUsername = isActualUserCreation ? userData.username : `test_${Date.now()}`;
      const targetDataLimit = isActualUserCreation ? userData.dataLimitGB : 1;
      const targetDuration = isActualUserCreation ? userData.durationDays : 1;
      const targetNotes = isActualUserCreation ? 
        'Created via bnets.co - Subscription' : 
        'Test user - will be deleted';

      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + targetDuration);
      const expireDateISO = expireDate.toISOString().split('T')[0] + 'T00:00:00';

      addLog(detailedLogs, 'User Creation', 'info', `${isActualUserCreation ? 'Creating actual Marzneshin user' : 'Creating Marzneshin test user'}: ${targetUsername}`);

      const userPayload = {
        username: targetUsername,
        data_limit: targetDataLimit * 1024 * 1024 * 1024,
        usage_duration: targetDuration * 24 * 60 * 60,
        expire_strategy: "fixed_date",
        expire_date: expireDateISO,
        service_ids: [1],
        note: targetNotes
      };

      addLog(detailedLogs, 'User Creation Debug', 'info', 'Marzneshin user payload prepared', {
        username: userPayload.username,
        dataLimitGB: targetDataLimit,
        durationDays: targetDuration,
        expireDate: expireDateISO,
        expireStrategy: userPayload.expire_strategy
      });

      try {
        const createResponse = await fetch(`${panel.panel_url}/api/users`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(userPayload),
        });

        addLog(detailedLogs, 'User Creation', 'info', 'Marzneshin user creation response', {
          status: createResponse.status,
          statusText: createResponse.statusText,
          ok: createResponse.ok
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          addLog(detailedLogs, 'User Creation', 'error', `Marzneshin user creation failed: ${createResponse.status}`, {
            errorText: errorText
          });
          throw new Error(`Marzneshin user creation failed: ${createResponse.status} - ${errorText}`);
        }

        const createdUserData = await createResponse.json();
        
        addLog(detailedLogs, 'User Creation', 'success', `Marzneshin user created successfully`, {
          username: createdUserData.username,
          hasSubscriptionUrl: !!createdUserData.subscription_url,
          expireDate: createdUserData.expire_date
        });

        testResult.userCreation = {
          success: true,
          username: createdUserData.username,
          subscriptionUrl: createdUserData.subscription_url,
          expire: createdUserData.expire_date,
          dataLimit: createdUserData.data_limit
        };

        if (!isActualUserCreation) {
          addLog(detailedLogs, 'Cleanup', 'info', `Deleting Marzneshin test user: ${targetUsername}`);

          try {
            const deleteResponse = await fetch(`${panel.panel_url}/api/users/${targetUsername}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
              },
            });

            if (deleteResponse.ok) {
              addLog(detailedLogs, 'Cleanup', 'success', 'Marzneshin test user deleted successfully');
            } else {
              addLog(detailedLogs, 'Cleanup', 'error', 'Failed to delete Marzneshin test user (non-critical)', {
                status: deleteResponse.status,
                statusText: deleteResponse.statusText
              });
            }
          } catch (deleteError) {
            addLog(detailedLogs, 'Cleanup', 'error', 'Delete Marzneshin test user exception (non-critical)', {
              error: deleteError.message
            });
          }
        }

        testResult.success = true;
      } catch (userCreateError) {
        addLog(detailedLogs, 'User Creation', 'error', `Marzneshin user creation exception: ${userCreateError.message}`);
        throw userCreateError;
      }
    }

    // Update panel health status
    const healthStatus = testResult.success ? 'online' : 'offline';
    addLog(detailedLogs, 'Health Update', 'info', `Updating panel health status to: ${healthStatus}`);

    try {
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
    } catch (updateError) {
      addLog(detailedLogs, 'Health Update', 'error', 'Panel health update exception', { error: updateError.message });
    }

    testResult.responseTime = Date.now() - startTime;
    testResult.detailedLogs = detailedLogs;

    addLog(detailedLogs, 'Test Complete', 'success', 'Panel connection test completed', { success: testResult.success });

    return new Response(JSON.stringify(testResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    addLog(detailedLogs, 'Test Error', 'error', `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorStack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    const errorResult = createErrorResponse(detailedLogs, error instanceof Error ? error.message : 'Unknown error', startTime);

    return new Response(JSON.stringify(errorResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
