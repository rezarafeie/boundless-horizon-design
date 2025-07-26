
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  username: string;
  dataLimitGB: number;
  durationDays: number;
  notes?: string;
  panelType: 'marzban' | 'marzneshin';
  subscriptionId?: string;
  isFreeTriaL?: boolean;
  assignedPanelId?: string;
}

function logStep(step: string, message: string, details?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [CREATE-USER-DIRECT] ${step}: ${message}`, details ? JSON.stringify(details, null, 2) : '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('INIT', 'Starting direct user creation');

    const requestBody = await req.json();
    const { username, dataLimitGB, durationDays, notes, panelType, subscriptionId, isFreeTriaL, assignedPanelId } = requestBody as CreateUserRequest;

    logStep('REQUEST', 'Request received', { username, dataLimitGB, durationDays, panelType, subscriptionId, isFreeTriaL, assignedPanelId });

    // Input validation
    if (!username || !dataLimitGB || !durationDays || !panelType) {
      logStep('ERROR', 'Missing required parameters', { username: !!username, dataLimitGB: !!dataLimitGB, durationDays: !!durationDays, panelType: !!panelType });
      throw new Error('Missing required parameters: username, dataLimitGB, durationDays, and panelType are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      logStep('ERROR', 'Environment variables missing', { hasUrl: !!supabaseUrl, hasKey: !!supabaseServiceKey });
      throw new Error('Supabase environment variables not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get panel information with better error handling
    let panel;
    
    if (assignedPanelId) {
      // Use the specific assigned panel
      logStep('DB_QUERY', `Fetching specific panel by ID: ${assignedPanelId}`);
      
      const { data: assignedPanel, error: panelError } = await supabase
        .from('panel_servers')
        .select('*')
        .eq('id', assignedPanelId)
        .eq('is_active', true)
        .maybeSingle();

      if (panelError) {
        logStep('ERROR', 'Database query failed for assigned panel', panelError);
        throw new Error(`Database query failed: ${panelError.message}`);
      }

      if (!assignedPanel) {
        logStep('ERROR', `Assigned panel not found or inactive: ${assignedPanelId}`);
        throw new Error(`Assigned panel ${assignedPanelId} not found or inactive. Please check panel configuration.`);
      }

      // Verify panel type matches
      if (assignedPanel.type !== panelType) {
        logStep('ERROR', `Panel type mismatch`, { 
          expectedType: panelType, 
          actualType: assignedPanel.type, 
          panelId: assignedPanelId 
        });
        throw new Error(`Panel type mismatch: expected ${panelType}, got ${assignedPanel.type}`);
      }

      panel = assignedPanel;
      logStep('PANEL_ASSIGNED', `Using assigned panel: ${panel.name}`, { panelId: assignedPanelId });
    } else {
      // Fall back to finding any panel of the requested type
      logStep('DB_QUERY', `Fetching ${panelType} panel data (fallback)`);
      
      const { data: panels, error: panelError } = await supabase
        .from('panel_servers')
        .select('*')
        .eq('type', panelType)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (panelError) {
        logStep('ERROR', 'Database query failed', panelError);
        throw new Error(`Database query failed: ${panelError.message}`);
      }

      if (!panels || panels.length === 0) {
        logStep('ERROR', `No ${panelType} panels found`, { panelType, totalPanels: 0 });
        throw new Error(`No active ${panelType} panels available. Please configure panels in admin dashboard.`);
      }

      // Filter for healthy panels first, then fall back to any active panel
      let availablePanels = panels.filter(panel => panel.health_status === 'online');
      if (availablePanels.length === 0) {
        logStep('WARNING', 'No healthy panels found, using any active panel');
        availablePanels = panels;
      }

      panel = availablePanels[0];
      logStep('PANEL_FALLBACK', `Using fallback panel: ${panel.name}`);
    }
    logStep('PANEL', 'Panel selected', {
      id: panel.id,
      name: panel.name,
      url: panel.panel_url,
      type: panel.type,
      health_status: panel.health_status,
      enabledProtocols: panel.enabled_protocols
    });

    logStep('PANEL_TYPE_CONFIRMATION', `Confirmed panel type: ${panelType} for panel: ${panel.name}`);

    // Validate panel configuration
    if (!panel.panel_url || !panel.username || !panel.password) {
      logStep('ERROR', 'Panel configuration incomplete', {
        hasUrl: !!panel.panel_url,
        hasUsername: !!panel.username,
        hasPassword: !!panel.password
      });
      throw new Error('Panel configuration is incomplete. Please check admin dashboard.');
    }

    const baseUrl = panel.panel_url.replace(/\/+$/, '');
    const enabledProtocols = Array.isArray(panel.enabled_protocols) ? panel.enabled_protocols : ['vless', 'vmess', 'trojan', 'shadowsocks'];

    // Test panel connectivity first
    logStep('CONNECTIVITY', 'Testing panel connectivity');
    try {
      const connectivityResponse = await fetch(`${baseUrl}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      logStep('CONNECTIVITY', 'Panel connectivity test', {
        status: connectivityResponse.status,
        ok: connectivityResponse.ok
      });
    } catch (connectError) {
      logStep('ERROR', 'Panel connectivity failed', {
        error: connectError.message,
        panelUrl: baseUrl
      });
      throw new Error(`Cannot connect to panel at ${baseUrl}. Please check panel configuration.`);
    }

    // Authenticate with panel
    let token: string;
    
    try {
      if (panelType === 'marzban') {
        logStep('AUTH', 'Authenticating with Marzban panel');
        
        const authResponse = await fetch(`${baseUrl}/api/admin/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            username: panel.username,
            password: panel.password,
          }),
          signal: AbortSignal.timeout(15000) // 15 second timeout
        });

        logStep('AUTH', 'Marzban auth response', {
          status: authResponse.status,
          statusText: authResponse.statusText,
          ok: authResponse.ok
        });

        if (!authResponse.ok) {
          const errorText = await authResponse.text().catch(() => 'Could not read error response');
          logStep('ERROR', 'Marzban authentication failed', { 
            status: authResponse.status, 
            error: errorText,
            url: `${baseUrl}/api/admin/token`
          });
          throw new Error(`Authentication failed with Marzban panel (${authResponse.status}): ${errorText}`);
        }

        const authData = await authResponse.json();
        token = authData.access_token;
        
        if (!token) {
          logStep('ERROR', 'No access token received from Marzban');
          throw new Error('Authentication successful but no access token received');
        }
      } else {
        logStep('AUTH', 'Authenticating with Marzneshin panel');
        
        const authResponse = await fetch(`${baseUrl}/api/admins/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            username: panel.username,
            password: panel.password,
            grant_type: 'password'
          }),
          signal: AbortSignal.timeout(15000) // 15 second timeout
        });

        logStep('AUTH', 'Marzneshin auth response', {
          status: authResponse.status,
          statusText: authResponse.statusText,
          ok: authResponse.ok
        });

        if (!authResponse.ok) {
          const errorText = await authResponse.text().catch(() => 'Could not read error response');
          logStep('ERROR', 'Marzneshin authentication failed', { 
            status: authResponse.status, 
            error: errorText,
            url: `${baseUrl}/api/admins/token`
          });
          throw new Error(`Authentication failed with Marzneshin panel (${authResponse.status}): ${errorText}`);
        }

        const authData = await authResponse.json();
        token = authData.access_token;
        
        if (!token) {
          logStep('ERROR', 'No access token received from Marzneshin');
          throw new Error('Authentication successful but no access token received');
        }
      }

      logStep('AUTH', 'Authentication successful', { tokenLength: token.length });
    } catch (authError) {
      logStep('ERROR', 'Authentication process failed', {
        error: authError.message,
        panelType,
        baseUrl
      });
      
      // Update panel health status to offline
      try {
        await supabase
          .from('panel_servers')
          .update({ 
            health_status: 'offline',
            last_health_check: new Date().toISOString()
          })
          .eq('id', panel.id);
      } catch (updateError) {
        logStep('WARNING', 'Failed to update panel health status', updateError);
      }
      
      throw new Error(`Panel authentication failed: ${authError.message}`);
    }

    // Create user based on panel type
    let userData: any;
    
    try {
      if (panelType === 'marzban') {
        // Marzban user creation - First get inbounds to configure groups properly
        logStep('INBOUNDS', 'Fetching Marzban inbounds for user creation');
        
        let inbounds: any[] = [];
        try {
          const inboundsResponse = await fetch(`${baseUrl}/api/inbounds`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(10000)
          });

          if (inboundsResponse.ok) {
            inbounds = await inboundsResponse.json();
            logStep('INBOUNDS', 'Successfully fetched inbounds', { 
              count: inbounds.length,
              inboundTags: inbounds.map(i => i.tag)
            });
          } else {
            logStep('WARNING', 'Failed to fetch inbounds, using empty proxies', {
              status: inboundsResponse.status
            });
          }
        } catch (inboundError) {
          logStep('WARNING', 'Error fetching inbounds, using empty proxies', {
            error: inboundError.message
          });
        }

        const expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + durationDays);
        
        // Build proxies object with proper inbound tags
        const proxies: any = {};
        enabledProtocols.forEach((protocol: string) => {
          // Find inbounds for this protocol
          const protocolInbounds = inbounds.filter(inbound => 
            inbound.protocol?.toLowerCase() === protocol.toLowerCase()
          );
          
          if (protocolInbounds.length > 0) {
            // Use the inbound tags as groups
            proxies[protocol] = {
              "inbounds": protocolInbounds.map(inbound => inbound.tag)
            };
          } else {
            // Fallback to empty object if no inbounds found
            proxies[protocol] = {};
          }
        });

        const userPayload = {
          username: username,
          data_limit: dataLimitGB * 1073741824, // Convert GB to bytes
          expire: Math.floor(expireDate.getTime() / 1000),
          proxies: proxies,
          note: notes || `Created via bnets.co - ${isFreeTriaL ? 'Free Trial' : 'Subscription'}`
        };

        logStep('CREATE', 'Creating Marzban user', userPayload);

        const createResponse = await fetch(`${baseUrl}/api/user`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userPayload),
          signal: AbortSignal.timeout(20000) // 20 second timeout
        });

        logStep('CREATE', 'Marzban user creation response', {
          status: createResponse.status,
          statusText: createResponse.statusText,
          ok: createResponse.ok
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text().catch(() => 'Could not read error response');
          logStep('ERROR', 'Marzban user creation failed', { 
            status: createResponse.status, 
            error: errorText,
            payload: userPayload
          });
          throw new Error(`Failed to create user on Marzban panel (${createResponse.status}): ${errorText}`);
        }

        userData = await createResponse.json();
      } else {
        // Marzneshin user creation - get services first
        logStep('SERVICES', 'Fetching Marzneshin services');
        
        const servicesResponse = await fetch(`${baseUrl}/api/services`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(15000) // 15 second timeout
        });

        logStep('SERVICES', 'Services response', {
          status: servicesResponse.status,
          ok: servicesResponse.ok
        });

        if (!servicesResponse.ok) {
          const errorText = await servicesResponse.text().catch(() => 'Could not read error response');
          logStep('ERROR', 'Failed to fetch services from Marzneshin panel', {
            status: servicesResponse.status,
            error: errorText
          });
          throw new Error(`Failed to fetch services from Marzneshin panel (${servicesResponse.status}): ${errorText}`);
        }

        const servicesData = await servicesResponse.json();
        const serviceIds = servicesData.items?.map((service: any) => service.id) || [];
        
        logStep('SERVICES', `Found ${serviceIds.length} services`, { serviceIds });

        if (serviceIds.length === 0) {
          logStep('WARNING', 'No services found on Marzneshin panel');
        }

        const expireDateStr = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const userPayload = {
          username: username,
          expire_strategy: 'fixed_date',
          expire_date: expireDateStr,
          data_limit: dataLimitGB * 1073741824, // Convert GB to bytes
          service_ids: serviceIds,
          note: notes || `Created via bnets.co - ${isFreeTriaL ? 'Free Trial' : 'Subscription'}`,
          data_limit_reset_strategy: 'no_reset'
        };

        logStep('CREATE', 'Creating Marzneshin user', userPayload);

        const createResponse = await fetch(`${baseUrl}/api/users`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userPayload),
          signal: AbortSignal.timeout(20000) // 20 second timeout
        });

        logStep('CREATE', 'Marzneshin user creation response', {
          status: createResponse.status,
          statusText: createResponse.statusText,
          ok: createResponse.ok
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text().catch(() => 'Could not read error response');
          logStep('ERROR', 'Marzneshin user creation failed', { 
            status: createResponse.status, 
            error: errorText,
            payload: userPayload
          });
          throw new Error(`Failed to create user on Marzneshin panel (${createResponse.status}): ${errorText}`);
        }

        userData = await createResponse.json();
      }

      logStep('SUCCESS', 'User created successfully', {
        username: userData.username,
        hasSubscriptionUrl: !!userData.subscription_url,
        dataLimit: userData.data_limit,
        expire: userData.expire
      });

      // Update panel health status to online on successful operation
      try {
        await supabase
          .from('panel_servers')
          .update({ 
            health_status: 'online',
            last_health_check: new Date().toISOString()
          })
          .eq('id', panel.id);
      } catch (updateError) {
        logStep('WARNING', 'Failed to update panel health status to online', updateError);
      }

    } catch (createError) {
      logStep('ERROR', 'User creation process failed', {
        error: createError.message,
        panelType,
        username
      });
      
      // Update panel health status based on error type
      try {
        const healthStatus = createError.message.includes('timeout') ? 'offline' : 'degraded';
        await supabase
          .from('panel_servers')
          .update({ 
            health_status: healthStatus,
            last_health_check: new Date().toISOString()
          })
          .eq('id', panel.id);
      } catch (updateError) {
        logStep('WARNING', 'Failed to update panel health status after error', updateError);
      }
      
      throw createError;
    }

    // Update subscription record if provided
    if (subscriptionId) {
      logStep('UPDATE', 'Updating subscription record');
      
      try {
        // Build subscription URL based on panel type and response data
        let subscriptionUrl;
        if (userData.subscription_url) {
          subscriptionUrl = userData.subscription_url;
        } else {
          if (panelType === 'marzban') {
            subscriptionUrl = `${baseUrl}/sub/${username}`;
          } else {
            // Marzneshin format
            subscriptionUrl = `${baseUrl}/sub/${username}`;
          }
        }
        const expireAt = userData.expire ? 
          new Date(userData.expire * 1000).toISOString() : 
          new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            subscription_url: subscriptionUrl,
            marzban_user_created: true,
            expire_at: expireAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscriptionId);

        if (updateError) {
          logStep('ERROR', 'Failed to update subscription record', updateError);
          // Don't throw here as the VPN user was created successfully
        } else {
          logStep('UPDATE', 'Subscription record updated successfully');
        }
      } catch (updateError) {
        logStep('ERROR', 'Exception during subscription update', updateError);
        // Don't throw here as the VPN user was created successfully
      }
    }

    // Return success response with correct subscription URL format
    let subscriptionUrl;
    if (userData.subscription_url) {
      subscriptionUrl = userData.subscription_url;
    } else {
      // Generate subscription URL based on panel type
      if (panelType === 'marzban') {
        subscriptionUrl = `${baseUrl}/sub/${username}`;
      } else {
        // Marzneshin format
        subscriptionUrl = `${baseUrl}/sub/${username}`;
      }
    }

    const result = {
      success: true,
      data: {
        username: userData.username,
        subscription_url: subscriptionUrl,
        expire: userData.expire || Math.floor(Date.now() / 1000) + (durationDays * 24 * 60 * 60),
        data_limit: userData.data_limit || (dataLimitGB * 1073741824),
        panel_type: panelType,
        panel_name: panel.name,
        panel_id: panel.id
      }
    };

    logStep('COMPLETE', 'User creation completed successfully', {
      username: result.data.username,
      panelName: result.data.panel_name,
      subscriptionUrl: !!result.data.subscription_url
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logStep('ERROR', 'User creation failed', { 
      message: errorMessage, 
      stack: error instanceof Error ? error.stack : undefined 
    });
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
