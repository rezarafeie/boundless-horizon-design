
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client for logging
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let requestData = {};
  let panelConfig = null;
  let subscriptionId = null;

  try {
    const { username, dataLimitGB, durationDays, notes, panelId, enabledProtocols, subscriptionId: subId, customApiBody, manualMode } = await req.json();
    
    requestData = { username, dataLimitGB, durationDays, notes, panelId, enabledProtocols, manualMode, hasCustomBody: !!customApiBody };
    subscriptionId = subId;
    
    console.log('🔵 [MARZBAN-CREATE-USER] Starting user creation with STRICT panel selection:', {
      username,
      dataLimitGB,
      durationDays,
      panelId: panelId || 'NOT PROVIDED',
      enabledProtocols,
      subscriptionId
    });

    // ✅ CRITICAL FIX: Use the EXACT panel specified by panelId, no fallbacks
    if (panelId) {
      console.log('🔵 [MARZBAN-CREATE-USER] Using STRICT panel selection with panelId:', panelId);
      
      const { data: panel, error: panelError } = await supabase
        .from('panel_servers')
        .select('*')
        .eq('id', panelId)
        .eq('type', 'marzban')
        .eq('is_active', true)
        .single();

      if (panelError || !panel) {
        console.error('❌ [MARZBAN-CREATE-USER] STRICT panel selection failed:', panelError);
        
        // Log the failure
        await supabase.from('user_creation_logs').insert({
          subscription_id: subscriptionId,
          panel_id: panelId,
          edge_function_name: 'marzban-create-user',
          request_data: requestData,
          success: false,
          error_message: `Specified panel not found or inactive: ${panelId}`,
          panel_url: null,
          panel_name: null
        });
        
        throw new Error(`Specified panel not found or inactive: ${panelId}`);
      }

      panelConfig = panel;
      console.log('🟢 [MARZBAN-CREATE-USER] Using STRICTLY SPECIFIED panel:', {
        panelId: panel.id,
        panelName: panel.name,
        panelUrl: panel.panel_url,
        panelType: panel.type,
        isActive: panel.is_active,
        healthStatus: panel.health_status
      });
    } else {
      // ❌ FALLBACK: Only use if no specific panel is provided (should not happen in strict mode)
      console.log('⚠️ [MARZBAN-CREATE-USER] No panelId provided, using fallback panel selection');
      
      const { data: panels, error: panelsError } = await supabase
        .from('panel_servers')
        .select('*')
        .eq('type', 'marzban')
        .eq('is_active', true)
        .eq('health_status', 'online')
        .order('created_at', { ascending: true });

      if (panelsError || !panels || panels.length === 0) {
        console.error('❌ [MARZBAN-CREATE-USER] No active Marzban panels found:', panelsError);
        
        // Log the failure
        await supabase.from('user_creation_logs').insert({
          subscription_id: subscriptionId,
          panel_id: null,
          edge_function_name: 'marzban-create-user',
          request_data: requestData,
          success: false,
          error_message: 'No active Marzban panels available',
          panel_url: null,
          panel_name: null
        });
        
        throw new Error('No active Marzban panels available');
      }

      panelConfig = panels[0];
      console.log('⚠️ [MARZBAN-CREATE-USER] Using FALLBACK panel (not recommended):', {
        panelId: panelConfig.id,
        panelName: panelConfig.name,
        panelUrl: panelConfig.panel_url
      });
    }

    // ✅ VALIDATION: Check credentials before making requests
    if (!panelConfig.username || !panelConfig.password) {
      console.error('❌ [MARZBAN-CREATE-USER] Panel credentials missing:', {
        hasUsername: !!panelConfig.username,
        hasPassword: !!panelConfig.password,
        panelId: panelConfig.id
      });
      
      await supabase.from('user_creation_logs').insert({
        subscription_id: subscriptionId,
        panel_id: panelConfig.id,
        edge_function_name: 'marzban-create-user',
        request_data: requestData,
        success: false,
        error_message: 'Panel credentials are missing or empty',
        panel_url: panelConfig.panel_url,
        panel_name: panelConfig.name
      });
      
      throw new Error('Panel credentials are missing or empty');
    }

    // ✅ CRITICAL LOG: Show exactly which panel API will be used
    console.log('🔵 [MARZBAN-CREATE-USER] Creating user on panel:', {
      panelName: panelConfig.name,
      panelUrl: panelConfig.panel_url,
      panelId: panelConfig.id,
      username: panelConfig.username,
      usernameLength: panelConfig.username?.length || 0,
      passwordLength: panelConfig.password?.length || 0,
      expectedDomain: panelConfig.panel_url.includes('cp.rain.rest') ? 'Plus Panel' : 'Lite Panel'
    });

    // ✅ MARZBAN AUTHENTICATION: Use URL-encoded format without grant_type
    console.log('🔵 [MARZBAN-CREATE-USER] Attempting Marzban authentication without grant_type...');
    
    let accessToken = null;
    
    try {
      const params = new URLSearchParams();
      params.append('username', panelConfig.username);
      params.append('password', panelConfig.password);

      console.log('🔵 [MARZBAN-CREATE-USER] Auth request params:', {
        username: panelConfig.username,
        passwordLength: panelConfig.password.length,
        url: `${panelConfig.panel_url}/api/admin/token`
      });

      const authResponse = await fetch(`${panelConfig.panel_url}/api/admin/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: params.toString()
      });

      console.log('🔵 [MARZBAN-CREATE-USER] Auth response:', {
        status: authResponse.status,
        statusText: authResponse.statusText,
        ok: authResponse.ok,
        contentType: authResponse.headers.get('content-type')
      });

      if (authResponse.ok) {
        const authData = await authResponse.json();
        if (authData.access_token) {
          accessToken = authData.access_token;
          console.log('🟢 [MARZBAN-CREATE-USER] Authentication successful');
        } else {
          console.error('❌ [MARZBAN-CREATE-USER] No access token received:', authData);
          throw new Error('No access token received from authentication');
        }
      } else {
        const errorText = await authResponse.text();
        console.error('❌ [MARZBAN-CREATE-USER] Authentication failed:', {
          status: authResponse.status,
          statusText: authResponse.statusText,
          error: errorText
        });
        
        await supabase.from('user_creation_logs').insert({
          subscription_id: subscriptionId,
          panel_id: panelConfig.id,
          edge_function_name: 'marzban-create-user',
          request_data: requestData,
          success: false,
          error_message: `Authentication failed: ${authResponse.status} ${authResponse.statusText} - ${errorText}`,
          panel_url: panelConfig.panel_url,
          panel_name: panelConfig.name
        });
        
        throw new Error(`Authentication failed: ${authResponse.status} ${authResponse.statusText} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ [MARZBAN-CREATE-USER] Authentication error:', error);
      
      await supabase.from('user_creation_logs').insert({
        subscription_id: subscriptionId,
        panel_id: panelConfig.id,
        edge_function_name: 'marzban-create-user',
        request_data: requestData,
        success: false,
        error_message: `Authentication error: ${error.message}`,
        panel_url: panelConfig.panel_url,
        panel_name: panelConfig.name
      });
      
      throw error;
    }

    // Step 2: Get template user configuration (usually 'reza') to detect beta version and get group_ids
    console.log('🔵 [MARZBAN-CREATE-USER] Fetching template user configuration...');
    
    let templateUser = null;
    let isBetaVersion = false;
    let groupIds: number[] = [];
    
    try {
      const templateUserResponse = await fetch(`${panelConfig.panel_url}/api/user/reza`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('🔵 [MARZBAN-CREATE-USER] Template user response:', {
        status: templateUserResponse.status,
        statusText: templateUserResponse.statusText,
        ok: templateUserResponse.ok
      });

      if (templateUserResponse.ok) {
        templateUser = await templateUserResponse.json();
        
        // Check if this is beta version by looking for group_ids
        if (templateUser.group_ids && Array.isArray(templateUser.group_ids)) {
          isBetaVersion = true;
          groupIds = templateUser.group_ids;
          console.log('🟢 [MARZBAN-CREATE-USER] Beta version detected! Using group_ids:', groupIds);
        } else {
          console.log('🔵 [MARZBAN-CREATE-USER] Legacy version detected, using old structure');
        }
        
        console.log('🟢 [MARZBAN-CREATE-USER] Template user fetched successfully:', {
          username: templateUser.username,
          isBetaVersion,
          groupIds: groupIds.length > 0 ? groupIds : 'none',
          hasProxies: !!templateUser.proxies,
          proxiesCount: Object.keys(templateUser.proxies || {}).length,
          hasInbounds: !!templateUser.inbounds,
          inboundsCount: Object.keys(templateUser.inbounds || {}).length,
          hasProxySettings: !!templateUser.proxy_settings
        });

        // Validate template user has required data
        if (isBetaVersion && groupIds.length === 0) {
          console.error('⚠️ [MARZBAN-CREATE-USER] Beta version but no group_ids found, will use fallback');
          templateUser = null;
        } else if (!isBetaVersion && !templateUser.proxies && !templateUser.inbounds) {
          console.error('⚠️ [MARZBAN-CREATE-USER] Legacy version but no proxy or inbound data, will use fallback');
          templateUser = null;
        }
      } else {
        const errorText = await templateUserResponse.text();
        console.error('⚠️ [MARZBAN-CREATE-USER] Template user fetch failed, will use fallback:', {
          status: templateUserResponse.status,
          errorText: errorText
        });
      }
    } catch (error) {
      console.error('⚠️ [MARZBAN-CREATE-USER] Template user fetch exception, will use fallback:', error.message);
    }

    // Step 3: Create the new user with proper configuration based on version
    const dataLimitBytes = dataLimitGB * 1073741824; // Convert GB to bytes
    const expireTimestamp = Math.floor(Date.now() / 1000) + (durationDays * 24 * 60 * 60);

    let newUserData;

    // ✅ MANUAL MODE: Use custom API body if provided
    if (manualMode && customApiBody) {
      console.log('🔧 [MARZBAN-CREATE-USER] Using MANUAL MODE with custom API body');
      newUserData = customApiBody;
      
      console.log('🟢 [MARZBAN-CREATE-USER] Manual mode body:', {
        customBodyKeys: Object.keys(customApiBody),
        username: customApiBody.username,
        hasProxySettings: !!customApiBody.proxy_settings,
        hasGroupIds: !!customApiBody.group_ids,
        fullBody: JSON.stringify(customApiBody, null, 2)
      });
      
    } else {

    if (isBetaVersion && groupIds.length > 0) {
      // ✅ BETA VERSION: Use cached template data from panel refresh if available
      let proxySettings = {};
      let finalGroupIds = groupIds;
      
      // Try to get cached template data from panel config
      if (panelConfig.panel_config_data?.inbounds?.template_data) {
        const templateData = panelConfig.panel_config_data.inbounds.template_data;
        console.log('🟢 [MARZBAN-CREATE-USER] Using cached template data from panel refresh:', templateData);
        
        // Use saved proxy settings if available
        if (templateData.proxy_settings && Object.keys(templateData.proxy_settings).length > 0) {
          proxySettings = templateData.proxy_settings;
        }
        
        // Use saved group_ids if available
        if (templateData.group_ids && templateData.group_ids.length > 0) {
          finalGroupIds = templateData.group_ids;
        }
      } else if (templateUser?.proxy_settings) {
        // Fallback to template user data if no cached data
        proxySettings = templateUser.proxy_settings;
        console.log('🟡 [MARZBAN-CREATE-USER] Using template user proxy_settings as fallback');
      }
      
      newUserData = {
        username: username,
        status: "active",
        expire: expireTimestamp,
        data_limit: dataLimitBytes,
        data_limit_reset_strategy: "no_reset",
        note: notes || `Created via bnets.co - Subscription`,
        group_ids: finalGroupIds,
        proxy_settings: proxySettings, // Use cached/template settings or empty for auto-generation
        on_hold_expire_duration: 0,
        on_hold_timeout: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(),
        auto_delete_in_days: 0
      };

      console.log('🟢 [MARZBAN-CREATE-USER] Using BETA VERSION structure with cached template data:', {
        groupIds: finalGroupIds,
        proxySettingsKeys: Object.keys(proxySettings),
        hasCachedData: !!panelConfig.panel_config_data?.inbounds?.template_data,
        usingTemplate: Object.keys(proxySettings).length > 0 ? 'yes' : 'will auto-generate all protocols'
      });
      
    } else if (templateUser && (templateUser.proxies || templateUser.inbounds)) {
      // ✅ LEGACY VERSION: Use template user configuration
      newUserData = {
        username: username,
        proxies: templateUser.proxies || {},
        inbounds: templateUser.inbounds || {},
        expire: expireTimestamp,
        data_limit: dataLimitBytes,
        data_limit_reset_strategy: templateUser.data_limit_reset_strategy || "no_reset",
        excluded_inbounds: templateUser.excluded_inbounds || {},
        note: notes || `Created via bnets.co - Subscription`,
        status: "active"
      };

      console.log('🟢 [MARZBAN-CREATE-USER] Using LEGACY VERSION template user configuration:', {
        proxiesCount: Object.keys(templateUser.proxies || {}).length,
        inboundsCount: Object.keys(templateUser.inbounds || {}).length
      });
      
    } else if (panelConfig.panel_config_data?.inbounds) {
      // ✅ PRIORITY: Use stored panel inbound configuration
      const configData = panelConfig.panel_config_data;
      const proxies: Record<string, {}> = {};
      
      console.log('🔵 [MARZBAN-CREATE-USER] Panel config structure:', {
        hasInbounds: !!configData.inbounds,
        configType: configData.type,
        inboundKeys: Object.keys(configData.inbounds || {})
      });
      
      // Handle new structure: { vless: [...], vmess: [...] }
      if (configData.inbounds.vless || configData.inbounds.vmess) {
        // Build proxies from protocol-based inbound structure
        if (configData.inbounds.vless && Array.isArray(configData.inbounds.vless)) {
          configData.inbounds.vless.forEach((inbound: any) => {
            if (inbound.tag) {
              proxies[inbound.tag] = {
                type: 'vless'
              };
            }
          });
        }
        
        if (configData.inbounds.vmess && Array.isArray(configData.inbounds.vmess)) {
          configData.inbounds.vmess.forEach((inbound: any) => {
            if (inbound.tag) {
              proxies[inbound.tag] = {
                type: 'vmess'
              };
            }
          });
        }

        newUserData = {
          username: username,
          proxies: proxies,
          expire: expireTimestamp,
          data_limit: dataLimitBytes,
          data_limit_reset_strategy: "no_reset",
          note: notes || `Created via bnets.co - Subscription`,
          status: "active"
        };

        console.log('🟢 [MARZBAN-CREATE-USER] Using stored panel inbound configuration:', {
          totalProxies: Object.keys(proxies).length,
          vlessCount: configData.inbounds.vless?.length || 0,
          vmessCount: configData.inbounds.vmess?.length || 0,
          proxyTags: Object.keys(proxies).slice(0, 5).join(', ') + '...'
        });
        
      } else if (Array.isArray(configData.inbounds)) {
        // Handle legacy array structure: [{ tag: '...', protocol: '...' }]
        configData.inbounds.forEach((inbound: any) => {
          if (inbound.tag) {
            proxies[inbound.tag] = {};
          }
        });

        newUserData = {
          username: username,
          proxies: proxies,
          expire: expireTimestamp,
          data_limit: dataLimitBytes,
          data_limit_reset_strategy: "no_reset",
          note: notes || `Created via bnets.co - Subscription`,
          status: "active"
        };

        console.log('🟢 [MARZBAN-CREATE-USER] Using stored panel inbounds (legacy array):', {
          proxiesCount: Object.keys(proxies).length
        });
      } else {
        // Fallback if structure is unexpected
        throw new Error('Unexpected panel inbound configuration structure');
      }
      
    } else if (enabledProtocols && Array.isArray(enabledProtocols) && enabledProtocols.length > 0) {
      // Use dynamic proxies from enabled protocols (last resort)
      const proxies: Record<string, {}> = {};
      enabledProtocols.forEach(protocol => {
        proxies[protocol] = {};
      });

      newUserData = {
        username: username,
        proxies: proxies,
        expire: expireTimestamp,
        data_limit: dataLimitBytes,
        data_limit_reset_strategy: "no_reset",
        note: notes || `Created via bnets.co - Subscription`,
        status: "active"
      };

      console.log('⚠️ [MARZBAN-CREATE-USER] Using basic protocol fallback (no panel config available):', {
        enabledProtocols: enabledProtocols,
        proxiesCount: Object.keys(proxies).length
      });
      
    } else {
      // Last resort fallback - use minimal proxy configuration
      newUserData = {
        username: username,
        proxies: { "vless": {} }, // Minimal proxy config to satisfy Marzban requirements
        expire: expireTimestamp,
        data_limit: dataLimitBytes,
        data_limit_reset_strategy: "no_reset",
        note: notes || `Created via bnets.co - Subscription`,
        status: "active"
      };

      console.log('⚠️ [MARZBAN-CREATE-USER] Using minimal fallback proxy configuration');
      
      // Log this as a warning for future debugging
      await supabase.from('user_creation_logs').insert({
        subscription_id: subscriptionId,
        panel_id: panelConfig.id,
        edge_function_name: 'marzban-create-user',
        request_data: requestData,
        success: false,
        error_message: 'WARNING: Used minimal fallback proxy config - template user not available',
        panel_url: panelConfig.panel_url,
        panel_name: panelConfig.name
      });
    }
    } // End of manual mode else block

    console.log('🔵 [MARZBAN-CREATE-USER] Creating user with data:', {
      username: newUserData.username,
      expire: new Date(expireTimestamp * 1000).toISOString(),
      dataLimitGB: dataLimitGB,
      dataLimitBytes: dataLimitBytes,
      panelUrl: panelConfig.panel_url,
      isBetaVersion: isBetaVersion,
      hasGroupIds: !!newUserData.group_ids && newUserData.group_ids.length > 0,
      groupIds: newUserData.group_ids || [],
      hasProxies: !!newUserData.proxies && Object.keys(newUserData.proxies).length > 0,
      hasInbounds: !!newUserData.inbounds && Object.keys(newUserData.inbounds).length > 0,
      proxiesCount: Object.keys(newUserData.proxies || {}).length,
      inboundsCount: Object.keys(newUserData.inbounds || {}).length,
      fullRequestBody: JSON.stringify(newUserData, null, 2)
    });

    const createUserResponse = await fetch(`${panelConfig.panel_url}/api/user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(newUserData)
    });

    console.log('🔵 [MARZBAN-CREATE-USER] User creation response:', {
      status: createUserResponse.status,
      statusText: createUserResponse.statusText,
      ok: createUserResponse.ok,
      headers: Object.fromEntries(createUserResponse.headers.entries())
    });

    if (!createUserResponse.ok) {
      const errorText = await createUserResponse.text();
      console.error('❌ [MARZBAN-CREATE-USER] User creation failed:', {
        status: createUserResponse.status,
        statusText: createUserResponse.statusText,
        error: errorText,
        panelUrl: panelConfig.panel_url,
        requestBodySample: JSON.stringify(newUserData, null, 2).substring(0, 500) + '...'
      });
      
      // Log the failure with detailed debug info
      await supabase.from('user_creation_logs').insert({
        subscription_id: subscriptionId,
        panel_id: panelConfig.id,
        edge_function_name: 'marzban-create-user',
        request_data: { ...requestData, requestBody: newUserData },
        success: false,
        error_message: `User creation failed: ${createUserResponse.status} - ${errorText}`,
        panel_url: panelConfig.panel_url,
        panel_name: panelConfig.name,
        response_data: {
          status: createUserResponse.status,
          headers: Object.fromEntries(createUserResponse.headers.entries()),
          error: errorText
        }
      });
      
      return new Response(JSON.stringify({
        success: false,
        error: `User creation failed: ${createUserResponse.status} - ${errorText}`,
        debug: {
          panelUrl: panelConfig.panel_url,
          panelName: panelConfig.name,
          status: createUserResponse.status,
          headers: Object.fromEntries(createUserResponse.headers.entries()),
          requestBodyKeys: Object.keys(newUserData)
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: createUserResponse.status,
      });
    }

    const createdUser = await createUserResponse.json();
    
    // ✅ CRITICAL FIX: Convert relative subscription URL to full URL
    let subscriptionUrl = createdUser.subscription_url;
    if (subscriptionUrl && subscriptionUrl.startsWith('/')) {
      // Remove trailing slashes from panel URL and combine with relative path
      const baseUrl = panelConfig.panel_url.replace(/\/+$/, '');
      subscriptionUrl = `${baseUrl}${subscriptionUrl}`;
      console.log('🔧 [MARZBAN-CREATE-USER] Converted relative URL to full URL:', {
        original: createdUser.subscription_url,
        converted: subscriptionUrl
      });
    }
    
    // ✅ CRITICAL VERIFICATION: Log the subscription URL domain
    const subscriptionDomain = subscriptionUrl?.split('/')[2] || 'unknown';
    
    console.log('🟢 [MARZBAN-CREATE-USER] User created successfully:', {
      username: createdUser.username,
      subscriptionUrl: subscriptionUrl,
      subscriptionDomain,
      panelUsed: panelConfig.name,
      panelUrl: panelConfig.panel_url,
      authMethod: 'URL-encoded without grant_type',
      expire: createdUser.expire
    });

    const responseData = {
      username: createdUser.username,
      subscription_url: subscriptionUrl,
      expire: createdUser.expire,
      data_limit: createdUser.data_limit,
      status: createdUser.status,
      panel_type: 'marzban',
      panel_name: panelConfig.name,
      panel_id: panelConfig.id,
      panel_url: panelConfig.panel_url,
      auth_method: 'URL-encoded without grant_type'
    };

    // Log the success
    await supabase.from('user_creation_logs').insert({
      subscription_id: subscriptionId,
      panel_id: panelConfig.id,
      edge_function_name: 'marzban-create-user',
      request_data: requestData,
      response_data: responseData,
      success: true,
      error_message: null,
      panel_url: panelConfig.panel_url,
      panel_name: panelConfig.name
    });

    return new Response(JSON.stringify({
      success: true,
      data: responseData
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('❌ [MARZBAN-CREATE-USER] Error:', error);
    
    // Log the error if we haven't already
    if (panelConfig) {
      await supabase.from('user_creation_logs').insert({
        subscription_id: subscriptionId,
        panel_id: panelConfig?.id || null,
        edge_function_name: 'marzban-create-user',
        request_data: requestData,
        success: false,
        error_message: error.message,
        panel_url: panelConfig?.panel_url || null,
        panel_name: panelConfig?.name || null
      });
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
