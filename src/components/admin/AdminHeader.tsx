
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, User } from 'lucide-react';

export const AdminHeader = () => {
  const { user, adminUser, signOut } = useAdminAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Boundless Network Admin</h1>
          <p className="text-sm text-gray-500">Manage your VPN service</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium">
              {user?.email || 'Admin User (Development Mode)'}
            </span>
            <Badge variant={adminUser?.role === 'superadmin' ? 'default' : 'secondary'}>
              {adminUser?.role || 'superadmin'}
            </Badge>
          </div>
          
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
};
