
import { supabase } from '@/integrations/supabase/client';
import { MarzneshinUserResponse } from '@/types/subscription';

export class MarzneshinApiService {
  static async createUser(userData: {
    username: string;
    dataLimitGB: number;
    durationDays: number;
    notes: string;
  }): Promise<MarzneshinUserResponse> {
    try {
      console.log('Calling Marzneshin edge function with data:', userData);
      
      const { data, error } = await supabase.functions.invoke('marzneshin-create-user', {
        body: {
          username: userData.username,
          dataLimitGB: userData.dataLimitGB,
          durationDays: userData.durationDays,
          notes: userData.notes
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to call Marzneshin service');
      }

      if (!data?.success) {
        console.error('Marzneshin service error:', data?.error);
        throw new Error(data?.error || 'Failed to create user on Marzneshin');
      }

      console.log('Marzneshin user created successfully:', data.data);
      return data.data;
      
    } catch (error) {
      console.error('MarzneshinApiService Error:', error);
      throw error;
    }
  }
}
