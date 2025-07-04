import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TELEGRAM_BASE_URL = 'https://b.bnets.co/api'
const TELEGRAM_API_TOKEN = '6169452dd5a55778f35fcedaa1fbd7b9'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { endpoint, payload, method = 'GET' } = await req.json()
    
    console.log('Telegram Bot Proxy - Endpoint:', endpoint)
    console.log('Telegram Bot Proxy - Payload:', payload)
    console.log('Telegram Bot Proxy - Method:', method)

    let url = `${TELEGRAM_BASE_URL}${endpoint}`
    const requestOptions: RequestInit = {
      method: method,
      headers: {
        'Token': TELEGRAM_API_TOKEN,
        'Content-Type': 'application/json',
      }
    }

    // For GET requests, convert payload to URL parameters
    if (method === 'GET' && payload) {
      const urlParams = new URLSearchParams()
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          urlParams.append(key, String(value))
        }
      })
      if (urlParams.toString()) {
        url = `${url}?${urlParams.toString()}`
      }
    }
    // For POST requests, add JSON body
    else if (method === 'POST' && payload) {
      requestOptions.body = JSON.stringify(payload)
    }

    console.log('Telegram Bot Proxy - Request details:', {
      method,
      url,
      headers: requestOptions.headers,
      bodySize: requestOptions.body?.length || 0
    })

    console.log('Telegram Bot Proxy - Full URL:', url)
    const response = await fetch(url, requestOptions)

    if (!response.ok) {
      console.error('Telegram Bot API Error:', response.status, response.statusText)
      // Try to get response body for debugging
      try {
        const errorBody = await response.text()
        console.error('Telegram Bot API Error Body:', errorBody)
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorBody}`)
      } catch (bodyError) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    }

    const data = await response.json()
    console.log('Telegram Bot Proxy - Response:', data)
    
    // Check if the API returned an error in the response body
    if (data && data.status === false) {
      console.error('Telegram Bot API returned error:', data)
      throw new Error(`Telegram API Error: ${data.msg || 'Unknown error'} - ${JSON.stringify(data)}`)
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Telegram Bot Proxy Error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Proxy request failed',
        data: null 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})