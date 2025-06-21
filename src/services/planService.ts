
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
    console.log('=== PLAN SERVICE: Fetching available plans with assigned panels ===');
    
    try {
      // Get plans with their assigned panels (using the new assigned_panel_id field)
      const { data: plans, error: plansError } = await supabase
        .from('subscription_plans')
        .select(`
          *,
          panel_servers!assigned_panel_id (
            id,
            name,
            type,
            country_en,
            country_fa,
            panel_url,
            username,
            password,
            is_active,
            health_status,
            default_inbounds,
            enabled_protocols
          ),
          plan_panel_mappings (
            panel_id,
            is_primary,
            inbound_ids,
            panel_servers (
              id,
              name,
              type,
              country_en,
              country_fa,
              panel_url,
              username,
              password,
              is_active,
              health_status,
              default_inbounds,
              enabled_protocols
            )
          )
        `)
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
          if (plan.assigned_panel_id && plan.panel_servers) {
            const assignedPanel = plan.panel_servers;
            if (assignedPanel.is_active && assignedPanel.health_status !== null) {
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
          if (availablePanels.length === 0) {
            const mappings = plan.plan_panel_mappings || [];
            availablePanels = mappings
              .filter((mapping: any) => {
                const server = mapping.panel_servers;
                return server?.is_active && server.health_status !== null;
              })
              .map((mapping: any) => {
                const server = mapping.panel_servers;
                return {
                  id: server.id,
                  name: server.name,
                  type: isValidPanelType(server.type) ? server.type : 'marzban',
                  country_en: server.country_en,
                  country_fa: server.country_fa,
                  panel_url: server.panel_url,
                  username: server.username,
                  password: server.password,
                  is_active: server.is_active,
                  health_status: isValidHealthStatus(server.health_status) ? server.health_status : 'unknown',
                  is_primary: mapping.is_primary,
                  inbound_ids: Array.isArray(mapping.inbound_ids) ? mapping.inbound_ids : [],
                  default_inbounds: Array.isArray(server.default_inbounds) ? server.default_inbounds : [],
                  enabled_protocols: Array.isArray(server.enabled_protocols) ? server.enabled_protocols : ['vless', 'vmess', 'trojan', 'shadowsocks']
                };
              });
          }

          return {
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
        })
        .filter(plan => plan.panels.length > 0); // Only include plans with available panels

      console.log('PLAN SERVICE: Successfully fetched', planWithPanels.length, 'plans with panels');
      console.log('PLAN SERVICE: Plans with assigned panels:', planWithPanels.map(p => ({ 
        name: p.name_en, 
        assigned_panel: p.assigned_panel_id, 
        available_panels: p.panels.length 
      })));
      
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
