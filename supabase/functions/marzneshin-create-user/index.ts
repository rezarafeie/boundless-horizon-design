
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Required service names for Pro plan (matching actual API services)
const REQUIRED_SERVICE_NAMES = [
  'UserInfo',
  'FinlandTunnel',
  'GermanyDirect', 
  'GermanyTunnel',
  'NetherlandsDirect',
  'NetherlandsTunnel',
  'TurkeyDirect',
  'TurkeyTunnel',
  'UkDirect',
  'UkTunnel',
  'UsDirect',
  'UsTunnel',
  'PolandTunnel'
];

interface MarzneshinService {
  id: number;
  name: string;
  inbound_ids: number[];
  user_ids?: number[];
  created_at?: string;
  updated_at?: string;
}

interface MarzneshinServicesResponse {
  items: MarzneshinService[];
  total: number;
  page: number;
  size: number;
  pages: number;
  links: any;
}

interface MarzneshinUserRequest {
  username: string;
  expire_strategy: string;
  expire?: number;
  usage_duration: number;
  data_limit: number;
  service_ids: number[];
  note: string;
  data_limit_reset_strategy?: string;
}

interface MarzneshinUserResponse {
  username: string;
  subscription_url: string;
  expire: number;
  data_limit: number;
  usage_duration: number;
  service_ids: number[];
}

async function getAuthToken(baseUrl: string, username: string, password: string): Promise<string> {
  console.log('Attempting to authenticate with Marzneshin API');
  
  const tokenResponse = await fetch(`${baseUrl}/api/admins/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      username: username,
      password: password,
      grant_type: 'password'
    })
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Authentication failed:', errorText);
    throw new Error(`Failed to authenticate with Marzneshin API: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  console.log('Authentication successful');
  return tokenData.access_token;
}

async function getServices(baseUrl: string, token: string): Promise<MarzneshinService[]> {
  console.log('Fetching services from Marzneshin API');
  
  const response = await fetch(`${baseUrl}/api/services`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to fetch services:', errorText);
    throw new Error(`Failed to fetch services from Marzneshin API: ${response.status} ${errorText}`);
  }

  const data: MarzneshinServicesResponse = await response.json();
  console.log('Services response:', data);
  
  return data.items || [];
}

function getRequiredServiceIds(services: MarzneshinService[]): number[] {
  const serviceIds: number[] = [];
  
  for (const serviceName of REQUIRED_SERVICE_NAMES) {
    const service = services.find(s => s.name === serviceName);
    if (service) {
      serviceIds.push(service.id);
      console.log(`Found service: ${serviceName} with ID: ${service.id}`);
    } else {
      console.warn(`Service not found: ${serviceName}`);
    }
  }
  
  console.log(`Found ${serviceIds.length} out of ${REQUIRED_SERVICE_NAMES.length} required services`);
  return serviceIds;
}

async function createMarzneshinUser(
  baseUrl: string,
  token: string,
  userData: {
    username: string;
    dataLimitGB: number;
    durationDays: number;
    notes: string;
  },
  serviceIds: number[]
): Promise<MarzneshinUserResponse> {
  
  // Calculate expiration timestamp (current time + duration in days)
  const currentTimeSeconds = Math.floor(Date.now() / 1000);
  const durationSeconds = userData.durationDays * 24 * 60 * 60; // Convert days to seconds
  const expirationTimestamp = currentTimeSeconds + durationSeconds;

  // Validate timestamp
  if (expirationTimestamp <= currentTimeSeconds) {
    throw new Error('Invalid expiration timestamp - must be in the future');
  }

  console.log(`Current time: ${currentTimeSeconds} (${new Date(currentTimeSeconds * 1000).toISOString()})`);
  console.log(`Duration: ${userData.durationDays} days (${durationSeconds} seconds)`);
  console.log(`Calculated expiration: ${expirationTimestamp} (${new Date(expirationTimestamp * 1000).toISOString()})`);

  // Use fixed_date strategy with proper timestamp
  const userRequest: MarzneshinUserRequest = {
    username: userData.username,
    expire_strategy: 'fixed_date',
    expire: expirationTimestamp,
    usage_duration: durationSeconds,
    data_limit: userData.dataLimitGB * 1073741824, // Convert GB to bytes
    service_ids: serviceIds,
    note: `Purchased via bnets.co - ${userData.notes}`,
    data_limit_reset_strategy: 'no_reset'
  };

  console.log('Creating user with request:', JSON.stringify(userRequest, null, 2));

  const response = await fetch(`${baseUrl}/api/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userRequest)
  });

  console.log(`User creation response status: ${response.status}`);

  if (!response.ok) {
    let errorData: any;
    const contentType = response.headers.get('content-type');
    
    try {
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
        console.error('Marzneshin API error response (JSON):', JSON.stringify(errorData, null, 2));
      } else {
        const errorText = await response.text();
        console.error('Marzneshin API error response (Text):', errorText);
        errorData = { detail: errorText };
      }
    } catch (parseError) {
      console.error('Failed to parse error response:', parseError);
      errorData = { detail: 'Unknown error - failed to parse response' };
    }

    // Handle specific error cases
    if (response.status === 409) {
      throw new Error('This username is already taken. Please choose a different one');
    }
    
    if (response.status === 422) {
      // Validation error - provide more specific feedback
      let errorMessage = 'Validation error';
      
      if (errorData.detail) {
        if (typeof errorData.detail === 'string') {
          errorMessage = `Validation error: ${errorData.detail}`;
        } else if (errorData.detail.body) {
          errorMessage = `Validation error: ${errorData.detail.body}`;
        } else if (Array.isArray(errorData.detail)) {
          const validationErrors = errorData.detail.map((err: any) => 
            `${err.loc ? err.loc.join('.') : 'field'}: ${err.msg}`
          ).join(', ');
          errorMessage = `Validation error: ${validationErrors}`;
        } else {
          errorMessage = `Validation error: ${JSON.stringify(errorData.detail)}`;
        }
      }
      
      throw new Error(errorMessage);
    }

    if (response.status === 400) {
      throw new Error(`Bad request: ${errorData.detail || 'Invalid request parameters'}`);
    }

    // Generic error with detailed logging
    const errorMessage = errorData.detail || errorData.message || `HTTP ${response.status} error`;
    throw new Error(`Failed to create user on Marzneshin: ${errorMessage}`);
  }

  const result = await response.json();
  console.log('User created successfully:', JSON.stringify(result, null, 2));
  return result;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received request, parsing body...');
    const requestBody = await req.json();
    console.log('Raw request body:', JSON.stringify(requestBody, null, 2));

    // Extract parameters with support for both old and new parameter names
    const {
      username,
      dataLimitGB,
      dataLimit,
      durationDays,
      duration,
      notes
    } = requestBody;

    // Use the new parameter names if available, otherwise fall back to old ones
    const finalDataLimitGB = dataLimitGB || dataLimit;
    const finalDurationDays = durationDays || duration;

    console.log('Extracted parameters:', {
      username,
      finalDataLimitGB,
      finalDurationDays,
      notes: notes ? 'provided' : 'empty'
    });

    // Validate required parameters
    if (!username) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Username is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!finalDataLimitGB || typeof finalDataLimitGB !== 'number' || finalDataLimitGB <= 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Valid data limit (in GB) is required and must be a positive number' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!finalDurationDays || typeof finalDurationDays !== 'number' || finalDurationDays <= 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Valid duration (in days) is required and must be a positive number' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get secrets from environment
    const baseUrl = Deno.env.get('MARZNESHIN_BASE_URL');
    const adminUsername = Deno.env.get('MARZNESHIN_ADMIN_USERNAME');
    const adminPassword = Deno.env.get('MARZNESHIN_ADMIN_PASSWORD');

    if (!baseUrl || !adminUsername || !adminPassword) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Server configuration error. Please contact support.' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Starting Marzneshin user creation process');

    // Get authentication token
    const token = await getAuthToken(baseUrl, adminUsername, adminPassword);
    
    // Get available services
    const services = await getServices(baseUrl, token);
    console.log(`Fetched ${services.length} services from API`);
    
    // Get required service IDs for Pro plan
    const requiredServiceIds = getRequiredServiceIds(services);
    
    if (requiredServiceIds.length === 0) {
      throw new Error('No required services found. Please ensure the Pro plan services are configured in Marzneshin.');
    }

    // Create the user with normalized parameters
    const result = await createMarzneshinUser(
      baseUrl,
      token,
      { 
        username, 
        dataLimitGB: finalDataLimitGB, 
        durationDays: finalDurationDays, 
        notes: notes || '' 
      },
      requiredServiceIds
    );

    console.log('Marzneshin user creation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Marzneshin API Error Details:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to create user' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
