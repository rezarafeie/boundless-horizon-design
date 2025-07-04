import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TELEGRAM_BOT_BASE_URL = 'https://b.bnets.co/api';
const TELEGRAM_BOT_API_TOKEN = '6169452dd5a55778f35fcedaa1fbd7b9';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { endpoint, payload } = await req.json();
    
    if (!endpoint) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Endpoint parameter is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Telegram Bot Proxy: Calling ${endpoint} with payload:`, payload);

    // Convert payload to URL parameters
    const urlParams = new URLSearchParams();
    if (payload) {
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          urlParams.append(key, String(value));
        }
      });
    }
    
    const url = `${TELEGRAM_BOT_BASE_URL}${endpoint}?${urlParams.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Token': TELEGRAM_BOT_API_TOKEN,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log(`Telegram Bot Proxy: Response from ${endpoint}:`, data);

    return new Response(JSON.stringify({ 
      success: true, 
      data 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Telegram Bot Proxy Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'API request failed',
      data: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})