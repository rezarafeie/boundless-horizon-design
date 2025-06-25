
import { useState, useEffect } from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface OfflineStatusProps {
  showFullScreen?: boolean;
}

export const OfflineStatus = ({ showFullScreen = false }: OfflineStatusProps) => {
  const [isOffline, setIsOffline] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Simple query to test Supabase connection
        const { error } = await supabase.from('subscriptions').select('id').limit(1);
        setIsOffline(!!error);
      } catch (error) {
        setIsOffline(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkConnection();

    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isChecking) {
    return null;
  }

  if (!isOffline) {
    return null;
  }

  if (showFullScreen) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <WifiOff className="w-16 h-16 text-red-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-red-600">🚫 Unable to connect to Boundless Network</h1>
            <p className="text-muted-foreground">
              VPN purchases are currently disabled due to server connection issues.
            </p>
            <p className="text-sm text-muted-foreground">
              Please try again later.
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Small indicator for header
  return (
    <div className="flex items-center gap-1 text-red-500 text-xs bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
      <WifiOff className="w-3 h-3" />
      <span className="hidden sm:inline">Offline</span>
    </div>
  );
};

export const OfflineWarning = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('subscriptions').select('id').limit(1);
        setIsOffline(!!error);
      } catch (error) {
        setIsOffline(true);
      }
    };

    checkConnection();
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <Alert className="mb-4 border-red-200 bg-red-50 dark:bg-red-900/20">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertTitle className="text-red-800 dark:text-red-200">Connection Issue</AlertTitle>
      <AlertDescription className="text-red-700 dark:text-red-300">
        Unable to connect to Boundless Network. Some features may not work properly.
      </AlertDescription>
    </Alert>
  );
};
