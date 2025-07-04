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
    const { searchQuery, panelIds } = await req.json()
    
    console.log(`[SEARCH-PANEL-USERS] Searching for: ${searchQuery} in panels:`, panelIds)

    if (!searchQuery || searchQuery.trim().length < 2) {
      return new Response(JSON.stringify({
        success: true,
        results: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get panel configurations (include all active panels)
    let panelQuery = supabase
      .from('panel_servers')
      .select('*')
      .eq('is_active', true)
    
    if (panelIds && panelIds.length > 0) {
      panelQuery = panelQuery.in('id', panelIds)
    }
    
    const { data: panels, error: panelsError } = await panelQuery

    if (panelsError) {
      throw panelsError
    }

    const searchResults: any[] = []

    // Search each panel
    for (const panel of panels || []) {
      try {
        console.log(`[SEARCH-PANEL-USERS] Searching in panel: ${panel.name}`)
        
        if (panel.type === 'marzban') {
          // Call marzban search function
          const { data, error } = await supabase.functions.invoke('marzban-search-user', {
            body: { 
              panelId: panel.id,
              searchQuery: searchQuery.trim()
            }
          })
          
          if (!error && data?.success && data.users) {
            data.users.forEach((user: any) => {
              searchResults.push({
                id: `panel-${panel.id}-${user.username || user.id}`,
                source: 'panel',
                type: 'user',
                username: user.username,
                email: user.email,
                status: user.status,
                panel_name: panel.name,
                panel_id: panel.id,
                country: panel.country_en,
                details: {
                  data_limit_bytes: user.data_limit,
                  used_traffic: user.used_traffic,
                  expire_date: user.expire_date,
                  online: user.online,
                  created_at: user.created_at
                }
              })
            })
          }
        } else if (panel.type === 'marzneshin') {
          // Marzneshin search - show as available but not functional
          console.log(`[SEARCH-PANEL-USERS] Marzneshin search available for panel: ${panel.name} (integration pending)`)
          
          // Add placeholder result to show the panel exists
          searchResults.push({
            id: `panel-${panel.id}-placeholder`,
            source: 'panel',
            type: 'user',
            username: `Search available on ${panel.name}`,
            email: null,
            status: 'integration_pending',
            panel_name: panel.name,
            panel_id: panel.id,
            country: panel.country_en,
            details: {
              message: 'Marzneshin integration coming soon',
              panel_type: 'marzneshin',
              integration_status: 'pending'
            }
          })
        }
      } catch (error) {
        console.error(`[SEARCH-PANEL-USERS] Error searching panel ${panel.name}:`, error)
        // Continue with other panels
      }
    }

    return new Response(JSON.stringify({
      success: true,
      results: searchResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('[SEARCH-PANEL-USERS] Error:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Search failed',
      results: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})