
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

    const zarinpalRequest = {
      merchant_id,
      mobile,
      expire_at,
      max_daily_count,
      max_monthly_count,
      max_amount,
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

    const responseData = await response.json();
    console.log('Zarinpal contract response:', responseData);

    if (!response.ok) {
      res.status(response.status).json({
        success: false,
        error: 'Zarinpal API error',
        details: responseData,
        status: response.status
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: responseData,
      status: response.status
    });

  } catch (error) {
    console.error('Contract creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
}
