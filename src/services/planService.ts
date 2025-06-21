import { supabase } from '@/integrations/supabase/client';

export interface PlanWithPanels {
  id: string;
  plan_id: string;
  name_en: string;
  name_fa: string;
  description_en?: string;
  description_fa?: string;
  price_per_gb: number;
  api_type: 'marzban' | 'marzneshin';
  default_data_limit_gb: number;
  default_duration_days: number;
  is_active: boolean;
  is_visible: boolean;
  assigned_panel_id?: string;
  panels: {
    id: string;
    name: string;
    type: 'marzban' | 'marzneshin';
    country_en: string;
    country_fa: string;
    panel_url: string;
    username: string;
    password: string;
    is_active: boolean;
    health_status: 'online' | 'offline' | 'unknown';
    is_primary: boolean;
    inbound_ids: string[];
    default_inbounds: any[];
    enabled_protocols: string[];
  }[];
}

// Type guard to validate API type
function isValidApiType(apiType: string): apiType is 'marzban' | 'marzneshin' {
  return apiType === 'marzban' || apiType === 'marzneshin';
}

// Type guard to validate panel type
function isValidPanelType(panelType: string): panelType is 'marzban' | 'marzneshin' {
  return panelType === 'marzban' || panelType === 'marzneshin';
}

// Type guard to validate health status
function isValidHealthStatus(status: string): status is 'online' | 'offline' | 'unknown' {
  return status === 'online' || status === 'offline' || status === 'unknown';
}

export class PlanService {
  
  static async getAvailablePlans(): Promise<PlanWithPanels[]> {
    console.log('=== PLAN SERVICE: Fetching available plans with panels ===');
    
    try {
      // Get all active plans
      const { data: plans, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .eq('is_visible', true);

      if (plansError) {
        console.error('PLAN SERVICE: Error fetching plans:', plansError);
        throw plansError;
      }

      if (!plans || plans.length === 0) {
        console.warn('PLAN SERVICE: No active plans found');
        return [];
      }

      console.log('PLAN SERVICE: Found', plans.length, 'active plans');

      // Get all active panels
      const { data: panels, error: panelsError } = await supabase
        .from('panel_servers')
        .select('*')
        .eq('is_active', true);

      if (panelsError) {
        console.error('PLAN SERVICE: Error fetching panels:', panelsError);
        throw panelsError;
      }

      console.log('PLAN SERVICE: Found', panels?.length || 0, 'active panels');

      // Get all plan-panel mappings
      const { data: mappings, error: mappingsError } = await supabase
        .from('plan_panel_mappings')
        .select('*');

      if (mappingsError) {
        console.error('PLAN SERVICE: Error fetching mappings:', mappingsError);
        // Don't throw here, continue with assigned panels only
      }

      console.log('PLAN SERVICE: Found', mappings?.length || 0, 'plan-panel mappings');

      // Transform the data to our desired format with proper type validation
      const planWithPanels: PlanWithPanels[] = plans
        .filter((plan: any) => {
          // Validate required fields
          if (!isValidApiType(plan.api_type)) {
            console.warn(`PLAN SERVICE: Invalid api_type for plan ${plan.id}: ${plan.api_type}`);
            return false;
          }
          return true;
        })
        .map((plan: any) => {
          let availablePanels: any[] = [];

          // Priority 1: Use assigned panel if available
          if (plan.assigned_panel_id && panels) {
            const assignedPanel = panels.find(p => p.id === plan.assigned_panel_id);
            if (assignedPanel && assignedPanel.is_active) {
              console.log(`PLAN SERVICE: Using assigned panel for ${plan.name_en}:`, assignedPanel.name);
              availablePanels = [{
                id: assignedPanel.id,
                name: assignedPanel.name,
                type: isValidPanelType(assignedPanel.type) ? assignedPanel.type : 'marzban',
                country_en: assignedPanel.country_en,
                country_fa: assignedPanel.country_fa,
                panel_url: assignedPanel.panel_url,
                username: assignedPanel.username,
                password: assignedPanel.password,
                is_active: assignedPanel.is_active,
                health_status: isValidHealthStatus(assignedPanel.health_status) ? assignedPanel.health_status : 'unknown',
                is_primary: true, // Assigned panel is always primary
                inbound_ids: [],
                default_inbounds: Array.isArray(assignedPanel.default_inbounds) ? assignedPanel.default_inbounds : [],
                enabled_protocols: Array.isArray(assignedPanel.enabled_protocols) ? assignedPanel.enabled_protocols : ['vless', 'vmess', 'trojan', 'shadowsocks']
              }];
            }
          }

          // Fallback: Use plan_panel_mappings if no assigned panel or assigned panel is unavailable
          if (availablePanels.length === 0 && mappings && panels) {
            const planMappings = mappings.filter(m => m.plan_id === plan.id);
            console.log(`PLAN SERVICE: Found ${planMappings.length} mappings for plan ${plan.name_en}`);
            
            availablePanels = planMappings
              .map((mapping: any) => {
                const panel = panels.find(p => p.id === mapping.panel_id);
                if (!panel || !panel.is_active) {
                  console.warn(`PLAN SERVICE: Panel ${mapping.panel_id} not found or inactive`);
                  return null;
                }
                return {
                  id: panel.id,
                  name: panel.name,
                  type: isValidPanelType(panel.type) ? panel.type : 'marzban',
                  country_en: panel.country_en,
                  country_fa: panel.country_fa,
                  panel_url: panel.panel_url,
                  username: panel.username,
                  password: panel.password,
                  is_active: panel.is_active,
                  health_status: isValidHealthStatus(panel.health_status) ? panel.health_status : 'unknown',
                  is_primary: mapping.is_primary,
                  inbound_ids: Array.isArray(mapping.inbound_ids) ? mapping.inbound_ids : [],
                  default_inbounds: Array.isArray(panel.default_inbounds) ? panel.default_inbounds : [],
                  enabled_protocols: Array.isArray(panel.enabled_protocols) ? panel.enabled_protocols : ['vless', 'vmess', 'trojan', 'shadowsocks']
                };
              })
              .filter(panel => panel !== null);
          }

          // Last resort: If no assigned panel and no mappings, use any available panel with matching API type
          if (availablePanels.length === 0 && panels) {
            console.warn(`PLAN SERVICE: No assigned panel or mappings for ${plan.name_en}, using compatible panels`);
            const compatiblePanels = panels.filter(p => 
              p.is_active && 
              (p.type === plan.api_type || plan.api_type === 'marzban') // Marzban can use any panel
            );
            
            if (compatiblePanels.length > 0) {
              const fallbackPanel = compatiblePanels[0];
              availablePanels = [{
                id: fallbackPanel.id,
                name: fallbackPanel.name,
                type: isValidPanelType(fallbackPanel.type) ? fallbackPanel.type : 'marzban',
                country_en: fallbackPanel.country_en,
                country_fa: fallbackPanel.country_fa,
                panel_url: fallbackPanel.panel_url,
                username: fallbackPanel.username,
                password: fallbackPanel.password,
                is_active: fallbackPanel.is_active,
                health_status: isValidHealthStatus(fallbackPanel.health_status) ? fallbackPanel.health_status : 'unknown',
                is_primary: true,
                inbound_ids: [],
                default_inbounds: Array.isArray(fallbackPanel.default_inbounds) ? fallbackPanel.default_inbounds : [],
                enabled_protocols: Array.isArray(fallbackPanel.enabled_protocols) ? fallbackPanel.enabled_protocols : ['vless', 'vmess', 'trojan', 'shadowsocks']
              }];
              console.log(`PLAN SERVICE: Using fallback panel for ${plan.name_en}:`, fallbackPanel.name);
            }
          }

          const planWithPanel = {
            id: plan.id,
            plan_id: plan.plan_id,
            name_en: plan.name_en,
            name_fa: plan.name_fa,
            description_en: plan.description_en,
            description_fa: plan.description_fa,
            price_per_gb: plan.price_per_gb,
            api_type: plan.api_type as 'marzban' | 'marzneshin', // Safe cast after validation
            default_data_limit_gb: plan.default_data_limit_gb,
            default_duration_days: plan.default_duration_days,
            is_active: plan.is_active,
            is_visible: plan.is_visible,
            assigned_panel_id: plan.assigned_panel_id,
            panels: availablePanels
          };

          console.log(`PLAN SERVICE: Plan ${plan.name_en} has ${availablePanels.length} available panels`);
          return planWithPanel;
        });

      console.log('PLAN SERVICE: Successfully fetched', planWithPanels.length, 'plans with panels');
      
      // Always return plans, even if some don't have panels available
      return planWithPanels;
      
    } catch (error) {
      console.error('PLAN SERVICE: Failed to fetch plans:', error);
      throw error;
    }
  }

  static async getPlanById(planId: string): Promise<PlanWithPanels | null> {
    console.log('PLAN SERVICE: Fetching plan by ID:', planId);
    
    try {
      const plans = await this.getAvailablePlans();
      const plan = plans.find(p => p.id === planId);
      
      if (!plan) {
        console.warn('PLAN SERVICE: Plan not found:', planId);
        return null;
      }
      
      console.log('PLAN SERVICE: Found plan:', plan.name_en, 'with', plan.panels.length, 'panels');
      return plan;
      
    } catch (error) {
      console.error('PLAN SERVICE: Failed to fetch plan by ID:', error);
      throw error;
    }
  }

  static getPrimaryPanel(plan: PlanWithPanels) {
    // First try to get the assigned panel (which is marked as primary)
    const assignedPanel = plan.panels.find(p => p.is_primary);
    if (assignedPanel) {
      console.log('PLAN SERVICE: Using assigned panel:', assignedPanel.name);
      return assignedPanel;
    }
    
    // Fallback to first available panel
    const fallbackPanel = plan.panels[0] || null;
    if (fallbackPanel) {
      console.log('PLAN SERVICE: Using fallback panel:', fallbackPanel.name);
    }
    return fallbackPanel;
  }

  static getApiType(plan: PlanWithPanels): 'marzban' | 'marzneshin' {
    const primaryPanel = this.getPrimaryPanel(plan);
    return primaryPanel?.type || plan.api_type;
  }

  static async createSubscription(planId: string, subscriptionData: {
    username: string;
    mobile: string;
    dataLimitGB: number;
    durationDays: number;
    notes?: string;
    enabledProtocols?: string[];
  }) {
    console.log('PLAN SERVICE: Creating subscription for plan:', planId);
    
    try {
      const plan = await this.getPlanById(planId);
      if (!plan) {
        throw new Error('Plan not found or inactive');
      }

      const primaryPanel = this.getPrimaryPanel(plan);
      if (!primaryPanel) {
        throw new Error(`This plan is currently not available. Please choose another plan.`);
      }

      // Validate panel health
      if (primaryPanel.health_status === 'offline') {
        throw new Error(`The selected plan's server is currently offline. Please try again later or choose another plan.`);
      }

      // Use provided protocols or fetch from panel configuration
      const enabledProtocols = subscriptionData.enabledProtocols || primaryPanel.enabled_protocols;

      console.log('PLAN SERVICE: Using panel for subscription:', {
        planName: plan.name_en,
        panelName: primaryPanel.name,
        panelType: primaryPanel.type,
        panelUrl: primaryPanel.panel_url,
        apiType: this.getApiType(plan),
        enabledProtocols: enabledProtocols,
        isAssignedPanel: primaryPanel.is_primary
      });

      // Route to the correct edge function based on panel type
      const edgeFunctionName = primaryPanel.type === 'marzban' ? 
        'marzban-create-user' : 'marzneshin-create-user';

      const { data: vpnResponse, error: vpnError } = await supabase.functions.invoke(
        edgeFunctionName,
        {
          body: {
            username: subscriptionData.username,
            dataLimitGB: subscriptionData.dataLimitGB,
            durationDays: subscriptionData.durationDays,
            notes: subscriptionData.notes || '',
            panelId: primaryPanel.id, // Pass panel ID for credentials
            enabledProtocols: enabledProtocols // Pass dynamic protocols
          }
        }
      );

      if (vpnError) {
        console.error('PLAN SERVICE: VPN creation failed:', vpnError);
        throw new Error(`VPN creation failed: ${vpnError.message}`);
      }

      if (!vpnResponse?.success) {
        throw new Error(`VPN creation failed: ${vpnResponse?.error || 'Unknown error'}`);
      }

      console.log('PLAN SERVICE: VPN user created successfully with dynamic panel configuration');
      return vpnResponse.data;
      
    } catch (error) {
      console.error('PLAN SERVICE: Subscription creation failed:', error);
      throw error;
    }
  }
}
