
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

      if (error) {
        console.error('USER_CREATION_SERVICE: Edge function error:', error);
        throw new Error(error.message || 'Failed to call user creation service');
      }

      if (!data?.success) {
        console.error('USER_CREATION_SERVICE: Service returned error:', data?.error);
        throw new Error(data?.error || 'User creation service failed');
      }

      console.log('USER_CREATION_SERVICE: User created successfully:', data.data);
      return data;
    } catch (error) {
      console.error('USER_CREATION_SERVICE: Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
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
