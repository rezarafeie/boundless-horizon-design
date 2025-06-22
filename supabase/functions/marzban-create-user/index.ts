
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
    const { username, dataLimitGB, durationDays, notes, panelId, enabledProtocols, subscriptionId: subId } = await req.json();
    
    requestData = { username, dataLimitGB, durationDays, notes, panelId, enabledProtocols };
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

    // ✅ CRITICAL LOG: Show exactly which panel API will be used
    console.log('🔵 [MARZBAN-CREATE-USER] Creating user on panel:', {
      panelName: panelConfig.name,
      panelUrl: panelConfig.panel_url,
      panelId: panelConfig.id,
      username: panelConfig.username,
      expectedDomain: panelConfig.panel_url.includes('cp.rain.rest') ? 'Plus Panel' : 'Lite Panel'
    });

    // Step 1: Authenticate with the SPECIFIC panel
    console.log('🔵 [MARZBAN-CREATE-USER] Attempting authentication with credentials:', {
      panelUrl: panelConfig.panel_url,
      username: panelConfig.username,
      hasPassword: !!panelConfig.password
    });

    const authResponse = await fetch(`${panelConfig.panel_url}/api/admin/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        username: panelConfig.username,
        password: panelConfig.password
      })
    });

    console.log('🔵 [MARZBAN-CREATE-USER] Auth response status:', {
      status: authResponse.status,
      statusText: authResponse.statusText,
      ok: authResponse.ok,
      headers: Object.fromEntries(authResponse.headers.entries())
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('❌ [MARZBAN-CREATE-USER] Authentication failed:', {
        status: authResponse.status,
        statusText: authResponse.statusText,
        panelUrl: panelConfig.panel_url,
        errorText: errorText
      });
      
      // Log the failure
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

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    if (!accessToken) {
      console.error('❌ [MARZBAN-CREATE-USER] No access token received:', authData);
      throw new Error('No access token received from authentication');
    }

    console.log('🟢 [MARZBAN-CREATE-USER] Authentication successful on panel:', {
      panelUrl: panelConfig.panel_url,
      hasToken: !!accessToken,
      tokenType: authData.token_type
    });

    // Step 2: Get template user configuration (usually 'reza')
    console.log('🔵 [MARZBAN-CREATE-USER] Fetching template user configuration...');
    
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

    if (!templateUserResponse.ok) {
      const errorText = await templateUserResponse.text();
      console.error('❌ [MARZBAN-CREATE-USER] Template user fetch failed:', {
        status: templateUserResponse.status,
        errorText: errorText
      });
      
      // Log the failure
      await supabase.from('user_creation_logs').insert({
        subscription_id: subscriptionId,
        panel_id: panelConfig.id,
        edge_function_name: 'marzban-create-user',
        request_data: requestData,
        success: false,
        error_message: `Template user fetch failed: ${templateUserResponse.status} - ${errorText}`,
        panel_url: panelConfig.panel_url,
        panel_name: panelConfig.name
      });
      
      throw new Error(`Template user fetch failed: ${templateUserResponse.status} - ${errorText}`);
    }

    const templateUser = await templateUserResponse.json();
    console.log('🟢 [MARZBAN-CREATE-USER] Template user fetched successfully:', {
      username: templateUser.username,
      hasProxies: !!templateUser.proxies,
      proxiesCount: templateUser.proxies?.length || 0,
      hasInbounds: !!templateUser.inbounds
    });

    // Step 3: Create the new user with template configuration
    const dataLimitBytes = dataLimitGB * 1073741824; // Convert GB to bytes
    const expireTimestamp = Math.floor(Date.now() / 1000) + (durationDays * 24 * 60 * 60);

    const newUserData = {
      username: username,
      proxies: templateUser.proxies || {},
      expire: expireTimestamp,
      data_limit: dataLimitBytes,
      data_limit_reset_strategy: templateUser.data_limit_reset_strategy || "no_reset",
      inbounds: templateUser.inbounds || {},
      note: notes || `Created via bnets.co - Subscription`,
      status: "active",
      excluded_inbounds: templateUser.excluded_inbounds || {}
    };

    console.log('🔵 [MARZBAN-CREATE-USER] Creating user with data:', {
      username: newUserData.username,
      expire: new Date(expireTimestamp * 1000).toISOString(),
      dataLimitGB: dataLimitGB,
      dataLimitBytes: dataLimitBytes,
      panelUrl: panelConfig.panel_url,
      hasProxies: !!newUserData.proxies,
      hasInbounds: !!newUserData.inbounds
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
      ok: createUserResponse.ok
    });

    if (!createUserResponse.ok) {
      const errorText = await createUserResponse.text();
      console.error('❌ [MARZBAN-CREATE-USER] User creation failed:', {
        status: createUserResponse.status,
        statusText: createUserResponse.statusText,
        error: errorText,
        panelUrl: panelConfig.panel_url
      });
      
      // Log the failure
      await supabase.from('user_creation_logs').insert({
        subscription_id: subscriptionId,
        panel_id: panelConfig.id,
        edge_function_name: 'marzban-create-user',
        request_data: requestData,
        success: false,
        error_message: `User creation failed: ${createUserResponse.status} - ${errorText}`,
        panel_url: panelConfig.panel_url,
        panel_name: panelConfig.name
      });
      
      throw new Error(`User creation failed: ${createUserResponse.status} - ${errorText}`);
    }

    const createdUser = await createUserResponse.json();
    
    // ✅ CRITICAL VERIFICATION: Log the subscription URL domain
    const subscriptionDomain = createdUser.subscription_url?.split('/')[2] || 'unknown';
    
    console.log('🟢 [MARZBAN-CREATE-USER] User created successfully:', {
      username: createdUser.username,
      subscriptionUrl: createdUser.subscription_url,
      subscriptionDomain,
      panelUsed: panelConfig.name,
      panelUrl: panelConfig.panel_url,
      expire: createdUser.expire
    });

    const responseData = {
      username: createdUser.username,
      subscription_url: createdUser.subscription_url,
      expire: createdUser.expire,
      data_limit: createdUser.data_limit,
      status: createdUser.status,
      panel_type: 'marzban',
      panel_name: panelConfig.name,
      panel_id: panelConfig.id,
      panel_url: panelConfig.panel_url
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
