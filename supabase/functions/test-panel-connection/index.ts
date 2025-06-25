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
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
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
      addLog(detailedLogs, 'Authentication', 'info', 'Testing Marzban authentication with JSON payload');

      // Try JSON authentication first (most common)
      try {
        const authResponse = await fetch(`${panel.panel_url}/api/admin/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Supabase-Edge-Function/1.0'
          },
          body: JSON.stringify({
            username: panel.username,
            password: panel.password,
          }),
        });

        addLog(detailedLogs, 'Authentication', 'info', `JSON Auth response`, {
          status: authResponse.status,
          statusText: authResponse.statusText,
          ok: authResponse.ok,
          headers: Object.fromEntries(authResponse.headers.entries())
        });

        if (authResponse.ok) {
          const authData = await authResponse.json();
          token = authData.access_token;
          
          if (token) {
            addLog(detailedLogs, 'Authentication', 'success', 'JSON Authentication successful', {
              hasAccessToken: !!token,
              tokenType: authData.token_type || 'bearer'
            });

            testResult.authentication = {
              success: true,
              tokenReceived: true,
              tokenType: authData.token_type || 'bearer'
            };
          } else {
            throw new Error('No access token in response');
          }
        } else {
          const errorText = await authResponse.text();
          throw new Error(`JSON auth failed: ${authResponse.status} - ${errorText}`);
        }
      } catch (jsonError) {
        addLog(detailedLogs, 'Authentication', 'info', 'JSON auth failed, trying form-data', { error: jsonError.message });
        
        // Fallback to form-data authentication
        try {
          const formData = new FormData();
          formData.append('username', panel.username);
          formData.append('password', panel.password);

          const authResponse = await fetch(`${panel.panel_url}/api/admin/token`, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Supabase-Edge-Function/1.0'
            },
            body: formData,
          });

          addLog(detailedLogs, 'Authentication', 'info', `Form-data Auth response`, {
            status: authResponse.status,
            statusText: authResponse.statusText,
            ok: authResponse.ok
          });

          if (authResponse.ok) {
            const authData = await authResponse.json();
            token = authData.access_token;
            
            if (token) {
              addLog(detailedLogs, 'Authentication', 'success', 'Form-data Authentication successful', {
                hasAccessToken: !!token,
                tokenType: authData.token_type || 'bearer'
              });

              testResult.authentication = {
                success: true,
                tokenReceived: true,
                tokenType: authData.token_type || 'bearer'
              };
            } else {
              throw new Error('No access token in form-data response');
            }
          } else {
            const errorText = await authResponse.text();
            throw new Error(`Form-data auth failed: ${authResponse.status} - ${errorText}`);
          }
        } catch (formError) {
          addLog(detailedLogs, 'Authentication', 'error', 'Both authentication methods failed', {
            jsonError: jsonError.message,
            formError: formError.message
          });
          throw new Error(`Authentication failed: ${formError.message}`);
        }
      }

      // Fetch template user configuration from 'reza'
      let templateConfig = null;
      
      addLog(detailedLogs, 'Template Fetch', 'info', 'Fetching template user configuration from "reza"');
      
      try {
        const templateResponse = await fetch(`${panel.panel_url}/api/user/reza`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
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
      } catch (templateError) {
        addLog(detailedLogs, 'Template Fetch', 'error', 'Template fetch error, using fallback', {
          error: templateError.message
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

      try {
        const createResponse = await fetch(`${panel.panel_url}/api/user`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
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

          try {
            const deleteResponse = await fetch(`${panel.panel_url}/api/user/${targetUsername}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
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
          } catch (deleteError) {
            addLog(detailedLogs, 'Cleanup', 'error', 'Delete test user exception (non-critical)', {
              error: deleteError.message
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
      } catch (userCreateError) {
        addLog(detailedLogs, 'User Creation', 'error', `User creation exception: ${userCreateError.message}`);
        throw userCreateError;
      }
    } else if (panel.type === 'marzneshin') {
      // Marzneshin panel authentication and user creation
      addLog(detailedLogs, 'Authentication', 'info', 'Testing Marzneshin authentication');

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const authResponse = await fetch(`${panel.panel_url}/api/admins/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Supabase-Edge-Function/1.0'
          },
          body: JSON.stringify({
            username: panel.username,
            password: panel.password,
          }),
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

      // Fetch template user configuration from 'reza' for Marzneshin
      let templateConfig = null;
      
      addLog(detailedLogs, 'Template Fetch', 'info', 'Fetching Marzneshin template user configuration from "reza"');
      
      try {
        const templateResponse = await fetch(`${panel.panel_url}/api/user/reza`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
        });

        addLog(detailedLogs, 'Template Fetch', 'info', 'Marzneshin template user fetch response', {
          status: templateResponse.status,
          statusText: templateResponse.statusText,
          ok: templateResponse.ok
        });

        if (templateResponse.ok) {
          templateConfig = await templateResponse.json();
          addLog(detailedLogs, 'Template Fetch', 'success', 'Marzneshin template user configuration fetched successfully', {
            username: templateConfig.username,
            hasServiceIds: !!templateConfig.service_ids,
            serviceIdsCount: templateConfig.service_ids ? templateConfig.service_ids.length : 0,
            originalNote: templateConfig.note
          });
        } else {
          const errorText = await templateResponse.text();
          addLog(detailedLogs, 'Template Fetch', 'error', 'Failed to fetch Marzneshin template user, will use fallback config', {
            status: templateResponse.status,
            errorText: errorText
          });
        }
      } catch (templateError) {
        addLog(detailedLogs, 'Template Fetch', 'error', 'Marzneshin template fetch error, using fallback', {
          error: templateError.message
        });
      }

      // Create User for Marzneshin
      const isActualUserCreation = createUser && userData;
      const targetUsername = isActualUserCreation ? userData.username : `test_${Date.now()}`;
      const targetDataLimit = isActualUserCreation ? userData.dataLimitGB : 1;
      const targetDuration = isActualUserCreation ? userData.durationDays : 1;
      const targetNotes = isActualUserCreation ? 
        'Created via bnets.co - Subscription' : 
        'Test user - will be deleted';

      addLog(detailedLogs, 'User Creation', 'info', `${isActualUserCreation ? 'Creating actual Marzneshin user' : 'Creating Marzneshin test user'}: ${targetUsername}`);

      // Build Marzneshin user payload
      let userPayload;
      
      if (templateConfig && templateConfig.service_ids) {
        // Use template configuration for Marzneshin
        addLog(detailedLogs, 'User Creation', 'info', 'Using Marzneshin template configuration from "reza"');
        
        userPayload = {
          username: targetUsername,
          data_limit: targetDataLimit * 1024 * 1024 * 1024, // Convert GB to bytes
          usage_duration: targetDuration * 24 * 60 * 60, // Convert days to seconds
          expire_strategy: "fixed_date",
          service_ids: templateConfig.service_ids, // Use exact service IDs from template
          note: targetNotes
        };
      } else {
        // Fallback configuration for Marzneshin
        addLog(detailedLogs, 'User Creation', 'info', 'Using Marzneshin fallback configuration (template not available)');
        
        userPayload = {
          username: targetUsername,
          data_limit: targetDataLimit * 1024 * 1024 * 1024, // Convert GB to bytes
          usage_duration: targetDuration * 24 * 60 * 60, // Convert days to seconds
          expire_strategy: "fixed_date",
          service_ids: [1], // Default service ID
          note: targetNotes
        };
      }

      addLog(detailedLogs, 'User Creation', 'info', 'Creating Marzneshin user with payload', {
        username: userPayload.username,
        dataLimit: userPayload.data_limit,
        usageDuration: userPayload.usage_duration,
        expireStrategy: userPayload.expire_strategy,
        serviceIds: userPayload.service_ids,
        note: userPayload.note
      });

      try {
        const createResponse = await fetch(`${panel.panel_url}/api/user`, {
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
          addLog(detailedLogs, 'Cleanup', 'info', `Deleting Marzneshin test user: ${targetUsername}`);

          try {
            const deleteResponse = await fetch(`${panel.panel_url}/api/user/${targetUsername}`, {
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
        } else if (userData.subscriptionId) {
          // Update subscription record for actual user creation
          addLog(detailedLogs, 'Subscription Update', 'info', 'Updating subscription record for Marzneshin user');
          
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
              addLog(detailedLogs, 'Subscription Update', 'error', 'Failed to update subscription record for Marzneshin', updateError);
            } else {
              addLog(detailedLogs, 'Subscription Update', 'success', 'Subscription record updated successfully for Marzneshin');
            }
          } catch (updateError) {
            addLog(detailedLogs, 'Subscription Update', 'error', 'Exception during Marzneshin subscription update', updateError);
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
      status: 200, // Return 200 instead of 500 to avoid "non-2xx status code" error
    });
  }
});
