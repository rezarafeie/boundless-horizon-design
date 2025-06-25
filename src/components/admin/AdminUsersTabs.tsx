
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsersManagement } from './UsersManagement';
import { ManualVpnCreationTool } from './ManualVpnCreationTool';
import { Users, Settings } from 'lucide-react';

export const AdminUsersTabs = () => {
  return (
    <Tabs defaultValue="users" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="users" className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          Users & Orders
        </TabsTrigger>
        <TabsTrigger value="vpn-tool" className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          VPN Creation Tool
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="users" className="mt-6">
        <UsersManagement />
      </TabsContent>
      
      <TabsContent value="vpn-tool" className="mt-6">
        <ManualVpnCreationTool />
      </TabsContent>
    </Tabs>
  );
};
