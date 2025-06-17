
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
    console.log('Verify request received:', requestBody)

    const { merchant_id, authority } = requestBody

    const verifyRequest = {
      merchant_id,
      authority
    }

    console.log('Sending verify request to Zarinpal:', verifyRequest)

    const zarinpalResponse = await fetch('https://api.zarinpal.com/pg/v4/payman/verify.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(verifyRequest)
    })

    console.log('Zarinpal verify response status:', zarinpalResponse.status)

    const responseText = await zarinpalResponse.text()
    console.log('Zarinpal verify raw response:', responseText)

    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError)
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
          status: zarinpalResponse.status,
          rawResponse: responseText
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
        status: zarinpalResponse.status,
        rawResponse: responseText
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Payment verification error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Server error',
        message: error.message,
        details: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
