
import { supabase } from '@/integrations/supabase/client';

export interface PanelUserCreationRequest {
  planId: string;
  username: string;
  dataLimitGB: number;
  durationDays: number;
  notes?: string;
  subscriptionId?: string;
  isFreeTriaL?: boolean;
}

export interface PanelUserCreationResponse {
  success: boolean;
  data?: {
    username: string;
    subscription_url: string;
    expire: number;
    data_limit: number;
    panel_type: string;
    panel_name: string;
    panel_id: string;
  };
  error?: string;
}

export class PanelUserCreationService {
  
  static async createUserFromPanel(request: PanelUserCreationRequest): Promise<PanelUserCreationResponse> {
    console.log('PANEL_USER_CREATION: Starting user creation with request:', request);
    
    try {
      // Step 1: Get plan configuration with panel mappings - FIXED QUERY
      const { data: planConfig, error: planError } = await supabase
        .from('subscription_plans')
        .select(`
          *,
          plan_panel_mappings!inner(
            panel_id,
            is_primary,
            inbound_ids,
            panel_servers!inner(
              id,
              name,
              panel_url,
              type,
              username,
              password,
              is_active,
              health_status,
              enabled_protocols,
              default_inbounds
            )
          )
        `)
        .eq('id', request.planId)
        .eq('is_active', true)
        .eq('plan_panel_mappings.panel_servers.is_active', true)
        .eq('plan_panel_mappings.panel_servers.type', 'marzban')
        .single();

      if (planError || !planConfig) {
        console.error('PANEL_USER_CREATION: Plan not found:', planError);
        return {
          success: false,
          error: `Plan configuration not found. Error: ${planError?.message || 'Unknown error'}`
        };
      }

      console.log('PANEL_USER_CREATION: Plan config loaded:', {
        planId: planConfig.id,
        panelMappings: planConfig.plan_panel_mappings?.length || 0
      });

      // Step 2: Select the appropriate panel (prefer primary, fallback to first available)
      const panelMappings = planConfig.plan_panel_mappings || [];
      if (panelMappings.length === 0) {
        console.error('PANEL_USER_CREATION: No panels configured for plan');
        return {
          success: false,
          error: 'No marzban panels configured for this plan. Please contact support.'
        };
      }

      // Find primary panel or use first available
      let selectedMapping = panelMappings.find(mapping => mapping.is_primary);
      if (!selectedMapping) {
        selectedMapping = panelMappings[0];
      }

      const panel = selectedMapping.panel_servers;
      console.log('PANEL_USER_CREATION: Selected panel:', {
        id: panel.id,
        name: panel.name,
        type: panel.type,
        url: panel.panel_url,
        healthStatus: panel.health_status,
        isActive: panel.is_active
      });

      // Step 3: Create user using the test-panel-connection function with ALL required data
      console.log('PANEL_USER_CREATION: Creating user via test-panel-connection function');
      
      const userCreationData = {
        username: request.username,
        dataLimitGB: request.dataLimitGB,
        durationDays: request.durationDays,
        notes: request.notes || `Plan: ${planConfig.name_en || planConfig.plan_id}, ${request.isFreeTriaL ? 'Free Trial' : 'Paid Subscription'}`,
        panelType: 'marzban',
        subscriptionId: request.subscriptionId,
        isFreeTriaL: request.isFreeTriaL || false
      };

      const { data: creationResult, error: creationError } = await supabase.functions.invoke('test-panel-connection', {
        body: {
          panelId: panel.id,
          createUser: true,
          userData: userCreationData
        }
      });

      console.log('PANEL_USER_CREATION: User creation response:', { 
        success: creationResult?.success,
        error: creationError || creationResult?.error,
        userCreation: creationResult?.userCreation
      });

      if (creationError) {
        console.error('PANEL_USER_CREATION: Edge function error:', creationError);
        return {
          success: false,
          error: `Panel connection failed: ${creationError.message}`
        };
      }

      if (!creationResult?.success) {
        console.error('PANEL_USER_CREATION: User creation failed:', creationResult?.error);
        return {
          success: false,
          error: creationResult?.error || 'User creation failed on panel'
        };
      }

      // Step 4: Extract user creation data
      const userCreation = creationResult.userCreation;
      if (!userCreation?.success) {
        console.error('PANEL_USER_CREATION: User creation unsuccessful:', userCreation?.error);
        return {
          success: false,
          error: userCreation?.error || 'User creation failed'
        };
      }

      console.log('PANEL_USER_CREATION: User created successfully:', {
        username: userCreation.username,
        hasSubscriptionUrl: !!userCreation.subscriptionUrl
      });

      // Step 5: Return success response IMMEDIATELY
      const responseData = {
        username: userCreation.username,
        subscription_url: userCreation.subscriptionUrl,
        expire: userCreation.expire || Math.floor(Date.now() / 1000) + (request.durationDays * 24 * 60 * 60),
        data_limit: request.dataLimitGB * 1073741824, // Convert GB to bytes
        panel_type: panel.type,
        panel_name: panel.name,
        panel_id: panel.id
      };

      console.log('PANEL_USER_CREATION: Returning success response:', responseData);
      return {
        success: true,
        data: responseData
      };

    } catch (error) {
      console.error('PANEL_USER_CREATION: Unexpected error:', error);
      
      let errorMessage = 'Unexpected error occurred during user creation';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Create free trial using admin panel configuration
  static async createFreeTrial(
    username: string, 
    planId: string,
    dataLimitGB: number = 1,
    durationDays: number = 1
  ): Promise<PanelUserCreationResponse> {
    console.log('PANEL_USER_CREATION: Creating free trial:', { username, planId, dataLimitGB, durationDays });
    
    return this.createUserFromPanel({
      planId,
      username,
      dataLimitGB,
      durationDays,
      notes: `Free Trial - Plan: ${planId}`,
      isFreeTriaL: true
    });
  }

  // Create paid subscription using admin panel configuration
  static async createPaidSubscription(
    username: string,
    planId: string,
    dataLimitGB: number,
    durationDays: number,
    subscriptionId: string,
    notes?: string
  ): Promise<PanelUserCreationResponse> {
    console.log('PANEL_USER_CREATION: Creating paid subscription:', { 
      username, planId, dataLimitGB, durationDays, subscriptionId
    });
    
    return this.createUserFromPanel({
      planId,
      username,
      dataLimitGB,
      durationDays,
      notes,
      subscriptionId,
      isFreeTriaL: false
    });
  }
}
