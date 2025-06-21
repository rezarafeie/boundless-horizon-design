
import { supabase } from '@/integrations/supabase/client';

export interface PanelSubscriptionData {
  username: string;
  subscription_url: string | null;
  expire: number | null;
  data_limit: number;
  status: string;
  used_traffic?: number;
}

export class PanelApiService {
  static async getSubscriptionFromPanel(username: string, panelType: 'marzban'): Promise<PanelSubscriptionData> {
    try {
      console.log(`Fetching subscription for ${username} from ${panelType} panel`);
      
      const { data, error } = await supabase.functions.invoke('get-subscription-from-panel', {
        body: {
          username,
          panelType: 'marzban' // Force marzban
        }
      });

      if (error) {
        console.error('Panel API error:', error);
        throw new Error(error.message || 'Failed to fetch from panel');
      }

      if (!data?.success) {
        console.error('Panel API failed:', data?.error);
        throw new Error(data?.error || 'Failed to fetch subscription from panel');
      }

      console.log('Panel API response:', data.data);
      return data.data;
      
    } catch (error) {
      console.error('PanelApiService Error:', error);
      throw error;
    }
  }

  static async determineSubscriptionPanelType(username: string): Promise<'marzban' | null> {
    try {
      // First try to get from database subscription record
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('username', username)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (subscription) {
        // All subscriptions now use marzban
        return 'marzban';
      }

      // Try marzban panel directly
      try {
        await PanelApiService.getSubscriptionFromPanel(username, 'marzban');
        return 'marzban';
      } catch (error) {
        console.log('User not found in Marzban panel');
      }

      return null;
    } catch (error) {
      console.error('Error determining panel type:', error);
      return null;
    }
  }
}
