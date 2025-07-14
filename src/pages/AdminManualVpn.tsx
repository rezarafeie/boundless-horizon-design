import { AdminLayout } from '@/components/admin/AdminLayout';
import { ManualVpnCreationTool } from '@/components/admin/ManualVpnCreationTool';

const AdminManualVpn = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Manual VPN Creation</h1>
          <p className="text-muted-foreground">
            Create VPN users manually with debug logging and custom API body support
          </p>
        </div>
        <ManualVpnCreationTool />
      </div>
    </AdminLayout>
  );
};

export default AdminManualVpn;