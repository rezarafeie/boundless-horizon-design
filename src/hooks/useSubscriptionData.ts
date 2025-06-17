
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Subscription {
  id: string;
  username: string;
  mobile: string;
  data_limit_gb: number;
  duration_days: number;
  protocol: string;
  price_toman: number;
  status: string;
  subscription_url?: string;
  expire_at?: string;
  created_at: string;
}

interface UseSubscriptionDataResult {
  subscriptions: Subscription[];
  isLoading: boolean;
  searchByMobile: (mobile: string) => Promise<Subscription[]>;
  refreshSubscriptions: () => Promise<void>;
}

export const useSubscriptionData = (): UseSubscriptionDataResult => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchSubscriptions = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching subscriptions...');
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Error fetching subscriptions:', error);
        throw error;
      }
      
      console.log('Fetched subscriptions:', data);
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subscriptions',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const searchByMobile = async (mobile: string): Promise<Subscription[]> => {
    if (!mobile.trim()) {
      return [];
    }
    
    setIsLoading(true);
    try {
      console.log('Searching subscriptions by mobile:', mobile);
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('mobile', mobile.trim())
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error searching subscriptions by mobile:', error);
        throw error;
      }
      
      console.log('Found subscriptions for mobile:', data);
      return data || [];
    } catch (error) {
      console.error('Failed to search subscriptions:', error);
      toast({
        title: 'Error',
        description: 'Failed to search subscriptions',
        variant: 'destructive'
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSubscriptions = async () => {
    await fetchSubscriptions();
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  return {
    subscriptions,
    isLoading,
    searchByMobile,
    refreshSubscriptions
  };
};
