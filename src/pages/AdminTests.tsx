import { AdminLayout } from "@/components/admin/AdminLayout";
import { TestUsersManagement } from "@/components/admin/TestUsersManagement";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const AdminTests = () => {
  const { loading, isAdmin } = useAdminAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAdmin) {
    return <div>Access denied. Admin authentication required.</div>;
  }

  return (
    <AdminLayout>
      <TestUsersManagement />
    </AdminLayout>
  );
};

export default AdminTests;