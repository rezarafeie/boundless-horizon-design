import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { panelId, searchQuery } = await req.json()
    
    console.log(`[MARZBAN-SEARCH-USER] Searching for: ${searchQuery} in panel: ${panelId}`)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get panel configuration
    const { data: panel, error: panelError } = await supabase
      .from('panel_servers')
      .select('*')
      .eq('id', panelId)
      .single()

    if (panelError || !panel) {
      throw new Error(`Panel not found: ${panelError?.message}`)
    }

    console.log(`[MARZBAN-SEARCH-USER] Found panel: ${panel.name} at ${panel.panel_url}`)

    // Make request to Marzban API to search users
    const searchUrl = `${panel.panel_url}/api/users?search=${encodeURIComponent(searchQuery)}&limit=20`
    
    // First, get admin token
    const loginResponse = await fetch(`${panel.panel_url}/api/admin/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: panel.username,
        password: panel.password
      })
    })

    if (!loginResponse.ok) {
      throw new Error(`Failed to authenticate with panel: ${loginResponse.status}`)
    }

    const loginData = await loginResponse.json()
    const token = loginData.access_token

    if (!token) {
      throw new Error('Failed to get access token from panel')
    }

    // Search users
    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    })

    if (!searchResponse.ok) {
      throw new Error(`Search request failed: ${searchResponse.status}`)
    }

    const searchData = await searchResponse.json()
    console.log(`[MARZBAN-SEARCH-USER] Found ${searchData.users?.length || 0} users`)

    return new Response(JSON.stringify({
      success: true,
      users: searchData.users || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('[MARZBAN-SEARCH-USER] Error:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Search failed',
      users: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})