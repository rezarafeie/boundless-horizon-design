import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Settings, 
  Server,
  TestTube,
  BarChart3,
  X,
  Moon,
  Sun,
  MessageSquare
} from 'lucide-react';

interface AdminSidebarProps {
  onClose?: () => void;
}

export const AdminSidebar = ({ onClose }: AdminSidebarProps) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const menuItems = [
    {
      title: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
    },
    {
      title: 'Users & Orders',
      href: '/admin/users',
      icon: Users,
    },
    {
      title: 'Plans',
      href: '/admin/plans',
      icon: CreditCard,
    },
    {
      title: 'Panels',
      href: '/admin/panels',
      icon: Server,
    },
    {
      title: 'Tests',
      href: '/admin/tests',
      icon: TestTube,
    },
    {
      title: 'Reports',
      href: '/admin/reports',
      icon: BarChart3,
    },
    {
      title: 'Telegram Bot',
      href: '/admin/telegrambot',
      icon: MessageSquare,
    },
    {
      title: 'Discounts',
      href: '/admin/discounts',
      icon: Settings,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="h-full bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold">Admin Panel</h2>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="lg:hidden">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                ${isActive(item.href) 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="w-full justify-start gap-3"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4" />
              Light Mode
            </>
          ) : (
            <>
              <Moon className="w-4 h-4" />
              Dark Mode
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
