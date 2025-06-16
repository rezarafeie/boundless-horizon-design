
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const requestBody = await req.json()
    console.log('Contract request received:', requestBody)

    const { merchant_id, mobile, expire_at, max_daily_count, max_monthly_count, max_amount, callback_url } = requestBody

    // Convert timestamp to proper date format for Zarinpal
    const expireDate = new Date(expire_at * 1000)
    const formattedExpireAt = expireDate.toISOString().slice(0, 19).replace('T', ' ')

    const contractRequest = {
      merchant_id,
      mobile,
      expire_at: formattedExpireAt,
      max_daily_count,
      max_monthly_count,
      max_amount,
      callback_url
    }

    console.log('Sending to Zarinpal:', contractRequest)

    const zarinpalResponse = await fetch('https://api.zarinpal.com/pg/v4/payman/request.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(contractRequest)
    })

    const responseText = await zarinpalResponse.text()
    console.log('Zarinpal raw response:', responseText)

    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse Zarinpal response:', parseError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid response from Zarinpal',
          details: {
            status: zarinpalResponse.status,
            rawResponse: responseText.substring(0, 500),
            parseError: parseError.message
          }
        }),
        { 
          status: 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!zarinpalResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Zarinpal API error',
          details: responseData,
          status: zarinpalResponse.status
        }),
        { 
          status: zarinpalResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData,
        status: zarinpalResponse.status
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Contract creation error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Server error',
        message: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
