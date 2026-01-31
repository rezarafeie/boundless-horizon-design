import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SavedSubscription {
  id: string;
  username: string;
  mobile: string;
  subscription_url?: string;
  expire_at?: string;
  data_limit_gb: number;
  status: string;
  created_at: string;
}

interface UseSavedSubscriptionsResult {
  subscriptions: SavedSubscription[];
  isLoading: boolean;
  saveSubscription: (subscriptionId: string) => void;
  removeSubscription: (subscriptionId: string) => void;
  refreshSubscriptions: () => Promise<void>;
  clearAll: () => void;
}

const STORAGE_KEY = 'bnets_saved_subscriptions';

export const useSavedSubscriptions = (): UseSavedSubscriptionsResult => {
  const [subscriptions, setSubscriptions] = useState<SavedSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  // Load saved subscription IDs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSavedIds(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Error loading saved subscriptions:', error);
      setSavedIds([]);
    }
  }, []);

  // Fetch subscription details from Supabase
  const fetchSubscriptions = useCallback(async () => {
    if (savedIds.length === 0) {
      setSubscriptions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, username, mobile, subscription_url, expire_at, data_limit_gb, status, created_at')
        .in('id', savedIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching subscriptions:', error);
        setSubscriptions([]);
      } else {
        setSubscriptions(data || []);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      setSubscriptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [savedIds]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const saveSubscription = useCallback((subscriptionId: string) => {
    setSavedIds(prev => {
      if (prev.includes(subscriptionId)) return prev;
      const updated = [...prev, subscriptionId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeSubscription = useCallback((subscriptionId: string) => {
    setSavedIds(prev => {
      const updated = prev.filter(id => id !== subscriptionId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSavedIds([]);
    setSubscriptions([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const refreshSubscriptions = useCallback(async () => {
    await fetchSubscriptions();
  }, [fetchSubscriptions]);

  return {
    subscriptions,
    isLoading,
    saveSubscription,
    removeSubscription,
    refreshSubscriptions,
    clearAll
  };
};
