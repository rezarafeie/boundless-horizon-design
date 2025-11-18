
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminUser {
  id: string;
  user_id: string;
  role: 'superadmin' | 'editor';
  is_active: boolean;
  username?: string;
  allowed_sections?: string[];
}

export const useAdminAuth = () => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const checkAdminStatus = async () => {
    try {
      console.log('=== ADMIN AUTH: Checking admin status ===');
      
      // Check Supabase session
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (!authSession?.user) {
        console.log('ADMIN AUTH: No Supabase session found');
        setAdminUser(null);
        setIsAuthenticated(false);
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      console.log('ADMIN AUTH: Supabase session found for user:', authSession.user.id);
      setSession(authSession);
      setUser(authSession.user);

      // Check if user is an admin
      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', authSession.user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      console.log('ADMIN AUTH: Admin query result:', { adminData, error });
      
      if (error || !adminData) {
        console.log('ADMIN AUTH: User is not an admin');
        setAdminUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      
      console.log('ADMIN AUTH: User is authenticated admin with role:', adminData.role);
      
      const typedAdminData: AdminUser = {
        id: adminData.id,
        user_id: adminData.user_id,
        role: adminData.role as 'superadmin' | 'editor',
        is_active: adminData.is_active,
        username: adminData.username,
        allowed_sections: Array.isArray(adminData.allowed_sections) 
          ? (adminData.allowed_sections as string[])
          : []
      };
      
      setAdminUser(typedAdminData);
      setIsAuthenticated(true);
      setLoading(false);
    } catch (error) {
      console.log('ADMIN AUTH: Exception checking admin status:', error);
      setAdminUser(null);
      setIsAuthenticated(false);
      setSession(null);
      setUser(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const signOut = async () => {
    console.log('ADMIN AUTH: Signing out');
    await supabase.auth.signOut();
    
    setAdminUser(null);
    setIsAuthenticated(false);
    setUser(null);
    setSession(null);
    window.location.href = '/admin/login';
    return { error: null };
  };

  const isAdmin = !!adminUser && isAuthenticated;
  const isSuperAdmin = adminUser?.role === 'superadmin' && isAuthenticated;
  const hasAccess = (section: string) => {
    return isSuperAdmin || (adminUser?.allowed_sections?.includes(section) ?? false);
  };

  console.log('ADMIN AUTH: Current state - isAdmin:', isAdmin, 'isSuperAdmin:', isSuperAdmin, 'isAuthenticated:', isAuthenticated, 'loading:', loading);

  return {
    user,
    session,
    adminUser,
    loading,
    isAdmin,
    isSuperAdmin,
    isAuthenticated,
    hasAccess,
    signIn: async () => ({ error: null }),
    signOut
  };
};
