
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { merchant_id, mobile, expire_at, max_daily_count, max_monthly_count, max_amount, callback_url } = req.body;

    // Convert UNIX timestamp to datetime string format
    const expireDate = new Date(expire_at * 1000);
    const expireDateString = expireDate.toISOString().slice(0, 19).replace('T', ' ');

    const zarinpalRequest = {
      merchant_id,
      mobile,
      expire_at: expireDateString, // Fixed: Use datetime string format
      max_daily_count: max_daily_count.toString(),
      max_monthly_count: max_monthly_count.toString(),
      max_amount: max_amount.toString(),
      callback_url
    };

    console.log('Zarinpal contract request:', zarinpalRequest);

    const response = await fetch('https://api.zarinpal.com/pg/v4/payman/request.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(zarinpalRequest)
    });

    console.log('Zarinpal response status:', response.status);
    console.log('Zarinpal response headers:', Object.fromEntries(response.headers));

    // Get raw response text first
    const responseText = await response.text();
    console.log('Zarinpal raw response:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      // If it's not JSON (likely HTML error page)
      console.error('Failed to parse JSON response:', parseError);
      res.status(502).json({
        success: false,
        error: 'Invalid response from Zarinpal',
        details: {
          status: response.status,
          rawResponse: responseText.substring(0, 500), // Truncate for safety
          parseError: parseError.message
        }
      });
      return;
    }

    if (!response.ok) {
      res.status(response.status).json({
        success: false,
        error: 'Zarinpal API error',
        details: responseData,
        status: response.status,
        rawResponse: responseText
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: responseData,
      status: response.status,
      rawResponse: responseText
    });

  } catch (error) {
    console.error('Contract creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
      details: error.stack
    });
  }
}
