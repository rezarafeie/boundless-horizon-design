
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSupabaseConnection = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const checkConnection = async () => {
      try {
        // Simple connection test - try to get server time
        const { error } = await supabase.from('subscriptions').select('count').limit(1);
        
        if (error) {
          console.error('Supabase connection error:', error);
          setIsConnected(false);
          setShowNotification(true);
        } else {
          setIsConnected(true);
          setShowNotification(false);
        }
      } catch (error) {
        console.error('Supabase connection test failed:', error);
        setIsConnected(false);
        setShowNotification(true);
      }
    };

    // Initial check
    checkConnection();

    // Check connection every 30 seconds
    const intervalId = setInterval(checkConnection, 30000);

    // Also check on window focus
    const handleFocus = () => {
      checkConnection();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const dismissNotification = () => {
    setShowNotification(false);
  };

  return {
    isConnected,
    showNotification,
    dismissNotification
  };
};
