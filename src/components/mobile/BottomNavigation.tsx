import { Home, Shield, ShoppingCart, MessageCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  icon: React.ReactNode;
  labelEn: string;
  labelFa: string;
  path?: string;
  external?: string;
}

const navItems: NavItem[] = [
  {
    id: 'home',
    icon: <Home className="w-5 h-5" />,
    labelEn: 'Home',
    labelFa: 'خانه',
    path: '/app'
  },
  {
    id: 'vpn',
    icon: <Shield className="w-5 h-5" />,
    labelEn: 'My VPN',
    labelFa: 'VPN من',
    path: '/app/subscriptions'
  },
  {
    id: 'buy',
    icon: <ShoppingCart className="w-5 h-5" />,
    labelEn: 'Buy',
    labelFa: 'خرید',
    path: '/subscription'
  },
  {
    id: 'support',
    icon: <MessageCircle className="w-5 h-5" />,
    labelEn: 'Support',
    labelFa: 'پشتیبانی',
    external: 'https://t.me/bnetsco'
  }
];

export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguage();

  const handleNavClick = (item: NavItem) => {
    // Haptic feedback simulation
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    if (item.external) {
      window.open(item.external, '_blank');
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const isActive = (item: NavItem) => {
    if (!item.path) return false;
    if (item.path === '/app') {
      return location.pathname === '/app';
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2" style={{ paddingBottom: 'var(--sab, 0px)' }}>
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-full gap-1 transition-all duration-200",
                "active:scale-95 touch-manipulation",
                active 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-200",
                active && "bg-primary/10"
              )}>
                {item.icon}
              </div>
              <span className="text-[10px] font-medium">
                {language === 'fa' ? item.labelFa : item.labelEn}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
