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
    console.log('🔵 PANEL_USER_CREATION: Starting STRICT plan-to-panel user creation:', request);
    
    try {
      // Step 1: Get plan with its STRICTLY assigned panel - NO FALLBACKS ALLOWED
      console.log('🔵 PANEL_USER_CREATION: Looking up plan with STRICT panel binding:', request.planId);
      
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
        console.error('❌ PANEL_USER_CREATION: Plan not found:', planError);
        console.error('❌ PANEL_USER_CREATION: Plan lookup details:', {
          requestedPlanId: request.planId,
          planError,
          subscriptionId: request.subscriptionId
        });
        return {
          success: false,
          error: `Plan not found: ${request.planId}. Error: ${planError?.message || 'Unknown error'}`
        };
      }

      console.log('🔵 PANEL_USER_CREATION: Plan loaded with STRICT binding:', {
        planId: planConfig.id,
        planName: planConfig.name_en,
        planIdentifier: planConfig.plan_id,
        hasAssignedPanel: !!planConfig.panel_servers,
        assignedPanelId: planConfig.assigned_panel_id,
        subscriptionId: request.subscriptionId
      });

      // Step 2: ABSOLUTE STRICT VALIDATION - Plan MUST have assigned panel, NO EXCEPTIONS
      if (!planConfig.assigned_panel_id || !planConfig.panel_servers) {
        console.error('❌ PANEL_USER_CREATION: STRICT VALIDATION FAILED - No panel assigned to plan');
        console.error('❌ PANEL_USER_CREATION: Plan assignment details:', {
          planId: planConfig.id,
          planName: planConfig.name_en,
          assignedPanelId: planConfig.assigned_panel_id,
          hasPanelServers: !!planConfig.panel_servers,
          subscriptionId: request.subscriptionId
        });
        return {
          success: false,
          error: `CRITICAL ERROR: Plan "${planConfig.name_en}" has NO assigned panel. This plan cannot create VPN users. Please contact admin to assign a panel to this plan.`
        };
      }

      const panel = planConfig.panel_servers;
      
      // Step 3: STRICT PANEL HEALTH VALIDATION - Panel must be active and healthy
      if (!panel.is_active) {
        console.error('❌ PANEL_USER_CREATION: STRICT VALIDATION FAILED - Assigned panel is not active');
        console.error('❌ PANEL_USER_CREATION: Panel status details:', {
          panelId: panel.id,
          panelName: panel.name,
          isActive: panel.is_active,
          healthStatus: panel.health_status,
          subscriptionId: request.subscriptionId
        });
        return {
          success: false,
          error: `PANEL ERROR: The assigned panel "${panel.name}" for plan "${planConfig.name_en}" is currently INACTIVE. VPN creation is not possible. Please contact admin.`
        };
      }

      if (panel.health_status === 'offline') {
        console.error('❌ PANEL_USER_CREATION: STRICT VALIDATION FAILED - Assigned panel is offline');
        console.error('❌ PANEL_USER_CREATION: Panel health details:', {
          panelId: panel.id,
          panelName: panel.name,
          healthStatus: panel.health_status,
          isActive: panel.is_active,
          subscriptionId: request.subscriptionId
        });
        return {
          success: false,
          error: `PANEL ERROR: The assigned panel "${panel.name}" for plan "${planConfig.name_en}" is currently OFFLINE. VPN creation is not possible. Please try again later or contact admin.`
        };
      }

      // NEW: STRICT INBOUND VALIDATION - Panel must have configured inbounds for Marzneshin
      if (panel.type === 'marzneshin') {
        // Type-safe check for default_inbounds
        const defaultInbounds = panel.default_inbounds;
        const isValidInboundsArray = Array.isArray(defaultInbounds) && defaultInbounds.length > 0;
        
        if (!isValidInboundsArray) {
          console.error('❌ PANEL_USER_CREATION: STRICT VALIDATION FAILED - Marzneshin panel has no default inbounds');
          console.error('❌ PANEL_USER_CREATION: Inbounds validation details:', {
            panelId: panel.id,
            panelName: panel.name,
            panelType: panel.type,
            defaultInbounds,
            defaultInboundsType: typeof defaultInbounds,
            isArray: Array.isArray(defaultInbounds),
            subscriptionId: request.subscriptionId
          });
          return {
            success: false,
            error: `PANEL ERROR: Marzneshin panel "${panel.name}" has no inbound configurations. Please refresh the panel configuration first to detect available inbounds.`
          };
        }
        console.log('🟢 PANEL_USER_CREATION: Marzneshin panel has configured inbounds:', defaultInbounds);
      }

      // ✅ CRITICAL FIX: Log the exact panel being used to verify correct routing
      console.log('🟢 PANEL_USER_CREATION: Using STRICTLY ASSIGNED panel (NO FALLBACKS):', {
        planIdentifier: planConfig.plan_id,
        planName: planConfig.name_en,
        panelId: panel.id,
        panelName: panel.name,
        panelType: panel.type,
        panelUrl: panel.panel_url,
        healthStatus: panel.health_status,
        isActive: panel.is_active,
        expectedDomain: panel.panel_url.includes('cp.rain.rest') ? 'cp.rain.rest (Plus)' : 'file.shopifysb.xyz (Lite)',
        hasDefaultInbounds: panel.type === 'marzneshin' ? (Array.isArray(panel.default_inbounds) ? panel.default_inbounds.length : 0) : 'N/A',
        subscriptionId: request.subscriptionId
      });

      // Step 4: CRITICAL FIX - Call the CORRECT edge function based on panel type
      console.log('🔵 PANEL_USER_CREATION: Determining correct edge function for panel type:', panel.type);
      
      let edgeFunctionName: string;
      const userCreationData = {
        username: request.username,
        dataLimitGB: request.dataLimitGB,
        durationDays: request.durationDays,
        notes: request.notes || `Plan: ${planConfig.name_en || planConfig.plan_id}, ${request.isFreeTriaL ? 'Free Trial' : 'Paid Subscription'}`,
        panelId: panel.id, // ✅ CRITICAL: Pass the exact panel ID to ensure correct API usage
        enabledProtocols: panel.enabled_protocols,
        subscriptionId: request.subscriptionId // ✅ NEW: Pass subscription ID for logging
      };

      // FIXED: Route to correct edge function based on panel type
      if (panel.type === 'marzban') {
        edgeFunctionName = 'marzban-create-user';
        console.log('🟢 PANEL_USER_CREATION: Using MARZBAN edge function for Marzban panel');
      } else if (panel.type === 'marzneshin') {
        edgeFunctionName = 'marzneshin-create-user';  
        console.log('🟢 PANEL_USER_CREATION: Using MARZNESHIN edge function for Marzneshin panel');
      } else {
        console.error('❌ PANEL_USER_CREATION: Unsupported panel type:', panel.type);
        console.error('❌ PANEL_USER_CREATION: Panel type details:', {
          panelId: panel.id,
          panelName: panel.name,
          panelType: panel.type,
          subscriptionId: request.subscriptionId
        });
        return {
          success: false,
          error: `PANEL ERROR: Unsupported panel type "${panel.type}" for panel "${panel.name}". Only Marzban and Marzneshin are supported.`
        };
      }

      // ✅ CRITICAL LOG: Log the exact API call being made
      console.log(`🔵 PANEL_USER_CREATION: About to call ${edgeFunctionName} with:`, {
        edgeFunction: edgeFunctionName,
        targetPanelId: panel.id,
        targetPanelUrl: panel.panel_url,
        targetPanelName: panel.name,
        planType: planConfig.plan_id,
        userCreationData,
        subscriptionId: request.subscriptionId
      });

      // Step 5: Create user using the CORRECTLY ROUTED edge function with EXACT panel ID
      console.log(`🔵 PANEL_USER_CREATION: Calling ${edgeFunctionName} for ${panel.type} panel at ${panel.panel_url}`);
      
      const { data: creationResult, error: creationError } = await supabase.functions.invoke(edgeFunctionName, {
        body: userCreationData
      });

      console.log(`🔵 PANEL_USER_CREATION: ${edgeFunctionName} response:`, { 
        success: creationResult?.success,
        error: creationError || creationResult?.error,
        panelUsed: panel.name,
        panelUrl: panel.panel_url,
        panelType: panel.type,
        subscriptionId: request.subscriptionId,
        responseData: creationResult?.data ? {
          username: creationResult.data.username,
          subscriptionUrlDomain: creationResult.data.subscription_url?.split('/')[2] || 'unknown'
        } : null
      });

      if (creationError) {
        console.error(`❌ PANEL_USER_CREATION: ${edgeFunctionName} edge function error:`, creationError);
        console.error(`❌ PANEL_USER_CREATION: Edge function error details:`, {
          edgeFunction: edgeFunctionName,
          panelType: panel.type,
          panelUrl: panel.panel_url,
          subscriptionId: request.subscriptionId,
          errorMessage: creationError.message,
          errorDetails: creationError
        });
        return {
          success: false,
          error: `VPN CREATION FAILED: ${panel.type} panel "${panel.name}" (${panel.panel_url}) connection failed. Error: ${creationError.message}. No fallback panels used - this plan requires this specific panel.`
        };
      }

      if (!creationResult?.success) {
        console.error(`❌ PANEL_USER_CREATION: ${edgeFunctionName} creation failed:`, creationResult?.error);
        console.error(`❌ PANEL_USER_CREATION: Creation failure details:`, {
          edgeFunction: edgeFunctionName,
          panelType: panel.type,
          panelUrl: panel.panel_url,
          subscriptionId: request.subscriptionId,
          creationResult,
          errorMessage: creationResult?.error
        });
        return {
          success: false,
          error: `VPN CREATION FAILED: User creation failed on ${panel.type} panel "${panel.name}" (${panel.panel_url}). Error: ${creationResult?.error || 'Unknown creation error'}. No fallback panels used - this plan requires this specific panel.`
        };
      }

      // Step 6: Extract user creation data
      const userData = creationResult.data;
      if (!userData) {
        console.error(`❌ PANEL_USER_CREATION: No user data in ${edgeFunctionName} response`);
        console.error(`❌ PANEL_USER_CREATION: Missing user data details:`, {
          edgeFunction: edgeFunctionName,
          panelType: panel.type,
          panelUrl: panel.panel_url,
          subscriptionId: request.subscriptionId,
          creationResult
        });
        return {
          success: false,
          error: `VPN USER CREATION FAILED: No user data received from ${panel.type} panel "${panel.name}". No fallback panels used - this plan requires this specific panel.`
        };
      }

      // ✅ CRITICAL VERIFICATION: Log the subscription URL domain to verify correct panel usage
      const subscriptionDomain = userData.subscription_url?.split('/')[2] || 'unknown';
      const isCorrectDomain = (
        (planConfig.plan_id === 'plus' && subscriptionDomain.includes('rain')) ||
        (planConfig.plan_id === 'lite' && subscriptionDomain.includes('shopifysb'))
      );

      console.log(`🟢 PANEL_USER_CREATION: User created successfully on STRICT ${panel.type} panel:`, {
        username: userData.username,
        subscriptionUrl: userData.subscription_url,
        subscriptionDomain,
        isCorrectDomain,
        planType: planConfig.plan_id,
        panelUsed: panel.name,
        panelId: panel.id,
        panelUrl: panel.panel_url,
        planName: planConfig.name_en,
        subscriptionId: request.subscriptionId
      });

      if (!isCorrectDomain) {
        console.error('❌ PANEL_USER_CREATION: DOMAIN MISMATCH DETECTED!', {
          expectedDomainForPlan: planConfig.plan_id === 'plus' ? 'rain domain' : 'shopifysb domain',
          actualDomain: subscriptionDomain,
          planType: planConfig.plan_id,
          subscriptionId: request.subscriptionId
        });
      }

      // Step 7: Return success response with STRICT panel info
      const responseData = {
        username: userData.username,
        subscription_url: userData.subscription_url,
        expire: userData.expire || Math.floor(Date.now() / 1000) + (request.durationDays * 24 * 60 * 60),
        data_limit: request.dataLimitGB * 1073741824, // Convert GB to bytes
        panel_type: panel.type,
        panel_name: panel.name,
        panel_id: panel.id,
        panel_url: panel.panel_url
      };

      console.log(`🟢 PANEL_USER_CREATION: STRICT SUCCESS - Returning response for ${panel.type}:`, {
        ...responseData,
        subscriptionId: request.subscriptionId
      });
      return {
        success: true,
        data: responseData
      };

    } catch (error) {
      console.error('❌ PANEL_USER_CREATION: Unexpected error in STRICT binding:', error);
      console.error('❌ PANEL_USER_CREATION: Unexpected error details:', {
        subscriptionId: request.subscriptionId,
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
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
    dataLimitGB: number = 0.5, // Default changed to 500MB
    durationDays: number = 7,
    email?: string,
    phone?: string,
    userIP?: string,
    deviceFingerprint?: string
  ): Promise<PanelUserCreationResponse> {
    console.log('PANEL_USER_CREATION: Creating free trial with STRICT binding:', { 
      username, 
      planIdOrUuid, 
      dataLimitGB, 
      durationDays, 
      email: email ? 'provided' : 'not provided', 
      phone: phone ? 'provided' : 'not provided',
      userIP: userIP ? 'provided' : 'not provided',
      deviceFingerprint: deviceFingerprint ? 'provided' : 'not provided'
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
            error: `Plan "${planIdOrUuid}" not found or inactive. Cannot create free trial without valid plan.`
          };
        }
        
        actualPlanId = plan.id;
        console.log('PANEL_USER_CREATION: Resolved plan name to UUID for STRICT binding:', { name: planIdOrUuid, uuid: actualPlanId, planName: plan.name_en });
      }
      
      // Use STRICT plan-to-panel binding and store test user data
      const result = await this.createUserFromPanel({
        planId: actualPlanId,
        username,
        dataLimitGB,
        durationDays,
        notes: `Free Trial - Plan: ${planIdOrUuid}`,
        isFreeTriaL: true
      });

      // Store test user data in the database and send webhook if email and phone are provided
      if (result.success && result.data && email && phone) {
        try {
          const expireDate = new Date();
          expireDate.setDate(expireDate.getDate() + durationDays);
          
          // Get plan details for the test user data
          const { data: planData } = await supabase
            .from('subscription_plans')
            .select('panel_servers(name)')
            .eq('id', actualPlanId)
            .single();
          
          const testUserData = {
            email: email,
            phone_number: phone,
            username: result.data.username,
            panel_id: result.data.panel_id, // Use the actual panel server ID from the result
            panel_name: result.data.panel_name || planData?.panel_servers?.name || 'Unknown Panel',
            subscription_url: result.data.subscription_url,
            expire_date: expireDate.toISOString(),
            data_limit_bytes: Math.round(dataLimitGB * 1024 * 1024 * 1024), // Convert GB to bytes
            ip_address: userIP,
            user_device_fingerprint: deviceFingerprint,
            device_info: {}
          };
          
          const { error: insertError } = await supabase
            .from('test_users')
            .insert([testUserData]);
            
          if (insertError) {
            console.error('PANEL_USER_CREATION: Failed to store test user data:', insertError);
          } else {
            console.log('PANEL_USER_CREATION: Test user data stored successfully');
            
            // Send webhook notification for new test user with complete data
            try {
              // Get plan details for webhook
              const { data: planDetails } = await supabase
                .from('subscription_plans')
                .select('name_en, plan_id')
                .eq('id', actualPlanId)
                .single();

              await supabase.functions.invoke('send-webhook-notification', {
                body: {
                  type: 'new_test_user',
                  webhook_type: 'test_account_creation',
                  test_user_id: result.data.username,
                  username: result.data.username,
                  email: email,
                  mobile: phone,
                  subscription_url: result.data.subscription_url,
                  panel_name: result.data.panel_name,
                  panel_type: result.data.panel_type,
                  panel_url: result.data.panel_url,
                  plan_name: planDetails?.name_en || planDetails?.plan_id || 'Unknown Plan',
                  plan_id: planDetails?.plan_id || 'unknown',
                  data_limit_gb: dataLimitGB,
                  duration_days: durationDays,
                  expire_date: expireDate.toISOString(),
                  is_free_trial: true,
                  created_at: new Date().toISOString()
                }
              });
              console.log('PANEL_USER_CREATION: Complete webhook notification sent for test user');
            } catch (webhookError) {
              console.error('PANEL_USER_CREATION: Failed to send webhook notification:', webhookError);
              // Don't fail the trial creation for webhook issues
            }
          }
        } catch (error) {
          console.error('PANEL_USER_CREATION: Error storing test user data:', error);
        }
      }

      return result;
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