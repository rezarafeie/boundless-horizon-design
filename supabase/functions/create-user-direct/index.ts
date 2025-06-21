
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
    const { username, dataLimitGB, durationDays, notes, panelType, subscriptionId, isFreeTriaL } = requestBody as CreateUserRequest;

    logStep('REQUEST', 'Request received', { username, dataLimitGB, durationDays, panelType, subscriptionId, isFreeTriaL });

    // Input validation
    if (!username || !dataLimitGB || !durationDays || !panelType) {
      throw new Error('Missing required parameters');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get panel information - improved panel selection logic
    logStep('DB_QUERY', `Fetching ${panelType} panel data`);
    
    const { data: panels, error: panelError } = await supabase
      .from('panel_servers')
      .select('*')
      .eq('type', panelType)
      .eq('is_active', true)
      .eq('health_status', 'online')
      .order('created_at', { ascending: true });

    if (panelError || !panels || panels.length === 0) {
      logStep('ERROR', `No active ${panelType} panel found`, panelError);
      throw new Error(`No active ${panelType} panel available. Please try again later.`);
    }

    // Use the first available panel
    const panel = panels[0];

    logStep('PANEL', 'Panel data retrieved', {
      name: panel.name,
      url: panel.panel_url,
      enabledProtocols: panel.enabled_protocols
    });

    const baseUrl = panel.panel_url.replace(/\/+$/, '');
    const enabledProtocols = Array.isArray(panel.enabled_protocols) ? panel.enabled_protocols : ['vless', 'vmess', 'trojan', 'shadowsocks'];

    // Authenticate with panel - using same method as test function
    let token: string;
    
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
      });

      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        logStep('ERROR', 'Marzban authentication failed', { status: authResponse.status, error: errorText });
        throw new Error(`Authentication failed with ${panelType} panel`);
      }

      const authData = await authResponse.json();
      token = authData.access_token;
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
        })
      });

      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        logStep('ERROR', 'Marzneshin authentication failed', { status: authResponse.status, error: errorText });
        throw new Error(`Authentication failed with ${panelType} panel`);
      }

      const authData = await authResponse.json();
      token = authData.access_token;
    }

    logStep('AUTH', 'Authentication successful');

    // Create user - using panel-specific logic
    let userData: any;
    
    if (panelType === 'marzban') {
      // Marzban user creation
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + durationDays);
      
      const userPayload = {
        username: username,
        data_limit: dataLimitGB * 1073741824,
        expire: Math.floor(expireDate.getTime() / 1000),
        proxies: enabledProtocols.reduce((acc: any, protocol: string) => {
          acc[protocol] = {};
          return acc;
        }, {}),
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
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        logStep('ERROR', 'Marzban user creation failed', { status: createResponse.status, error: errorText });
        throw new Error(`Failed to create user on ${panelType} panel: ${errorText}`);
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
        }
      });

      if (!servicesResponse.ok) {
        throw new Error('Failed to fetch services from Marzneshin panel');
      }

      const servicesData = await servicesResponse.json();
      const serviceIds = servicesData.items?.map((service: any) => service.id) || [];
      
      logStep('SERVICES', `Found ${serviceIds.length} services`);

      const expireDateStr = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const userPayload = {
        username: username,
        expire_strategy: 'fixed_date',
        expire_date: expireDateStr,
        data_limit: dataLimitGB * 1073741824,
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
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        logStep('ERROR', 'Marzneshin user creation failed', { status: createResponse.status, error: errorText });
        throw new Error(`Failed to create user on ${panelType} panel: ${errorText}`);
      }

      userData = await createResponse.json();
    }

    logStep('SUCCESS', 'User created successfully', {
      username: userData.username,
      hasSubscriptionUrl: !!userData.subscription_url
    });

    // Update subscription record if provided
    if (subscriptionId) {
      logStep('UPDATE', 'Updating subscription record');
      
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          subscription_url: userData.subscription_url || `${baseUrl}/sub/${username}`,
          marzban_user_created: true,
          expire_at: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', subscriptionId);

      if (updateError) {
        logStep('ERROR', 'Failed to update subscription record', updateError);
      } else {
        logStep('UPDATE', 'Subscription record updated successfully');
      }
    }

    // Return success response
    const result = {
      success: true,
      data: {
        username: userData.username,
        subscription_url: userData.subscription_url || `${baseUrl}/sub/${username}`,
        expire: userData.expire || Math.floor(Date.now() / 1000) + (durationDays * 24 * 60 * 60),
        data_limit: userData.data_limit || (dataLimitGB * 1073741824),
        panel_type: panelType,
        panel_name: panel.name
      }
    };

    logStep('COMPLETE', 'User creation completed successfully', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logStep('ERROR', 'User creation failed', { message: error.message, stack: error.stack });
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to create user'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
