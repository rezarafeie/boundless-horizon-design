
import { AdminLayout } from '@/components/admin/AdminLayout';
import { UsersManagement } from '@/components/admin/UsersManagement';

const AdminDashboard = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to the admin dashboard</p>
        </div>
        <UsersManagement />
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
