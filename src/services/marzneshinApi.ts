
import { MarzneshinService, MarzneshinServicesResponse, MarzneshinUserRequest, MarzneshinUserResponse } from '@/types/subscription';

const MARZNESHIN_BASE_URL = 'https://p.rain.rest';
const ADMIN_USERNAME = 'bnets';
const ADMIN_PASSWORD = 'reza1234';

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

    const data: MarzneshinServicesResponse = await response.json();
    console.log('Services response:', data);
    
    // Return the items array from the paginated response
    return data.items || [];
  }

  private static getRequiredServiceIds(services: MarzneshinService[]): number[] {
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

  static async createUser(userData: {
    username: string;
    dataLimitGB: number;
    durationDays: number;
    notes: string;
  }): Promise<MarzneshinUserResponse> {
    try {
      const token = await this.getAuthToken();
      console.log('Successfully obtained auth token');
      
      const services = await this.getServices(token);
      console.log(`Fetched ${services.length} services from API`);
      
      const requiredServiceIds = this.getRequiredServiceIds(services);
      
      if (requiredServiceIds.length === 0) {
        throw new Error('No required services found. Please ensure the Pro plan services are configured in Marzneshin.');
      }

      const userRequest: MarzneshinUserRequest = {
        username: userData.username,
        expire_strategy: 'start_on_first_use',
        usage_duration: userData.durationDays * 86400, // Convert days to seconds
        data_limit: userData.dataLimitGB * 1073741824, // Convert GB to bytes
        service_ids: requiredServiceIds,
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
