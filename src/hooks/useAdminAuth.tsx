
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
      // Use a direct query to avoid RLS issues
      const { data: adminData, error } = await supabase
        .rpc('check_admin_user', { check_user_id: userId });
      
      if (error) {
        console.log('Error checking admin status:', error);
        return null;
      }
      
      return adminData;
    } catch (error) {
      console.log('User is not an admin:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check admin status without triggering RLS recursion
          setTimeout(async () => {
            const adminData = await checkAdminStatus(session.user.id);
            setAdminUser(adminData);
            setLoading(false);
          }, 0);
        } else {
          setAdminUser(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Check admin status for existing session
        setTimeout(async () => {
          const adminData = await checkAdminStatus(session.user.id);
          setAdminUser(adminData);
          setLoading(false);
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
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
