import { AdminLayout } from "@/components/admin/AdminLayout";
import { TestUsersManagement } from "@/components/admin/TestUsersManagement";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const AdminTests = () => {
  return (
    <AdminLayout>
      <TestUsersManagement />
    </AdminLayout>
  );
};

export default AdminTests;