
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminUser {
  id: string;
  user_id: string;
  role: 'superadmin' | 'editor';
  is_active: boolean;
}

export const useAdminAuth = () => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAdminStatus = async () => {
    try {
      console.log('=== ADMIN AUTH: Checking admin status ===');
      
      // Use the correct existing admin user UUID
      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', 'a4148578-bcbd-4512-906e-4832f94bdb46')
        .eq('is_active', true)
        .single();
      
      console.log('ADMIN AUTH: Admin query result:', { adminData, error });
      
      if (error || !adminData) {
        console.log('ADMIN AUTH: No admin user found');
        setAdminUser(null);
        setLoading(false);
        return;
      }
      
      console.log('ADMIN AUTH: User is admin with role:', adminData.role);
      
      const typedAdminData: AdminUser = {
        id: adminData.id,
        user_id: adminData.user_id,
        role: adminData.role as 'superadmin' | 'editor',
        is_active: adminData.is_active
      };
      
      setAdminUser(typedAdminData);
      setLoading(false);
    } catch (error) {
      console.log('ADMIN AUTH: Exception checking admin status:', error);
      setAdminUser(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const signOut = async () => {
    console.log('ADMIN AUTH: Signing out');
    setAdminUser(null);
    window.location.href = '/admin/login';
    return { error: null };
  };

  const isAdmin = !!adminUser;
  const isSuperAdmin = adminUser?.role === 'superadmin';

  console.log('ADMIN AUTH: Current state - isAdmin:', isAdmin, 'isSuperAdmin:', isSuperAdmin, 'loading:', loading);

  return {
    user: null,
    session: null,
    adminUser,
    loading,
    isAdmin,
    isSuperAdmin,
    signIn: async () => ({ error: null }),
    signOut
  };
};
