import { AdminLayout } from "@/components/admin/AdminLayout";
import { TestUsersManagement } from "@/components/admin/TestUsersManagement";

const AdminTests = () => {
  return (
    <AdminLayout>
      <TestUsersManagement />
    </AdminLayout>
  );
};

export default AdminTests;