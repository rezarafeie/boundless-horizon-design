import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { panelId } = await req.json()
    
    if (!panelId) {
      return new Response(
        JSON.stringify({ error: 'Panel ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get panel details from database
    const { data: panel, error: panelError } = await supabase
      .from('panel_servers')
      .select('*')
      .eq('id', panelId)
      .single()

    if (panelError || !panel) {
      console.error('Failed to fetch panel:', panelError)
      return new Response(
        JSON.stringify({ error: 'Panel not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔄 Starting panel refresh for: ${panel.name} (${panel.type})`)

    // Log refresh attempt
    const logData = {
      panel_id: panelId,
      refresh_result: false,
      error_message: null,
      configs_fetched: 0,
      response_data: {}
    }

    try {
      // Step 1: Authenticate with panel
      console.log(`🔐 Authenticating with ${panel.type} panel: ${panel.panel_url}`)
      
      const authResponse = await fetch(`${panel.panel_url}/api/admin/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `username=${encodeURIComponent(panel.username)}&password=${encodeURIComponent(panel.password)}`,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      })

      if (!authResponse.ok) {
        const errorText = await authResponse.text()
        throw new Error(`Authentication failed: ${authResponse.status} - ${errorText}`)
      }

      const authData = await authResponse.json()
      const token = authData.access_token
      
      if (!token) {
        throw new Error('No access token received from authentication')
      }

      console.log(`✅ Authentication successful for ${panel.type}`)

      let configData = {}
      let configsFetched = 0

      if (panel.type === 'marzneshin') {
        // Marzneshin: Get services and inbounds
        console.log('📋 Fetching Marzneshin services...')
        
        const servicesResponse = await fetch(`${panel.panel_url}/api/services`, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: AbortSignal.timeout(30000)
        })

        if (servicesResponse.ok) {
          const services = await servicesResponse.json()
          console.log('📋 Fetching Marzneshin inbounds...')
          
          const inboundsResponse = await fetch(`${panel.panel_url}/api/inbounds`, {
            headers: { 'Authorization': `Bearer ${token}` },
            signal: AbortSignal.timeout(30000)
          })

          if (inboundsResponse.ok) {
            const inbounds = await inboundsResponse.json()
            
            configData = {
              services: services || [],
              inbounds: inbounds || [],
              type: 'marzneshin'
            }
            configsFetched = (services?.length || 0) + (inbounds?.length || 0)
            
            console.log(`✅ Marzneshin config fetched: ${services?.length || 0} services, ${inbounds?.length || 0} inbounds`)
          }
        }

      } else if (panel.type === 'marzban') {
        // Marzban: Get user template and system info
        console.log('👤 Fetching Marzban user template from /api/user/reza...')
        
        const userResponse = await fetch(`${panel.panel_url}/api/user/reza`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        })

        if (userResponse.ok) {
          const userData = await userResponse.json()
          console.log('📋 User template data received:', JSON.stringify(userData, null, 2))

          // Check for beta version (has group_ids)
          const isBetaVersion = userData.group_ids && Array.isArray(userData.group_ids)
          console.log(`🔍 Marzban version detected: ${isBetaVersion ? 'BETA' : 'LEGACY'}`)

          if (isBetaVersion) {
            // Beta version - extract proxy_settings and group_ids
            configData = {
              type: 'marzban_beta',
              proxy_settings: userData.proxy_settings || {},
              group_ids: userData.group_ids || [],
              template_user: userData
            }
            console.log('✅ Beta version config extracted:', {
              proxy_settings: !!userData.proxy_settings,
              group_ids: userData.group_ids?.length || 0
            })
          } else {
            // Legacy version - get inbounds
            console.log('📋 Fetching legacy Marzban inbounds...')
            
            const inboundsResponse = await fetch(`${panel.panel_url}/api/inbounds`, {
              headers: { 'Authorization': `Bearer ${token}` },
              signal: AbortSignal.timeout(30000)
            })

            if (inboundsResponse.ok) {
              const inbounds = await inboundsResponse.json()
              configData = {
                type: 'marzban_legacy',
                inbounds: inbounds || [],
                template_user: userData
              }
              console.log(`✅ Legacy version inbounds fetched: ${inbounds?.length || 0} inbounds`)
            }
          }
          
          configsFetched = 1
        } else {
          const errorText = await userResponse.text()
          console.error('❌ Failed to fetch user template:', errorText)
          throw new Error(`Failed to fetch user template: ${userResponse.status} - ${errorText}`)
        }
      }

      // Update panel config in database
      const { error: updateError } = await supabase
        .from('panel_servers')
        .update({
          panel_config_data: configData,
          updated_at: new Date().toISOString(),
          health_status: 'online',
          last_health_check: new Date().toISOString()
        })
        .eq('id', panelId)

      if (updateError) {
        console.error('❌ Failed to update panel config:', updateError)
        throw new Error(`Failed to update panel config: ${updateError.message}`)
      }

      // Log successful refresh
      logData.refresh_result = true
      logData.configs_fetched = configsFetched
      logData.response_data = configData

      await supabase.from('panel_refresh_logs').insert(logData)

      console.log(`✅ Panel refresh completed successfully for ${panel.name}`)
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Panel configuration refreshed successfully. Fetched ${configsFetched} config items.`,
          configData,
          configsFetched
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (error) {
      console.error('❌ Panel refresh failed:', error)
      
      // Log failed refresh
      logData.error_message = error.message
      logData.response_data = { error: error.message }
      
      await supabase.from('panel_refresh_logs').insert(logData)

      // Update panel health status
      await supabase
        .from('panel_servers')
        .update({
          health_status: 'unknown',
          last_health_check: new Date().toISOString()
        })
        .eq('id', panelId)

      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to refresh panel config: ${error.message}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('❌ Refresh panel config function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})