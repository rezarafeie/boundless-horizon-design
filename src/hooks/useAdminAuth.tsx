
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface AdminUser {
  id: string;
  user_id: string;
  role: 'superadmin' | 'editor';
  is_active: boolean;
}

export const useAdminAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAdminStatus = async (userId: string) => {
    try {
      console.log('=== ADMIN AUTH: Checking admin status for user:', userId);
      
      // Direct query to admin_users table (RLS is now disabled)
      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
      
      console.log('ADMIN AUTH: Admin query result:', { adminData, error });
      
      if (error) {
        console.log('ADMIN AUTH: No admin user found or error:', error);
        return null;
      }
      
      console.log('ADMIN AUTH: User is admin with role:', adminData.role);
      return adminData;
    } catch (error) {
      console.log('ADMIN AUTH: Exception checking admin status:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('=== ADMIN AUTH: Setting up auth listener ===');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('ADMIN AUTH: Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('ADMIN AUTH: User found, checking admin status...');
          const adminData = await checkAdminStatus(session.user.id);
          setAdminUser(adminData);
          setLoading(false);
        } else {
          console.log('ADMIN AUTH: No user session');
          setAdminUser(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('ADMIN AUTH: Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('ADMIN AUTH: Existing session found, checking admin status...');
        checkAdminStatus(session.user.id).then((adminData) => {
          setAdminUser(adminData);
          setLoading(false);
        });
      } else {
        console.log('ADMIN AUTH: No existing session');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('ADMIN AUTH: Attempting sign in for:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    console.log('ADMIN AUTH: Sign in result:', error ? 'failed' : 'success');
    return { error };
  };

  const signOut = async () => {
    console.log('ADMIN AUTH: Signing out');
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setAdminUser(null);
    }
    return { error };
  };

  const isAdmin = !!adminUser;
  const isSuperAdmin = adminUser?.role === 'superadmin';

  console.log('ADMIN AUTH: Current state - isAdmin:', isAdmin, 'isSuperAdmin:', isSuperAdmin, 'loading:', loading);

  return {
    user,
    session,
    adminUser,
    loading,
    isAdmin,
    isSuperAdmin,
    signIn,
    signOut
  };
};
