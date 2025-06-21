
import { supabase } from '@/integrations/supabase/client';

export interface CreateUserFromPanelRequest {
  planId: string;
  username: string;
  dataLimitGB: number;
  durationDays: number;
  notes?: string;
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

export class PanelUserCreationService {
  
  static async createUserFromPanel(request: CreateUserFromPanelRequest): Promise<CreateUserResponse> {
    console.log('PANEL_USER_CREATION_SERVICE: Starting user creation process for plan:', request.planId);
    
    try {
      // STEP 1: Get plan details and find associated panels
      console.log('PANEL_USER_CREATION_SERVICE: Fetching plan and panel mappings for plan ID:', request.planId);
      
      const { data: planData, error: planError } = await supabase
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
              health_status
            )
          )
        `)
        .eq('id', request.planId)
        .eq('is_active', true)
        .eq('plan_panel_mappings.panel_servers.is_active', true)
        .single();

      if (planError || !planData) {
        console.error('PANEL_USER_CREATION_SERVICE: Plan not found or inactive:', planError);
        return {
          success: false,
          error: `Plan not found or inactive: ${planError?.message || 'Unknown error'}`
        };
      }

      console.log('PANEL_USER_CREATION_SERVICE: Plan found:', {
        planId: planData.id,
        planName: planData.name_en,
        mappingsCount: planData.plan_panel_mappings?.length || 0
      });

      // STEP 2: Select the appropriate panel (prefer primary, then first available)
      const availablePanels = planData.plan_panel_mappings?.filter(mapping => 
        mapping.panel_servers?.is_active && 
        (mapping.panel_servers?.health_status === 'online' || mapping.panel_servers?.health_status === 'unknown')
      ) || [];

      if (availablePanels.length === 0) {
        console.error('PANEL_USER_CREATION_SERVICE: No active panels found for plan:', request.planId);
        return {
          success: false,
          error: 'No active panels configured for this plan'
        };
      }

      // Find primary panel or use first available
      const selectedMapping = availablePanels.find(mapping => mapping.is_primary) || availablePanels[0];
      const selectedPanel = selectedMapping.panel_servers;

      console.log('PANEL_USER_CREATION_SERVICE: Selected panel for plan:', {
        planId: request.planId,
        panelId: selectedPanel.id,
        panelName: selectedPanel.name,
        panelUrl: selectedPanel.panel_url,
        panelType: selectedPanel.type,
        isPrimary: selectedMapping.is_primary
      });

      // STEP 3: Create VPN user using the correct panel
      const edgeFunctionName = selectedPanel.type === 'marzban' ? 'marzban-create-user' : 'marzneshin-create-user';
      
      console.log('PANEL_USER_CREATION_SERVICE: Calling edge function:', edgeFunctionName);
      
      const { data: vpnResponse, error: vpnError } = await supabase.functions.invoke(
        edgeFunctionName,
        {
          body: {
            username: request.username,
            dataLimitGB: request.dataLimitGB,
            durationDays: request.durationDays,
            notes: request.notes || '',
            panelId: selectedPanel.id, // Use the specific panel ID
            enabledProtocols: ['vless', 'vmess', 'trojan', 'shadowsocks']
          }
        }
      );

      if (vpnError) {
        console.error('PANEL_USER_CREATION_SERVICE: VPN creation failed:', vpnError);
        return {
          success: false,
          error: `VPN creation failed: ${vpnError.message}`
        };
      }

      if (!vpnResponse?.success) {
        console.error('PANEL_USER_CREATION_SERVICE: VPN creation unsuccessful:', vpnResponse);
        return {
          success: false,
          error: `VPN creation failed: ${vpnResponse?.error || 'Unknown error'}`
        };
      }

      console.log('PANEL_USER_CREATION_SERVICE: VPN user created successfully:', {
        username: vpnResponse.data?.username,
        panelUsed: selectedPanel.name,
        panelId: selectedPanel.id,
        hasSubscriptionUrl: !!vpnResponse.data?.subscription_url
      });

      return {
        success: true,
        data: {
          username: vpnResponse.data.username,
          subscription_url: vpnResponse.data.subscription_url,
          expire: vpnResponse.data.expire,
          data_limit: vpnResponse.data.data_limit,
          panel_type: selectedPanel.type,
          panel_name: selectedPanel.name,
          panel_id: selectedPanel.id
        }
      };

    } catch (error) {
      console.error('PANEL_USER_CREATION_SERVICE: Unexpected error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  static async createFreeTrial(
    username: string,
    planType: 'lite' | 'plus',
    dataLimitGB: number = 1,
    durationDays: number = 1
  ): Promise<CreateUserResponse> {
    console.log('PANEL_USER_CREATION_SERVICE: Creating free trial for plan type:', planType);
    
    try {
      // Find the plan by plan_id (text field, not UUID)
      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('plan_id', planType)
        .eq('is_active', true)
        .single();

      if (planError || !planData) {
        console.error('PANEL_USER_CREATION_SERVICE: Plan not found for plan type:', planType, planError);
        return {
          success: false,
          error: `Plan not found for type: ${planType}`
        };
      }

      console.log('PANEL_USER_CREATION_SERVICE: Found plan UUID for free trial:', {
        planType,
        planUuid: planData.id
      });

      // Use the main creation method with the found plan UUID
      return this.createUserFromPanel({
        planId: planData.id,
        username,
        dataLimitGB,
        durationDays,
        isFreeTriaL: true,
        notes: `Free trial - Plan: ${planType}`
      });

    } catch (error) {
      console.error('PANEL_USER_CREATION_SERVICE: Free trial creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create free trial'
      };
    }
  }

  static async createPaidSubscription(
    username: string,
    planId: string,
    dataLimitGB: number,
    durationDays: number,
    subscriptionId: string,
    notes?: string
  ): Promise<CreateUserResponse> {
    console.log('PANEL_USER_CREATION_SERVICE: Creating paid subscription for plan:', planId);
    
    return this.createUserFromPanel({
      planId,
      username,
      dataLimitGB,
      durationDays,
      subscriptionId,
      notes: notes || `Paid subscription - ID: ${subscriptionId}`
    });
  }
}
