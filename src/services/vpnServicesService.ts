
import { supabase } from '@/integrations/supabase/client';

export interface VpnService {
  id: string;
  name: string;
  name_en?: string;
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
  name_en?: string;
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
    console.log('VPN_SERVICES: Fetching services...');
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

    console.log('VPN_SERVICES: Successfully fetched', data?.length || 0, 'services');
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
    console.log('VPN_SERVICES: Creating service with data:', serviceData);
    
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

    console.log('VPN_SERVICES: Successfully created service:', data.id);
    return data as VpnService;
  }

  static async updateService(serviceData: UpdateVpnServiceData): Promise<VpnService> {
    const { id, ...updateData } = serviceData;
    
    console.log('VPN_SERVICES: Updating service', id, 'with data:', updateData);
    
    // First check if the service exists
    const { data: existingService, error: checkError } = await supabase
      .from('vpn_services')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (checkError) {
      console.error('VPN_SERVICES: Error checking service existence:', checkError);
      throw new Error(`Failed to verify service exists: ${checkError.message}`);
    }

    if (!existingService) {
      console.error('VPN_SERVICES: Service not found:', id);
      throw new Error('Service not found');
    }

    // Now perform the update
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
      .maybeSingle();

    if (error) {
      console.error('VPN_SERVICES: Failed to update service:', error);
      throw new Error(`Failed to update VPN service: ${error.message}`);
    }

    if (!data) {
      console.error('VPN_SERVICES: No data returned after update for service:', id);
      throw new Error('Service update returned no data - service may not exist or you may not have permission');
    }

    console.log('VPN_SERVICES: Successfully updated service:', data.id);
    return data as VpnService;
  }

  static async deleteService(serviceId: string): Promise<void> {
    console.log('VPN_SERVICES: Attempting to delete service:', serviceId);
    
    // First check if the service exists
    const { data: existingService, error: checkError } = await supabase
      .from('vpn_services')
      .select('id, name')
      .eq('id', serviceId)
      .maybeSingle();

    if (checkError) {
      console.error('VPN_SERVICES: Error checking service existence before delete:', checkError);
      throw new Error(`Failed to verify service exists: ${checkError.message}`);
    }

    if (!existingService) {
      console.error('VPN_SERVICES: Service not found for deletion:', serviceId);
      throw new Error('Service not found');
    }

    console.log('VPN_SERVICES: Service found, proceeding with deletion:', existingService.name);

    // Perform the deletion
    const { error } = await supabase
      .from('vpn_services')
      .delete()
      .eq('id', serviceId);

    if (error) {
      console.error('VPN_SERVICES: Failed to delete service:', error);
      throw new Error(`Failed to delete VPN service: ${error.message}`);
    }

    console.log('VPN_SERVICES: Successfully deleted service:', serviceId);
  }
}
