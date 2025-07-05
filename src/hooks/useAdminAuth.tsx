
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const checkAdminStatus = async () => {
    try {
      console.log('=== ADMIN AUTH: Checking admin status ===');
      
      // Check if user is logged in via session
      const adminSession = localStorage.getItem('admin_session');
      if (!adminSession) {
        console.log('ADMIN AUTH: No session found');
        setAdminUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      // Parse session data
      const sessionData = JSON.parse(adminSession);
      if (!sessionData.isLoggedIn || sessionData.username !== 'bnets') {
        console.log('ADMIN AUTH: Invalid session data');
        localStorage.removeItem('admin_session');
        setAdminUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      // Create service client for admin operations (bypasses RLS)
      console.log('ADMIN AUTH: Setting up admin database access');
      
      const { createClient } = await import('@supabase/supabase-js');
      const adminClient = createClient(
        'https://feamvyruipxtafzhptkh.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlYW12eXJ1aXB4dGFmemhwdGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwODE0MzIsImV4cCI6MjA2NTY1NzQzMn0.OcYM5_AGC6CGNgzM_TwrjpcB1PYBiHmUbeuYe9LQJQg'
      );
      
      // Verify admin user exists in database
      const { data: adminData, error } = await adminClient
        .from('admin_users')
        .select('*')
        .eq('user_id', 'a4148578-bcbd-4512-906e-4832f94bdb46')
        .eq('is_active', true)
        .maybeSingle();
      
      console.log('ADMIN AUTH: Admin query result:', { adminData, error });
      
      if (error || !adminData) {
        console.log('ADMIN AUTH: No admin user found in database');
        localStorage.removeItem('admin_session');
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
        is_active: adminData.is_active
      };
      
      setAdminUser(typedAdminData);
      setIsAuthenticated(true);
      setLoading(false);
    } catch (error) {
      console.log('ADMIN AUTH: Exception checking admin status:', error);
      localStorage.removeItem('admin_session');
      setAdminUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const signOut = async () => {
    console.log('ADMIN AUTH: Signing out');
    localStorage.removeItem('admin_session');
    
    setAdminUser(null);
    setIsAuthenticated(false);
    setUser(null);
    setSession(null);
    window.location.href = '/admin/login';
    return { error: null };
  };

  const isAdmin = !!adminUser && isAuthenticated;
  const isSuperAdmin = adminUser?.role === 'superadmin' && isAuthenticated;

  console.log('ADMIN AUTH: Current state - isAdmin:', isAdmin, 'isSuperAdmin:', isSuperAdmin, 'isAuthenticated:', isAuthenticated, 'loading:', loading);

  return {
    user,
    session,
    adminUser,
    loading,
    isAdmin,
    isSuperAdmin,
    isAuthenticated,
    signIn: async () => ({ error: null }),
    signOut
  };
};
