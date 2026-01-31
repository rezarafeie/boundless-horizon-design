import { ReactNode, useState, useCallback } from 'react';
import { BottomNavigation } from './BottomNavigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { Globe, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSupabaseConnection } from '@/hooks/useSupabaseConnection';

interface MobileAppLayoutProps {
  children: ReactNode;
  title?: string;
  titleFa?: string;
  showHeader?: boolean;
  onRefresh?: () => Promise<void>;
}

export const MobileAppLayout = ({
  children,
  title = 'BNETS.CO',
  titleFa = 'BNETS.CO',
  showHeader = true,
  onRefresh
}: MobileAppLayoutProps) => {
  const { language, setLanguage } = useLanguage();
  const { isConnected } = useSupabaseConnection();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0 && onRefresh) {
      const touch = e.touches[0];
      (e.currentTarget as HTMLElement).dataset.startY = String(touch.clientY);
    }
  }, [onRefresh]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const startY = Number((e.currentTarget as HTMLElement).dataset.startY || 0);
    if (startY && onRefresh) {
      const touch = e.touches[0];
      const distance = Math.max(0, Math.min(100, touch.clientY - startY));
      setPullDistance(distance);
    }
  }, [onRefresh]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 60 && onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      if ('vibrate' in navigator) {
        navigator.vibrate(20);
      }
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
  }, [pullDistance, onRefresh, isRefreshing]);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'fa' : 'en');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 flex flex-col">
      {/* Header */}
      {showHeader && (
        <header 
          className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50"
          style={{ paddingTop: 'var(--sat, 0px)' }}
        >
          <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              <img 
                src="/lovable-uploads/28e6b45e-0a57-479d-8274-b76cf45c566a.png" 
                alt="BNETS.CO" 
                className="w-8 h-8"
              />
              <h1 className="font-bold text-lg">
                {language === 'fa' ? titleFa : title}
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Connection status */}
              {!isConnected && (
                <div className="flex items-center gap-1 text-destructive text-xs">
                  <WifiOff className="w-4 h-4" />
                </div>
              )}
              
              {/* Language toggle */}
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/50 text-xs font-medium transition-colors hover:bg-secondary"
              >
                <Globe className="w-3.5 h-3.5" />
                {language === 'fa' ? 'EN' : 'فا'}
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Pull to refresh indicator */}
      {pullDistance > 0 && (
        <div 
          className="flex items-center justify-center py-2 text-muted-foreground"
          style={{ height: pullDistance }}
        >
          <div className={cn(
            "w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full transition-all",
            pullDistance > 60 && "animate-spin"
          )} />
        </div>
      )}

      {/* Main content */}
      <main 
        className="flex-1 pb-20"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="max-w-lg mx-auto px-4 py-4">
          {children}
        </div>
      </main>

      {/* Bottom navigation */}
      <BottomNavigation />
    </div>
  );
};
