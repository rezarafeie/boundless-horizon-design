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
    console.log('=== PLAN SERVICE: Fetching available plans ===');
    
    try {
      // Get plans with their panel mappings
      const { data: plans, error: plansError } = await supabase
        .from('subscription_plans')
        .select(`
          *,
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
              default_inbounds
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
          const mappings = plan.plan_panel_mappings || [];
          const availablePanels = mappings
            .filter((mapping: any) => {
              const server = mapping.panel_servers;
              // Include panels that are active AND either online, unknown, or offline (but not null)
              // This allows panels that haven't been health-checked yet to be available
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
                default_inbounds: Array.isArray(server.default_inbounds) ? server.default_inbounds : []
              };
            });

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
            panels: availablePanels
          };
        })
        .filter(plan => plan.panels.length > 0); // Only include plans with available panels

      console.log('PLAN SERVICE: Successfully fetched', planWithPanels.length, 'plans with panels');
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
      
      console.log('PLAN SERVICE: Found plan:', plan.name_en);
      return plan;
      
    } catch (error) {
      console.error('PLAN SERVICE: Failed to fetch plan by ID:', error);
      throw error;
    }
  }

  static getPrimaryPanel(plan: PlanWithPanels) {
    const primaryPanel = plan.panels.find(p => p.is_primary);
    if (primaryPanel) return primaryPanel;
    
    // Fallback to first panel if no primary is set
    return plan.panels[0] || null;
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
  }) {
    console.log('PLAN SERVICE: Creating subscription for plan:', planId);
    
    try {
      const plan = await this.getPlanById(planId);
      if (!plan) {
        throw new Error('Plan not found or inactive');
      }

      const primaryPanel = this.getPrimaryPanel(plan);
      if (!primaryPanel) {
        throw new Error('No active panel found for this plan');
      }

      console.log('PLAN SERVICE: Using panel for subscription:', {
        panelName: primaryPanel.name,
        panelType: primaryPanel.type,
        apiType: this.getApiType(plan)
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
            panelId: primaryPanel.id // Pass panel ID for credentials
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

      console.log('PLAN SERVICE: VPN user created successfully');
      return vpnResponse.data;
      
    } catch (error) {
      console.error('PLAN SERVICE: Subscription creation failed:', error);
      throw error;
    }
  }
}
