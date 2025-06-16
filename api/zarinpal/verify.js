
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
    const { merchant_id, authority } = req.body;

    const verifyRequest = {
      merchant_id,
      authority
    };

    console.log('Zarinpal verify request:', verifyRequest);

    const response = await fetch('https://api.zarinpal.com/pg/v4/payman/verify.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(verifyRequest)
    });

    console.log('Zarinpal verify response status:', response.status);

    // Get raw response text first
    const responseText = await response.text();
    console.log('Zarinpal verify raw response:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      res.status(502).json({
        success: false,
        error: 'Invalid response from Zarinpal',
        details: {
          status: response.status,
          rawResponse: responseText.substring(0, 500),
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
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
      details: error.stack
    });
  }
}
