
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
  usage_duration: number;
  data_limit: number;
  service_ids: number[];
  note: string;
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
  
  const userRequest: MarzneshinUserRequest = {
    username: userData.username,
    expire_strategy: 'start_on_first_use',
    usage_duration: userData.durationDays * 86400, // Convert days to seconds
    data_limit: userData.dataLimitGB * 1073741824, // Convert GB to bytes
    service_ids: serviceIds,
    note: `Purchased via bnets.co - ${userData.notes}`
  };

  console.log('Creating user with request:', userRequest);

  const response = await fetch(`${baseUrl}/api/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userRequest)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    if (response.status === 409) {
      throw new Error('This username is already taken. Please choose a different one');
    }
    throw new Error(errorData.detail || `Failed to create user on Marzneshin: ${response.status}`);
  }

  const result = await response.json();
  console.log('User created successfully:', result);
  return result;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, dataLimitGB, durationDays, notes } = await req.json();

    // Get secrets from environment
    const baseUrl = Deno.env.get('MARZNESHIN_BASE_URL');
    const adminUsername = Deno.env.get('MARZNESHIN_ADMIN_USERNAME');
    const adminPassword = Deno.env.get('MARZNESHIN_ADMIN_PASSWORD');

    if (!baseUrl || !adminUsername || !adminPassword) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ 
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

    // Create the user
    const result = await createMarzneshinUser(
      baseUrl,
      token,
      { username, dataLimitGB, durationDays, notes },
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
    console.error('Marzneshin API Error:', error);
    
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
