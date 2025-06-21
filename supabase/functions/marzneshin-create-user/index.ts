
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

// Supported protocols including WebSocket
const SUPPORTED_PROTOCOLS = ['vmess', 'vless', 'trojan', 'shadowsocks', 'ws', 'websocket'];

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
  expire_after?: number;
  usage_duration?: number;
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

async function getPanelCredentials(panelId: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('Fetching panel credentials for:', panelId);
  
  const { data: panel, error } = await supabase
    .from('panel_servers')
    .select('*')
    .eq('id', panelId)
    .single();

  if (error || !panel) {
    throw new Error(`Panel not found: ${error?.message || 'Unknown error'}`);
  }

  console.log('Panel credentials retrieved:', {
    panelName: panel.name,
    panelUrl: panel.panel_url,
    enabledProtocols: panel.enabled_protocols
  });

  return {
    baseUrl: panel.panel_url.replace(/\/+$/, ''),
    username: panel.username,
    password: panel.password,
    enabledProtocols: Array.isArray(panel.enabled_protocols) ? panel.enabled_protocols : ['vless', 'vmess', 'trojan', 'shadowsocks']
  };
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

function formatDateToMMDDYYYY(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function formatDateToISO(date: Date): string {
  return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
}

function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function validateDuration(durationDays: number): boolean {
  return durationDays > 0 && durationDays <= 365; // Max 1 year
}

async function createMarzneshinUser(
  baseUrl: string,
  token: string,
  userData: {
    username: string;
    dataLimitGB: number;
    durationDays: number;
    notes: string;
    enabledProtocols: string[];
  },
  serviceIds: number[]
): Promise<MarzneshinUserResponse> {
  
  console.log('Starting user creation with data:', userData);
  
  // Validate duration
  if (!validateDuration(userData.durationDays)) {
    throw new Error(`Invalid duration: ${userData.durationDays} days. Must be between 1 and 365 days.`);
  }
  
  // Calculate expiration date
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + userData.durationDays);
  
  // Ensure the date is in the future
  if (expirationDate <= new Date()) {
    throw new Error('Calculated expiration date is not in the future');
  }
  
  const formattedExpireDateMM = formatDateToMMDDYYYY(expirationDate);
  const formattedExpireDateISO = formatDateToISO(expirationDate);
  const formattedExpireDateYYYY = formatDateToYYYYMMDD(expirationDate);
  
  console.log(`Calculated expiration date: ${formattedExpireDateMM} (${userData.durationDays} days from now)`);
  console.log(`Alternative formats: ISO=${formattedExpireDateISO}, YYYY-MM-DD=${formattedExpireDateYYYY}`);
  console.log(`Using enabled protocols: ${userData.enabledProtocols.join(', ')}`);
  
  // Focus only on fixed_date strategy with different formats and field names
  const strategies = [
    {
      name: 'fixed_date_expire_date_mmddyyyy',
      createRequest: () => ({
        username: userData.username,
        expire_strategy: 'fixed_date',
        expire_date: formattedExpireDateMM,
        data_limit: userData.dataLimitGB * 1073741824,
        service_ids: serviceIds,
        note: `Purchased via bnets.co - ${userData.notes} - Protocols: ${userData.enabledProtocols.join(', ')}`,
        data_limit_reset_strategy: 'no_reset'
      })
    },
    {
      name: 'fixed_date_expire_mmddyyyy',
      createRequest: () => ({
        username: userData.username,
        expire_strategy: 'fixed_date',
        expire: formattedExpireDateMM,
        data_limit: userData.dataLimitGB * 1073741824,
        service_ids: serviceIds,
        note: `Purchased via bnets.co - ${userData.notes} - Protocols: ${userData.enabledProtocols.join(', ')}`,
        data_limit_reset_strategy: 'no_reset'
      })
    },
    {
      name: 'fixed_date_expire_date_iso',
      createRequest: () => ({
        username: userData.username,
        expire_strategy: 'fixed_date',
        expire_date: formattedExpireDateISO,
        data_limit: userData.dataLimitGB * 1073741824,
        service_ids: serviceIds,
        note: `Purchased via bnets.co - ${userData.notes} - Protocols: ${userData.enabledProtocols.join(', ')}`,
        data_limit_reset_strategy: 'no_reset'
      })
    },
    {
      name: 'fixed_date_expire_iso',
      createRequest: () => ({
        username: userData.username,
        expire_strategy: 'fixed_date',
        expire: formattedExpireDateISO,
        data_limit: userData.dataLimitGB * 1073741824,
        service_ids: serviceIds,
        note: `Purchased via bnets.co - ${userData.notes} - Protocols: ${userData.enabledProtocols.join(', ')}`,
        data_limit_reset_strategy: 'no_reset'
      })
    },
    {
      name: 'fixed_date_expire_date_yyyymmdd',
      createRequest: () => ({
        username: userData.username,
        expire_strategy: 'fixed_date',
        expire_date: formattedExpireDateYYYY,
        data_limit: userData.dataLimitGB * 1073741824,
        service_ids: serviceIds,
        note: `Purchased via bnets.co - ${userData.notes} - Protocols: ${userData.enabledProtocols.join(', ')}`,
        data_limit_reset_strategy: 'no_reset'
      })
    },
    {
      name: 'fixed_date_expire_yyyymmdd',
      createRequest: () => ({
        username: userData.username,
        expire_strategy: 'fixed_date',
        expire: formattedExpireDateYYYY,
        data_limit: userData.dataLimitGB * 1073741824,
        service_ids: serviceIds,
        note: `Purchased via bnets.co - ${userData.notes} - Protocols: ${userData.enabledProtocols.join(', ')}`,
        data_limit_reset_strategy: 'no_reset'
      })
    }
  ];

  let lastError: any = null;

  for (const strategy of strategies) {
    try {
      console.log(`Trying strategy: ${strategy.name}`);
      const userRequest = strategy.createRequest();
      
      console.log('Request payload:', JSON.stringify(userRequest, null, 2));

      const response = await fetch(`${baseUrl}/api/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userRequest)
      });

      console.log(`Strategy ${strategy.name} response status: ${response.status}`);

      if (response.ok) {
        const result = await response.json();
        console.log(`Strategy ${strategy.name} succeeded:`, result);
        console.log(`✅ User created successfully with ${strategy.name} strategy`);
        console.log(`📋 Full API response:`, JSON.stringify(result, null, 2));
        return result;
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error(`Strategy ${strategy.name} failed with status ${response.status}:`, errorData);
        lastError = errorData;
        
        // If it's a username conflict, don't try other strategies
        if (response.status === 409) {
          throw new Error('This username is already taken. Please choose a different one');
        }
        
        continue;
      }
    } catch (error) {
      console.error(`Strategy ${strategy.name} threw error:`, error);
      lastError = error;
      
      // If it's a username conflict, don't try other strategies
      if (error.message?.includes('already taken')) {
        throw error;
      }
      
      continue;
    }
  }

  // If all strategies failed, throw the last error with comprehensive details
  console.error('❌ All fixed_date strategies failed. Last error details:', lastError);
  
  if (lastError) {
    if (lastError.detail) {
      if (typeof lastError.detail === 'string') {
        throw new Error(`All fixed_date strategies failed. API error: ${lastError.detail}`);
      } else if (Array.isArray(lastError.detail)) {
        const validationErrors = lastError.detail.map((err: any) => 
          `${err.loc ? err.loc.join('.') : 'field'}: ${err.msg}`
        ).join(', ');
        throw new Error(`Validation error: ${validationErrors}`);
      } else {
        throw new Error(`API error: ${JSON.stringify(lastError.detail)}`);
      }
    }
    throw new Error(`Failed to create user: ${lastError.message || 'Unknown error'}`);
  }

  throw new Error('Failed to create user with fixed_date strategy - all format attempts failed');
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

    // Extract parameters - now supporting CORRECTED parameter names
    const {
      username,
      dataLimitGB,
      durationDays,
      notes,
      panelId,
      enabledProtocols
    } = requestBody;

    console.log('Extracted parameters (with corrected names):', {
      username,
      dataLimitGB,
      durationDays,
      notes: notes ? 'provided' : 'empty',
      panelId,
      enabledProtocols
    });

    // Validate required parameters with corrected parameter names
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

    if (!dataLimitGB || typeof dataLimitGB !== 'number' || dataLimitGB <= 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Valid dataLimitGB is required and must be a positive number' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!durationDays || typeof durationDays !== 'number' || durationDays <= 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Valid durationDays is required and must be a positive number' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!panelId || typeof panelId !== 'string') {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Panel ID is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type':2 'application/json' } 
        }
      );
    }

    // Get panel-specific credentials and configuration
    const { baseUrl, username: panelUsername, password: panelPassword, enabledProtocols: panelProtocols } = await getPanelCredentials(panelId);
    
    // Use provided protocols or fall back to panel's enabled protocols
    console.log('Determining protocols to use:', {
      providedProtocols: enabledProtocols,
      panelProtocols: panelProtocols
    });
    
    const finalProtocols = enabledProtocols && Array.isArray(enabledProtocols) && enabledProtocols.length > 0 
      ? enabledProtocols 
      : panelProtocols;

    console.log('Starting Marzneshin user creation process with panel-specific protocols:', finalProtocols);

    // Get authentication token
    const token = await getAuthToken(baseUrl, panelUsername, panelPassword);
    
    // Get available services
    const services = await getServices(baseUrl, token);
    console.log(`Fetched ${services.length} services from API`);
    
    // Get required service IDs for Pro plan
    const requiredServiceIds = getRequiredServiceIds(services);
    
    if (requiredServiceIds.length === 0) {
      throw new Error('No required services found. Please ensure the Pro plan services are configured in Marzneshin.');
    }

    // Create the user with corrected parameter names and dynamic protocols
    const result = await createMarzneshinUser(
      baseUrl,
      token,
      { 
        username, 
        dataLimitGB, 
        durationDays, 
        notes: notes || '',
        enabledProtocols: finalProtocols
      },
      requiredServiceIds
    );

    console.log('Marzneshin user creation completed successfully with panel-specific protocols');

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
    
    let statusCode = 500;
    if (error.message?.includes('Panel not found')) {
      statusCode = 404;
    } else if (error.message?.includes('already taken')) {
      statusCode = 409;
    }
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to create user' 
      }),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
