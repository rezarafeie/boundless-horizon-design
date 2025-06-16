
import { MarzneshinInbound, MarzneshinUserRequest, MarzneshinUserResponse } from '@/types/subscription';

const MARZNESHIN_BASE_URL = 'https://p.rain.rest';
const ADMIN_USERNAME = 'bnets';
const ADMIN_PASSWORD = 'reza1234';

// Required service tags for Pro plan
const REQUIRED_SERVICE_TAGS = [
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
      throw new Error('Failed to authenticate with Marzneshin API');
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  }

  private static async getInbounds(token: string): Promise<MarzneshinInbound[]> {
    const response = await fetch(`${MARZNESHIN_BASE_URL}/api/inbounds`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch inbounds from Marzneshin API');
    }

    return response.json();
  }

  private static getServiceIds(inbounds: MarzneshinInbound[]): number[] {
    const serviceIds: number[] = [];
    
    for (const tag of REQUIRED_SERVICE_TAGS) {
      const inbound = inbounds.find(ib => ib.tag === tag);
      if (inbound) {
        serviceIds.push(inbound.id);
      }
    }
    
    return serviceIds;
  }

  static async createUser(userData: {
    username: string;
    dataLimitGB: number;
    durationDays: number;
    notes: string;
  }): Promise<MarzneshinUserResponse> {
    const token = await this.getAuthToken();
    const inbounds = await this.getInbounds(token);
    const serviceIds = this.getServiceIds(inbounds);

    const userRequest: MarzneshinUserRequest = {
      username: userData.username,
      expire_strategy: 'start_on_first_use',
      usage_duration: userData.durationDays * 86400, // Convert days to seconds
      data_limit: userData.dataLimitGB * 1073741824, // Convert GB to bytes
      service_ids: serviceIds,
      note: `Purchased via bnets.co - ${userData.notes}`
    };

    const response = await fetch(`${MARZNESHIN_BASE_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userRequest)
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 409) {
        throw new Error('This username is already taken. Please choose a different one');
      }
      throw new Error(errorData.detail || 'Failed to create user on Marzneshin');
    }

    return response.json();
  }
}
