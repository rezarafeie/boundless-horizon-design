
import { supabase } from '@/integrations/supabase/client';

export interface CreateUserRequest {
  username: string;
  dataLimitGB: number;
  durationDays: number;
  notes?: string;
  panelType: 'marzban' | 'marzneshin';
  subscriptionId?: string;
  isFreeTriaL?: boolean;
}

export interface CreateUserResponse {
  success: boolean;
  data?: {
    username: string;
    subscription_url: string;
    expire: number;
    data_limit: number;
    panel_type: string;
    panel_name: string;
    panel_id?: string;
  };
  error?: string;
}

export class UserCreationService {
  static async createUser(request: CreateUserRequest): Promise<CreateUserResponse> {
    console.log('USER_CREATION_SERVICE: Creating user with request:', request);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-user-direct', {
        body: request
      });

      console.log('USER_CREATION_SERVICE: Edge function response:', { data, error });

      if (error) {
        console.error('USER_CREATION_SERVICE: Edge function error:', error);
        throw new Error(error.message || 'Failed to call user creation service');
      }

      if (!data) {
        console.error('USER_CREATION_SERVICE: No data returned from edge function');
        throw new Error('No response data from user creation service');
      }

      if (!data.success) {
        console.error('USER_CREATION_SERVICE: Service returned error:', data.error);
        throw new Error(data.error || 'User creation service failed');
      }

      console.log('USER_CREATION_SERVICE: User created successfully:', data.data);
      return data;
    } catch (error) {
      console.error('USER_CREATION_SERVICE: Error:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Check for specific error types and provide better messages
      if (errorMessage.includes('Panel configuration')) {
        errorMessage = 'VPN panel configuration error. Please contact support.';
      } else if (errorMessage.includes('Authentication failed')) {
        errorMessage = 'VPN panel authentication failed. Please contact support.';
      } else if (errorMessage.includes('Cannot connect')) {
        errorMessage = 'Cannot connect to VPN panel. Please try again later.';
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'Connection timeout. Please try again.';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  static async createFreeTrial(
    username: string, 
    planType: 'lite' | 'pro',
    dataLimitGB: number = 1,
    durationDays: number = 1
  ): Promise<CreateUserResponse> {
    console.log('USER_CREATION_SERVICE: Creating free trial:', { username, planType, dataLimitGB, durationDays });
    
    const panelType = planType === 'lite' ? 'marzban' : 'marzneshin';
    
    return this.createUser({
      username,
      dataLimitGB,
      durationDays,
      notes: `Free Trial - ${planType} plan`,
      panelType,
      isFreeTriaL: true
    });
  }

  static async createSubscription(
    username: string,
    dataLimitGB: number,
    durationDays: number,
    panelType: 'marzban' | 'marzneshin',
    subscriptionId: string,
    notes?: string
  ): Promise<CreateUserResponse> {
    console.log('USER_CREATION_SERVICE: Creating subscription:', { 
      username, dataLimitGB, durationDays, panelType, subscriptionId 
    });
    
    return this.createUser({
      username,
      dataLimitGB,
      durationDays,
      notes,
      panelType,
      subscriptionId,
      isFreeTriaL: false
    });
  }
}
