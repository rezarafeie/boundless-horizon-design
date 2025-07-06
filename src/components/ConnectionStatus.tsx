
import { useSupabaseConnection } from '@/hooks/useSupabaseConnection';
import { useLanguage } from '@/contexts/LanguageContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { WifiOff, X } from 'lucide-react';

export const ConnectionStatus = () => {
  const { showNotification, dismissNotification } = useSupabaseConnection();
  const { language } = useLanguage();

  if (!showNotification) return null;

  return (
    <div className="fixed top-20 left-4 right-4 z-50 max-w-md mx-auto">
      <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 shadow-lg">
        <WifiOff className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800 dark:text-orange-200 pr-8">
          {language === 'fa' ? (
            <>
              اتصال شما پایدار نیست، برای تجربه بهتر صفحه را با اتصال VPN فعال رفرش کنید
            </>
          ) : (
            <>
              Your connection is not stable. For a better experience, refresh with an active VPN connection
            </>
          )}
        </AlertDescription>
        <Button
          variant="ghost"
          size="sm"
          onClick={dismissNotification}
          className="absolute top-2 right-2 h-6 w-6 p-0 text-orange-600 hover:text-orange-800"
        >
          <X className="h-4 w-4" />
        </Button>
      </Alert>
    </div>
  );
};
