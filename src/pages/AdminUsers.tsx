
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminUsersTabs } from '@/components/admin/AdminUsersTabs';

const AdminUsers = () => {
  return (
    <AdminLayout>
      <AdminUsersTabs />
    </AdminLayout>
  );
};

export default AdminUsers;
