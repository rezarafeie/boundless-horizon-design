
import { supabase } from '@/integrations/supabase/client';

export interface CreateUserRequest {
  username: string;
  dataLimitGB: number;
  durationDays: number;
  notes?: string;
  panelType: 'marzban';
  subscriptionId?: string;
  isFreeTriaL?: boolean;
  selectedPlanId?: string;
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
      // Validate plan-to-panel mapping (now all should be marzban)
      if (request.selectedPlanId) {
        const correctPanelType = await this.validatePlanPanelMapping(request.selectedPlanId, 'marzban');
        if (!correctPanelType) {
          console.error('USER_CREATION_SERVICE: Plan-panel mismatch detected', {
            planId: request.selectedPlanId,
            requestedPanel: 'marzban'
          });
          throw new Error(`Plan-panel mismatch: ${request.selectedPlanId} should use marzban panel`);
        }
      }

      // Get active Marzban panels
      const { data: panels, error: panelError } = await supabase
        .from('panel_servers')
        .select('*')
        .eq('type', 'marzban')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (panelError || !panels || panels.length === 0) {
        console.error('USER_CREATION_SERVICE: No active Marzban panels found');
        throw new Error('No active Marzban panels available');
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

      // Use the test-panel-connection function for user creation (exactly as it works in tests)
      const { data, error } = await supabase.functions.invoke('test-panel-connection', {
        body: {
          panelId: selectedPanel.id,
          createUser: true,
          userData: {
            username: request.username,
            dataLimitGB: request.dataLimitGB,
            durationDays: request.durationDays,
            notes: request.notes || '',
            panelType: 'marzban',
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
        
        // Validate subscription URL contains correct username and data limit
        if (userCreation.subscriptionUrl) {
          const urlValidation = this.validateSubscriptionUrl(
            userCreation.subscriptionUrl, 
            request.username, 
            request.dataLimitGB
          );
          if (!urlValidation.isValid) {
            console.warn('USER_CREATION_SERVICE: Subscription URL validation warning:', urlValidation.warnings);
          }
        }
        
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
      } else if (errorMessage.includes('Plan-panel mismatch')) {
        errorMessage = 'Configuration error: Selected plan should use Marzban panel. Please contact support.';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Validate plan-to-panel mapping (now all should be marzban)
  static async validatePlanPanelMapping(planId: string, requestedPanelType: string): Promise<boolean> {
    try {
      console.log('USER_CREATION_SERVICE: Validating plan-panel mapping', { planId, requestedPanelType });
      
      // Get plan configuration
      const { data: plan, error } = await supabase
        .from('subscription_plans')
        .select('api_type, plan_id')
        .or(`id.eq.${planId},plan_id.eq.${planId}`)
        .single();

      if (error || !plan) {
        console.warn('USER_CREATION_SERVICE: Plan not found for validation:', planId);
        return true; // Allow if we can't validate
      }

      // All plans should now be marzban
      const expectedPanelType = 'marzban';
      const isValid = expectedPanelType === requestedPanelType;
      
      console.log('USER_CREATION_SERVICE: Plan-panel validation result:', {
        planId,
        expectedPanelType,
        requestedPanelType,
        isValid
      });

      return isValid;
    } catch (error) {
      console.error('USER_CREATION_SERVICE: Error validating plan-panel mapping:', error);
      return true; // Allow if validation fails
    }
  }

  // Validate subscription URL contains correct information
  static validateSubscriptionUrl(url: string, expectedUsername: string, expectedDataLimitGB: number): {
    isValid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    
    try {
      // Check if URL contains the username
      if (!url.includes(expectedUsername)) {
        warnings.push(`Subscription URL does not contain expected username: ${expectedUsername}`);
      }
      
      return {
        isValid: warnings.length === 0,
        warnings
      };
    } catch (error) {
      warnings.push('Failed to validate subscription URL structure');
      return {
        isValid: false,
        warnings
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
    
    // All plans now use marzban
    const panelType = 'marzban';
    
    return this.createUser({
      username,
      dataLimitGB,
      durationDays,
      notes: `Free Trial - ${planType} plan`,
      panelType,
      isFreeTriaL: true,
      selectedPlanId: planType
    });
  }

  static async createSubscription(
    username: string,
    dataLimitGB: number,
    durationDays: number,
    panelType: 'marzban',
    subscriptionId: string,
    notes?: string,
    selectedPlanId?: string
  ): Promise<CreateUserResponse> {
    console.log('USER_CREATION_SERVICE: Creating subscription:', { 
      username, dataLimitGB, durationDays, panelType, subscriptionId, selectedPlanId
    });
    
    return this.createUser({
      username,
      dataLimitGB,
      durationDays,
      notes,
      panelType: 'marzban', // Force marzban
      subscriptionId,
      isFreeTriaL: false,
      selectedPlanId
    });
  }
}
