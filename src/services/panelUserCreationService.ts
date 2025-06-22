
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
    panel_url: string;
  };
  error?: string;
}

export class PanelUserCreationService {
  
  static async createUserFromPanel(request: PanelUserCreationRequest): Promise<PanelUserCreationResponse> {
    console.log('PANEL_USER_CREATION: Starting STRICT plan-to-panel user creation:', request);
    
    try {
      // Step 1: Get plan with its STRICTLY assigned panel - NO FALLBACKS ALLOWED
      console.log('PANEL_USER_CREATION: Looking up plan with STRICT panel binding:', request.planId);
      
      const { data: planConfig, error: planError } = await supabase
        .from('subscription_plans')
        .select(`
          *,
          panel_servers!assigned_panel_id(
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
        `)
        .eq('id', request.planId)
        .eq('is_active', true)
        .single();

      if (planError || !planConfig) {
        console.error('PANEL_USER_CREATION: Plan not found:', planError);
        return {
          success: false,
          error: `Plan not found: ${request.planId}. Error: ${planError?.message || 'Unknown error'}`
        };
      }

      console.log('PANEL_USER_CREATION: Plan loaded with STRICT binding:', {
        planId: planConfig.id,
        planName: planConfig.name_en,
        hasAssignedPanel: !!planConfig.panel_servers,
        assignedPanelId: planConfig.assigned_panel_id
      });

      // Step 2: ABSOLUTE STRICT VALIDATION - Plan MUST have assigned panel, NO EXCEPTIONS
      if (!planConfig.assigned_panel_id || !planConfig.panel_servers) {
        console.error('PANEL_USER_CREATION: STRICT VALIDATION FAILED - No panel assigned to plan');
        return {
          success: false,
          error: `CRITICAL ERROR: Plan "${planConfig.name_en}" has NO assigned panel. This plan cannot create VPN users. Please contact admin to assign a panel to this plan.`
        };
      }

      const panel = planConfig.panel_servers;
      
      // Step 3: STRICT PANEL HEALTH VALIDATION - Panel must be active and healthy
      if (!panel.is_active) {
        console.error('PANEL_USER_CREATION: STRICT VALIDATION FAILED - Assigned panel is not active');
        return {
          success: false,
          error: `PANEL ERROR: The assigned panel "${panel.name}" for plan "${planConfig.name_en}" is currently INACTIVE. VPN creation is not possible. Please contact admin.`
        };
      }

      if (panel.health_status === 'offline') {
        console.error('PANEL_USER_CREATION: STRICT VALIDATION FAILED - Assigned panel is offline');
        return {
          success: false,
          error: `PANEL ERROR: The assigned panel "${panel.name}" for plan "${planConfig.name_en}" is currently OFFLINE. VPN creation is not possible. Please try again later or contact admin.`
        };
      }

      console.log('PANEL_USER_CREATION: Using STRICTLY ASSIGNED panel (NO FALLBACKS):', {
        panelId: panel.id,
        panelName: panel.name,
        panelType: panel.type,
        panelUrl: panel.panel_url,
        healthStatus: panel.health_status,
        isActive: panel.is_active,
        planName: planConfig.name_en
      });

      // Step 4: HEALTH CHECK - Verify panel is reachable before creating user
      console.log('PANEL_USER_CREATION: Performing panel health check before user creation');
      
      try {
        const { data: healthCheck, error: healthError } = await supabase.functions.invoke('test-panel-connection', {
          body: {
            panelId: panel.id,
            createUser: false // Just test connection
          }
        });

        if (healthError || !healthCheck?.success) {
          console.error('PANEL_USER_CREATION: Panel health check FAILED:', healthError || healthCheck?.error);
          return {
            success: false,
            error: `PANEL HEALTH CHECK FAILED: Panel "${panel.name}" (${panel.panel_url}) is not responding. Error: ${healthError?.message || healthCheck?.error || 'Unknown health check error'}`
          };
        }

        console.log('PANEL_USER_CREATION: Panel health check passed');
      } catch (healthCheckError) {
        console.error('PANEL_USER_CREATION: Panel health check threw error:', healthCheckError);
        return {
          success: false,
          error: `PANEL HEALTH CHECK ERROR: Unable to verify panel "${panel.name}" health. Error: ${healthCheckError instanceof Error ? healthCheckError.message : 'Unknown error'}`
        };
      }

      // Step 5: Create user using the STRICTLY ASSIGNED and VERIFIED panel
      console.log('PANEL_USER_CREATION: Creating user via STRICT panel assignment (health verified)');
      
      const userCreationData = {
        username: request.username,
        dataLimitGB: request.dataLimitGB,
        durationDays: request.durationDays,
        notes: request.notes || `Plan: ${planConfig.name_en || planConfig.plan_id}, ${request.isFreeTriaL ? 'Free Trial' : 'Paid Subscription'}`,
        panelType: panel.type,
        subscriptionId: request.subscriptionId,
        isFreeTriaL: request.isFreeTriaL || false
      };

      const { data: creationResult, error: creationError } = await supabase.functions.invoke('test-panel-connection', {
        body: {
          panelId: panel.id, // Use STRICTLY ASSIGNED panel
          createUser: true,
          userData: userCreationData
        }
      });

      console.log('PANEL_USER_CREATION: User creation response from STRICT panel:', { 
        success: creationResult?.success,
        error: creationError || creationResult?.error,
        userCreation: creationResult?.userCreation,
        panelUsed: panel.name,
        panelUrl: panel.panel_url
      });

      if (creationError) {
        console.error('PANEL_USER_CREATION: Edge function error on STRICT panel:', creationError);
        return {
          success: false,
          error: `VPN CREATION FAILED: Panel "${panel.name}" (${panel.panel_url}) connection failed. Error: ${creationError.message}. No fallback panels used - this plan requires this specific panel.`
        };
      }

      if (!creationResult?.success) {
        console.error('PANEL_USER_CREATION: User creation failed on STRICT panel:', creationResult?.error);
        return {
          success: false,
          error: `VPN CREATION FAILED: User creation failed on panel "${panel.name}" (${panel.panel_url}). Error: ${creationResult?.error || 'Unknown creation error'}. No fallback panels used - this plan requires this specific panel.`
        };
      }

      // Step 6: Extract user creation data
      const userCreation = creationResult.userCreation;
      if (!userCreation?.success) {
        console.error('PANEL_USER_CREATION: User creation unsuccessful on STRICT panel:', userCreation?.error);
        return {
          success: false,
          error: `VPN USER CREATION FAILED: ${userCreation?.error || `User creation failed on panel "${panel.name}"`}. No fallback panels used - this plan requires this specific panel.`
        };
      }

      console.log('PANEL_USER_CREATION: User created successfully on STRICT panel:', {
        username: userCreation.username,
        hasSubscriptionUrl: !!userCreation.subscriptionUrl,
        panelUsed: panel.name,
        panelId: panel.id,
        panelUrl: panel.panel_url,
        planName: planConfig.name_en
      });

      // Step 7: Return success response with STRICT panel info
      const responseData = {
        username: userCreation.username,
        subscription_url: userCreation.subscriptionUrl,
        expire: userCreation.expire || Math.floor(Date.now() / 1000) + (request.durationDays * 24 * 60 * 60),
        data_limit: request.dataLimitGB * 1073741824, // Convert GB to bytes
        panel_type: panel.type,
        panel_name: panel.name,
        panel_id: panel.id,
        panel_url: panel.panel_url
      };

      console.log('PANEL_USER_CREATION: STRICT SUCCESS - Returning response:', responseData);
      return {
        success: true,
        data: responseData
      };

    } catch (error) {
      console.error('PANEL_USER_CREATION: Unexpected error in STRICT binding:', error);
      
      let errorMessage = 'Unexpected error occurred during user creation with strict panel assignment';
      if (error instanceof Error) {
        errorMessage = `STRICT PANEL ERROR: ${error.message}`;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Create free trial with STRICT plan-to-panel binding
  static async createFreeTrial(
    username: string, 
    planIdOrUuid: string,  // Can be UUID or plan_id text
    dataLimitGB: number = 1,
    durationDays: number = 1
  ): Promise<PanelUserCreationResponse> {
    console.log('PANEL_USER_CREATION: Creating free trial with STRICT binding:', { username, planIdOrUuid, dataLimitGB, durationDays });
    
    try {
      // Resolve to actual UUID if needed
      let actualPlanId = planIdOrUuid;
      
      // Check if it looks like a UUID (has dashes)
      if (!planIdOrUuid.includes('-')) {
        console.log('PANEL_USER_CREATION: Converting plan name to UUID for STRICT binding:', planIdOrUuid);
        
        const { data: plan, error } = await supabase
          .from('subscription_plans')
          .select('id, name_en')
          .eq('plan_id', planIdOrUuid)
          .eq('is_active', true)
          .single();
          
        if (error || !plan) {
          console.error('PANEL_USER_CREATION: Could not find plan by name for STRICT binding:', planIdOrUuid, error);
          return {
            success: false,
            error: `Plan "${planIdOrUuid}" not found or inactive. Cannot create free trial without valid plan.`
          };
        }
        
        actualPlanId = plan.id;
        console.log('PANEL_USER_CREATION: Resolved plan name to UUID for STRICT binding:', { name: planIdOrUuid, uuid: actualPlanId, planName: plan.name_en });
      }
      
      // Use STRICT plan-to-panel binding
      return this.createUserFromPanel({
        planId: actualPlanId,
        username,
        dataLimitGB,
        durationDays,
        notes: `Free Trial - Plan: ${planIdOrUuid}`,
        isFreeTriaL: true
      });
    } catch (error) {
      console.error('PANEL_USER_CREATION: Error in createFreeTrial with STRICT binding:', error);
      return {
        success: false,
        error: error instanceof Error ? `Free trial creation failed: ${error.message}` : 'Unknown error in free trial creation'
      };
    }
  }

  // Create paid subscription with STRICT plan-to-panel binding
  static async createPaidSubscription(
    username: string,
    planIdOrUuid: string,  // Can be UUID or plan_id text
    dataLimitGB: number,
    durationDays: number,
    subscriptionId: string,
    notes?: string
  ): Promise<PanelUserCreationResponse> {
    console.log('PANEL_USER_CREATION: Creating paid subscription with STRICT binding:', { 
      username, planIdOrUuid, dataLimitGB, durationDays, subscriptionId
    });
    
    try {
      // Resolve to actual UUID if needed
      let actualPlanId = planIdOrUuid;
      
      // Check if it looks like a UUID (has dashes)
      if (!planIdOrUuid.includes('-')) {
        console.log('PANEL_USER_CREATION: Converting plan name to UUID for STRICT binding:', planIdOrUuid);
        
        const { data: plan, error } = await supabase
          .from('subscription_plans')
          .select('id, name_en')
          .eq('plan_id', planIdOrUuid)
          .eq('is_active', true)
          .single();
          
        if (error || !plan) {
          console.error('PANEL_USER_CREATION: Could not find plan by name for STRICT binding:', planIdOrUuid, error);
          return {
            success: false,
            error: `Plan "${planIdOrUuid}" not found or inactive. Cannot create paid subscription without valid plan.`
          };
        }
        
        actualPlanId = plan.id;
        console.log('PANEL_USER_CREATION: Resolved plan name to UUID for STRICT binding:', { name: planIdOrUuid, uuid: actualPlanId, planName: plan.name_en });
      }
      
      // Use STRICT plan-to-panel binding
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
      console.error('PANEL_USER_CREATION: Error in createPaidSubscription with STRICT binding:', error);
      return {
        success: false,
        error: error instanceof Error ? `Paid subscription creation failed: ${error.message}` : 'Unknown error in paid subscription creation'
      };
    }
  }
}
