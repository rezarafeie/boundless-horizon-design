
const MARZBAN_BASE_URL = 'https://file.shopifysb.xyz:8000';
const MARZBAN_ADMIN_USERNAME = 'bnets';
const MARZBAN_ADMIN_PASSWORD = 'reza1234';
const FIXED_UUID = '70f64bea-a84c-4feb-ac0e-fb796657790f';
const MARZBAN_INBOUND_TAGS = ['VLESSTCP', 'Israel', 'fanland', 'USAC', 'info_protocol', 'Dubai'];

export interface MarzbanUserData {
  username: string;
  dataLimitGB: number;
  durationDays: number;
  notes: string;
}

export interface MarzbanUserResponse {
  username: string;
  subscription_url: string;
  expire: number;
  data_limit: number;
}

export class MarzbanApiService {
  private static async getAuthToken(): Promise<string> {
    const tokenResponse = await fetch(`${MARZBAN_BASE_URL}/api/admin/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: MARZBAN_ADMIN_USERNAME,
        password: MARZBAN_ADMIN_PASSWORD,
        grant_type: 'password'
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to authenticate with Marzban API');
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  }

  static async createUser(userData: MarzbanUserData): Promise<MarzbanUserResponse> {
    console.log('=== MARZBAN API: Creating user ===', userData);
    
    try {
      // Get authentication token
      const accessToken = await this.getAuthToken();
      console.log('MARZBAN API: Authentication successful');

      // Calculate expiration and data limit
      const expireTimestamp = Math.floor(Date.now() / 1000) + (userData.durationDays * 24 * 60 * 60);
      const dataLimitBytes = userData.dataLimitGB * 1073741824; // Convert GB to bytes

      const marzbanUserData = {
        username: userData.username,
        status: 'active',
        expire: expireTimestamp,
        data_limit: dataLimitBytes,
        data_limit_reset_strategy: 'no_reset',
        inbounds: {
          vless: MARZBAN_INBOUND_TAGS
        },
        proxies: {
          vless: {
            id: FIXED_UUID
          }
        },
        note: userData.notes,
        next_plan: {
          add_remaining_traffic: false,
          data_limit: 0,
          expire: 0,
          fire_on_either: true
        }
      };

      console.log('MARZBAN API: Sending user creation request:', marzbanUserData);

      // Create user
      const userResponse = await fetch(`${MARZBAN_BASE_URL}/api/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(marzbanUserData)
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        console.error('MARZBAN API: User creation failed:', errorData);
        throw new Error(errorData.detail || 'Failed to create user in Marzban');
      }

      const responseData = await userResponse.json();
      console.log('MARZBAN API: User creation successful:', responseData);

      // Construct subscription URL (Marzban doesn't provide this directly)
      const subscriptionUrl = `${MARZBAN_BASE_URL}/sub/${userData.username}`;

      const result: MarzbanUserResponse = {
        username: responseData.username || userData.username,
        subscription_url: subscriptionUrl,
        expire: responseData.expire || expireTimestamp,
        data_limit: responseData.data_limit || dataLimitBytes
      };

      console.log('MARZBAN API: Final response:', result);
      return result;

    } catch (error) {
      console.error('MARZBAN API: Error creating user:', error);
      throw error;
    }
  }
}
