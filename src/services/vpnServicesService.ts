import { supabase } from '@/integrations/supabase/client';

export interface VpnService {
  id: string;
  name: string;
  duration_days: number;
  data_limit_gb: number;
  price_toman: number;
  plan_id: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  subscription_plans?: {
    name_en: string;
    name_fa: string;
  };
}

export interface CreateVpnServiceData {
  name: string;
  duration_days: number;
  data_limit_gb: number;
  price_toman: number;
  plan_id: string;
  status: 'active' | 'inactive';
}

export interface UpdateVpnServiceData extends Partial<CreateVpnServiceData> {
  id: string;
}

export class VpnServicesService {
  static async getServices(): Promise<VpnService[]> {
    const { data, error } = await supabase
      .from('vpn_services')
      .select(`
        *,
        subscription_plans (
          name_en,
          name_fa
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('VPN_SERVICES: Failed to fetch services:', error);
      throw new Error(`Failed to fetch VPN services: ${error.message}`);
    }

    return (data || []) as VpnService[];
  }

  static async getActiveServicesByPlan(planId: string): Promise<VpnService[]> {
    const { data, error } = await supabase
      .from('vpn_services')
      .select(`
        *,
        subscription_plans (
          name_en,
          name_fa
        )
      `)
      .eq('plan_id', planId)
      .eq('status', 'active')
      .order('price_toman', { ascending: true });

    if (error) {
      console.error('VPN_SERVICES: Failed to fetch services by plan:', error);
      throw new Error(`Failed to fetch services for plan: ${error.message}`);
    }

    return (data || []) as VpnService[];
  }

  static async createService(serviceData: CreateVpnServiceData): Promise<VpnService> {
    const { data, error } = await supabase
      .from('vpn_services')
      .insert([serviceData])
      .select(`
        *,
        subscription_plans (
          name_en,
          name_fa
        )
      `)
      .single();

    if (error) {
      console.error('VPN_SERVICES: Failed to create service:', error);
      throw new Error(`Failed to create VPN service: ${error.message}`);
    }

    return data as VpnService;
  }

  static async updateService(serviceData: UpdateVpnServiceData): Promise<VpnService> {
    const { id, ...updateData } = serviceData;
    
    const { data, error } = await supabase
      .from('vpn_services')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        subscription_plans (
          name_en,
          name_fa
        )
      `)
      .single();

    if (error) {
      console.error('VPN_SERVICES: Failed to update service:', error);
      throw new Error(`Failed to update VPN service: ${error.message}`);
    }

    return data as VpnService;
  }

  static async deleteService(serviceId: string): Promise<void> {
    const { error } = await supabase
      .from('vpn_services')
      .delete()
      .eq('id', serviceId);

    if (error) {
      console.error('VPN_SERVICES: Failed to delete service:', error);
      throw new Error(`Failed to delete VPN service: ${error.message}`);
    }
  }
}