
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestConnectionRequest {
  panelId: string;
  planId?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[TEST-PANEL-CONNECTION] Starting panel connection test');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { panelId, planId }: TestConnectionRequest = await req.json();

    if (!panelId) {
      throw new Error('Panel ID is required');
    }

    console.log('[TEST-PANEL-CONNECTION] Testing panel:', panelId);

    // Get panel information
    const { data: panel, error: panelError } = await supabase
      .from('panel_servers')
      .select('*')
      .eq('id', panelId)
      .single();

    if (panelError || !panel) {
      throw new Error(`Panel not found: ${panelError?.message}`);
    }

    console.log('[TEST-PANEL-CONNECTION] Panel found:', {
      name: panel.name,
      type: panel.type,
      url: panel.panel_url
    });

    // Test authentication based on panel type
    let authResult;
    let testUserResult;

    if (panel.type === 'marzban') {
      console.log('[TEST-PANEL-CONNECTION] Testing Marzban authentication');
      
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

      if (!authResponse.ok) {
        throw new Error(`Marzban auth failed: ${authResponse.status} ${authResponse.statusText}`);
      }

      const authData = await authResponse.json();
      authResult = {
        success: true,
        tokenReceived: !!authData.access_token,
        tokenType: authData.token_type
      };

      // Test creating a user
      const testUsername = `test_${Date.now()}`;
      const testUserResponse = await fetch(`${panel.panel_url}/api/user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: testUsername,
          data_limit: 1073741824, // 1GB
          expire: Math.floor(Date.now() / 1000) + 86400, // 1 day
          proxies: {
            vless: {},
            vmess: {},
            trojan: {},
            shadowsocks: {}
          }
        }),
      });

      if (testUserResponse.ok) {
        const userData = await testUserResponse.json();
        testUserResult = {
          success: true,
          username: userData.username,
          subscriptionUrl: userData.subscription_url
        };

        // Clean up test user
        try {
          await fetch(`${panel.panel_url}/api/user/${testUsername}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${authData.access_token}`,
            },
          });
          console.log('[TEST-PANEL-CONNECTION] Test user cleaned up');
        } catch (cleanupError) {
          console.warn('[TEST-PANEL-CONNECTION] Failed to cleanup test user:', cleanupError);
        }
      } else {
        testUserResult = {
          success: false,
          error: `Failed to create test user: ${testUserResponse.status}`
        };
      }

    } else {
      console.log('[TEST-PANEL-CONNECTION] Testing Marzneshin authentication');
      
      // Test Marzneshin authentication
      const authResponse = await fetch(`${panel.panel_url}/api/admins/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: panel.username,
          password: panel.password,
        }),
      });

      if (!authResponse.ok) {
        throw new Error(`Marzneshin auth failed: ${authResponse.status} ${authResponse.statusText}`);
      }

      const authData = await authResponse.json();
      authResult = {
        success: true,
        tokenReceived: !!authData.access_token,
        isSudo: authData.is_sudo
      };

      // Test creating a user
      const testUsername = `test_${Date.now()}`;
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + 1);
      
      const testUserResponse = await fetch(`${panel.panel_url}/api/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: testUsername,
          expire_strategy: 'fixed_date',
          expire_date: expireDate.toISOString().split('T')[0],
          data_limit: 1073741824, // 1GB
          service_ids: [7], // Basic service
          note: 'Test connection user',
          data_limit_reset_strategy: 'no_reset'
        }),
      });

      if (testUserResponse.ok) {
        const userData = await testUserResponse.json();
        testUserResult = {
          success: true,
          username: userData.username,
          subscriptionUrl: userData.subscription_url
        };

        // Clean up test user
        try {
          await fetch(`${panel.panel_url}/api/users/${userData.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${authData.access_token}`,
            },
          });
          console.log('[TEST-PANEL-CONNECTION] Test user cleaned up');
        } catch (cleanupError) {
          console.warn('[TEST-PANEL-CONNECTION] Failed to cleanup test user:', cleanupError);
        }
      } else {
        testUserResult = {
          success: false,
          error: `Failed to create test user: ${testUserResponse.status}`
        };
      }
    }

    // Update panel health status
    await supabase
      .from('panel_servers')
      .update({
        health_status: authResult.success && testUserResult.success ? 'online' : 'offline',
        last_health_check: new Date().toISOString()
      })
      .eq('id', panelId);

    const result = {
      success: authResult.success && testUserResult.success,
      panel: {
        id: panel.id,
        name: panel.name,
        type: panel.type,
        url: panel.panel_url
      },
      authentication: authResult,
      userCreation: testUserResult,
      timestamp: new Date().toISOString()
    };

    console.log('[TEST-PANEL-CONNECTION] Test completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[TEST-PANEL-CONNECTION] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
