
// This file is now deprecated and should not be used directly from frontend components.
// All Marzban operations should go through the marzban-create-user edge function
// to ensure proper security, environment variables, and avoid CORS issues.

// The MarzbanApiService has been replaced by edge function calls:
// - For free trials: Use supabase.functions.invoke('marzban-create-user')
// - For purchases: Use supabase.functions.invoke('marzban-create-user')
// 
// This ensures:
// 1. Proper security with environment variables stored in Supabase secrets
// 2. No CORS issues
// 3. Consistent authentication flow
// 4. Better error handling and logging

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

// DEPRECATED: Use edge functions instead
export class MarzbanApiService {
  static async createUser(userData: MarzbanUserData): Promise<MarzbanUserResponse> {
    throw new Error('MarzbanApiService is deprecated. Use supabase.functions.invoke("marzban-create-user") instead.');
  }
}
