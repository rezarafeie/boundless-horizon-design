
import { MarzneshinInbound, MarzneshinService, MarzneshinServiceRequest, MarzneshinUserRequest, MarzneshinUserResponse } from '@/types/subscription';

const MARZNESHIN_BASE_URL = 'https://p.rain.rest';
const ADMIN_USERNAME = 'bnets';
const ADMIN_PASSWORD = 'reza1234';
const PRO_SERVICE_NAME = 'Pro Plan';

// Required inbound tags for Pro plan
const REQUIRED_INBOUND_TAGS = [
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

export class MarzneshinApiService {
  private static async getAuthToken(): Promise<string> {
    const tokenResponse = await fetch(`${MARZNESHIN_BASE_URL}/api/admins/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
        grant_type: 'password'
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Failed to authenticate with Marzneshin API: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  }

  private static async getServices(token: string): Promise<MarzneshinService[]> {
    const response = await fetch(`${MARZNESHIN_BASE_URL}/api/services`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch services from Marzneshin API: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  private static async getInbounds(token: string): Promise<MarzneshinInbound[]> {
    try {
      const response = await fetch(`${MARZNESHIN_BASE_URL}/api/inbounds`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // If we can't access inbounds, we'll use predefined IDs
        console.warn(`Cannot access inbounds API (${response.status}), using fallback strategy`);
        return [];
      }

      return response.json();
    } catch (error) {
      console.warn('Error fetching inbounds, using fallback strategy:', error);
      return [];
    }
  }

  private static async createProService(token: string): Promise<number> {
    // First try to get inbounds to find the correct IDs
    const inbounds = await this.getInbounds(token);
    
    let inboundIds: number[] = [];
    
    if (inbounds.length > 0) {
      // Map required tags to inbound IDs
      for (const tag of REQUIRED_INBOUND_TAGS) {
        const inbound = inbounds.find(ib => ib.tag === tag);
        if (inbound) {
          inboundIds.push(inbound.id);
        }
      }
    }
    
    // If we couldn't get inbounds or found no matching tags, use fallback IDs
    if (inboundIds.length === 0) {
      console.warn('No inbounds found matching required tags, using fallback IDs');
      // Use sequential IDs starting from 1 as fallback
      inboundIds = Array.from({ length: REQUIRED_INBOUND_TAGS.length }, (_, i) => i + 1);
    }

    const serviceRequest: MarzneshinServiceRequest = {
      name: PRO_SERVICE_NAME,
      inbound_ids: inboundIds
    };

    const response = await fetch(`${MARZNESHIN_BASE_URL}/api/services`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(serviceRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create Pro service: ${response.status} ${errorText}`);
    }

    const createdService = await response.json();
    return createdService.id;
  }

  private static async getOrCreateProService(token: string): Promise<number> {
    // Check if Pro Plan service already exists
    const services = await this.getServices(token);
    const existingProService = services.find(service => service.name === PRO_SERVICE_NAME);
    
    if (existingProService) {
      console.log(`Found existing Pro service with ID: ${existingProService.id}`);
      return existingProService.id;
    }
    
    // Create new Pro service if it doesn't exist
    console.log('Creating new Pro service...');
    return await this.createProService(token);
  }

  static async createUser(userData: {
    username: string;
    dataLimitGB: number;
    durationDays: number;
    notes: string;
  }): Promise<MarzneshinUserResponse> {
    try {
      const token = await this.getAuthToken();
      console.log('Successfully obtained auth token');
      
      const serviceId = await this.getOrCreateProService(token);
      console.log(`Using service ID: ${serviceId}`);

      const userRequest: MarzneshinUserRequest = {
        username: userData.username,
        expire_strategy: 'start_on_first_use',
        usage_duration: userData.durationDays * 86400, // Convert days to seconds
        data_limit: userData.dataLimitGB * 1073741824, // Convert GB to bytes
        service_ids: [serviceId],
        note: `Purchased via bnets.co - ${userData.notes}`
      };

      console.log('Creating user with request:', userRequest);

      const response = await fetch(`${MARZNESHIN_BASE_URL}/api/users`, {
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
      
    } catch (error) {
      console.error('Marzneshin API Error:', error);
      throw error;
    }
  }
}
