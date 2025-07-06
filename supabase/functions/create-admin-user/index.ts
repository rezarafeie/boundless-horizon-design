import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { username, password, allowedSections, role } = await req.json()

    console.log(`Creating admin user for username: ${username}`)

    // Create auth user first
    const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
      email: `${username}@admin.boundless.network`,
      password: password,
      email_confirm: true
    })

    if (authError) {
      console.error('Auth user creation failed:', authError)
      throw authError
    }

    console.log(`Auth user created with ID: ${authUser.user.id}`)

    // Create admin user entry
    const { data: adminUser, error: adminError } = await supabaseClient
      .from('admin_users')
      .insert({
        user_id: authUser.user.id,
        username: username,
        password_hash: password, // Store plaintext for simplicity
        role: role || 'editor',
        is_active: true,
        allowed_sections: allowedSections || []
      })
      .select()
      .single()

    if (adminError) {
      console.error('Admin user creation failed:', adminError)
      // Clean up auth user if admin user creation fails
      await supabaseClient.auth.admin.deleteUser(authUser.user.id)
      throw adminError
    }

    console.log(`Admin user created:`, adminUser)

    return new Response(
      JSON.stringify({ 
        success: true, 
        adminUser: adminUser,
        authUserId: authUser.user.id 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error creating admin user:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})