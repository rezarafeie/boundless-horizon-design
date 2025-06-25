
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, LogOut } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { OfflineStatus } from './OfflineStatus';

export const AdminHeader = () => {
  const { theme } = useTheme();

  const handleLogout = () => {
    // Clear admin session and redirect
    localStorage.removeItem('admin_session');
    window.location.href = '/admin/login';
  };

  return (
    <header className="bg-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold hidden sm:block">Admin Dashboard</h1>
          <Badge variant="secondary" className="text-xs">
            {theme === 'dark' ? 'Dark' : 'Light'} Mode
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <OfflineStatus />
          
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-4 h-4" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              3
            </Badge>
          </Button>
          
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
