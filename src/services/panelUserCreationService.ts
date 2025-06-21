
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
      // Step 1: Get plan configuration with panel mappings - FIXED TO USE ACTUAL UUID
      console.log('PANEL_USER_CREATION: Looking up plan by ID:', request.planId);
      
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
        .eq('id', request.planId)  // Use actual UUID ID, not plan_id text field
        .eq('is_active', true)
        .eq('plan_panel_mappings.panel_servers.is_active', true)
        .eq('plan_panel_mappings.panel_servers.type', 'marzban')
        .single();

      if (planError || !planConfig) {
        console.error('PANEL_USER_CREATION: Plan not found by UUID, trying by plan_id:', planError);
        
        // Fallback: try to find by plan_id field if UUID lookup fails
        const { data: fallbackPlan, error: fallbackError } = await supabase
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
          .eq('plan_id', request.planId)  // Try text field
          .eq('is_active', true)
          .eq('plan_panel_mappings.panel_servers.is_active', true)
          .eq('plan_panel_mappings.panel_servers.type', 'marzban')
          .single();
          
        if (fallbackError || !fallbackPlan) {
          console.error('PANEL_USER_CREATION: Plan not found by plan_id either:', fallbackError);
          return {
            success: false,
            error: `Plan not found: ${request.planId}. Error: ${planError?.message || fallbackError?.message || 'Unknown error'}`
          };
        }
        
        // Use fallback plan
        Object.assign(planConfig, fallbackPlan);
      }

      console.log('PANEL_USER_CREATION: Plan config loaded:', {
        planId: planConfig.id,
        planName: planConfig.name_en,
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

  // Create free trial using admin panel configuration - FIXED to get actual plan UUIDs
  static async createFreeTrial(
    username: string, 
    planIdOrName: string,  // Can be UUID or plan name like "lite"
    dataLimitGB: number = 1,
    durationDays: number = 1
  ): Promise<PanelUserCreationResponse> {
    console.log('PANEL_USER_CREATION: Creating free trial:', { username, planIdOrName, dataLimitGB, durationDays });
    
    try {
      // First, try to resolve the plan ID if it's a name
      let actualPlanId = planIdOrName;
      
      // Check if it looks like a UUID (has dashes)
      if (!planIdOrName.includes('-')) {
        console.log('PANEL_USER_CREATION: Converting plan name to UUID:', planIdOrName);
        
        const { data: plan, error } = await supabase
          .from('subscription_plans')
          .select('id')
          .eq('plan_id', planIdOrName)  // Look up by plan_id field
          .eq('is_active', true)
          .single();
          
        if (error || !plan) {
          console.error('PANEL_USER_CREATION: Could not find plan by name:', planIdOrName, error);
          return {
            success: false,
            error: `Plan "${planIdOrName}" not found or inactive`
          };
        }
        
        actualPlanId = plan.id;
        console.log('PANEL_USER_CREATION: Resolved plan name to UUID:', { name: planIdOrName, uuid: actualPlanId });
      }
      
      return this.createUserFromPanel({
        planId: actualPlanId,
        username,
        dataLimitGB,
        durationDays,
        notes: `Free Trial - Plan: ${planIdOrName}`,
        isFreeTriaL: true
      });
    } catch (error) {
      console.error('PANEL_USER_CREATION: Error in createFreeTrial:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in free trial creation'
      };
    }
  }

  // Create paid subscription using admin panel configuration - FIXED to get actual plan UUIDs
  static async createPaidSubscription(
    username: string,
    planIdOrName: string,  // Can be UUID or plan name
    dataLimitGB: number,
    durationDays: number,
    subscriptionId: string,
    notes?: string
  ): Promise<PanelUserCreationResponse> {
    console.log('PANEL_USER_CREATION: Creating paid subscription:', { 
      username, planIdOrName, dataLimitGB, durationDays, subscriptionId
    });
    
    try {
      // First, try to resolve the plan ID if it's a name
      let actualPlanId = planIdOrName;
      
      // Check if it looks like a UUID (has dashes)
      if (!planIdOrName.includes('-')) {
        console.log('PANEL_USER_CREATION: Converting plan name to UUID:', planIdOrName);
        
        const { data: plan, error } = await supabase
          .from('subscription_plans')
          .select('id')
          .eq('plan_id', planIdOrName)  // Look up by plan_id field
          .eq('is_active', true)
          .single();
          
        if (error || !plan) {
          console.error('PANEL_USER_CREATION: Could not find plan by name:', planIdOrName, error);
          return {
            success: false,
            error: `Plan "${planIdOrName}" not found or inactive`
          };
        }
        
        actualPlanId = plan.id;
        console.log('PANEL_USER_CREATION: Resolved plan name to UUID:', { name: planIdOrName, uuid: actualPlanId });
      }
      
      return this.createUserFromPanel({
        planId: actualPlanId,
        username,
        dataLimitGB,
        durationDays,
        notes,
        subscriptionId,
        isFreeTriaL: false
      });
    } catch (error) {
      console.error('PANEL_USER_CREATION: Error in createPaidSubscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in paid subscription creation'
      };
    }
  }
}
