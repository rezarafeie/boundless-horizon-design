
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
      // Get the appropriate panel based on panel type
      const { data: panels, error: panelError } = await supabase
        .from('panel_servers')
        .select('*')
        .eq('type', request.panelType)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (panelError || !panels || panels.length === 0) {
        console.error('USER_CREATION_SERVICE: No active panels found for type:', request.panelType);
        throw new Error(`No active ${request.panelType} panels available`);
      }

      // Prefer online panels, but use any active panel if none are online
      let selectedPanel = panels.find(p => p.health_status === 'online');
      if (!selectedPanel) {
        selectedPanel = panels[0];
        console.warn('USER_CREATION_SERVICE: No online panels found, using first available panel');
      }

      console.log('USER_CREATION_SERVICE: Using panel:', {
        id: selectedPanel.id,
        name: selectedPanel.name,
        url: selectedPanel.panel_url,
        type: selectedPanel.type
      });

      // Use the test-panel-connection function for actual user creation
      const { data, error } = await supabase.functions.invoke('test-panel-connection', {
        body: {
          panelId: selectedPanel.id,
          createUser: true,
          userData: {
            username: request.username,
            dataLimitGB: request.dataLimitGB,
            durationDays: request.durationDays,
            notes: request.notes || '',
            panelType: request.panelType,
            subscriptionId: request.subscriptionId,
            isFreeTriaL: request.isFreeTriaL
          }
        }
      });

      console.log('USER_CREATION_SERVICE: Edge function response:', { data, error });

      if (error) {
        console.error('USER_CREATION_SERVICE: Edge function error:', error);
        throw new Error(error.message || 'Failed to call user creation service');
      }

      if (!data || !data.success) {
        console.error('USER_CREATION_SERVICE: Service returned error:', data?.error || 'Unknown error');
        throw new Error(data?.error || 'User creation service failed');
      }

      // Check if user creation was successful
      const userCreation = data.userCreation;
      if (userCreation && userCreation.success) {
        console.log('USER_CREATION_SERVICE: User created successfully:', userCreation);
        
        // Update subscription record if subscription ID is provided
        if (request.subscriptionId && userCreation.subscriptionUrl) {
          console.log('USER_CREATION_SERVICE: Updating subscription record');
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              subscription_url: userCreation.subscriptionUrl,
              marzban_user_created: true,
              expire_at: userCreation.expire ? 
                new Date(userCreation.expire * 1000).toISOString() : 
                new Date(Date.now() + request.durationDays * 24 * 60 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', request.subscriptionId);

          if (updateError) {
            console.error('USER_CREATION_SERVICE: Failed to update subscription:', updateError);
            // Don't throw error here as the user was created successfully
          } else {
            console.log('USER_CREATION_SERVICE: Subscription updated successfully');
          }
        }
        
        return {
          success: true,
          data: {
            username: userCreation.username,
            subscription_url: userCreation.subscriptionUrl,
            expire: userCreation.expire || Math.floor(Date.now() / 1000) + (request.durationDays * 24 * 60 * 60),
            data_limit: request.dataLimitGB * 1073741824, // Convert GB to bytes
            panel_type: selectedPanel.type,
            panel_name: selectedPanel.name,
            panel_id: selectedPanel.id
          }
        };
      } else {
        throw new Error(userCreation?.error || 'User creation failed in panel');
      }
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
