
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Activity {
  id: string;
  type: 'subscription' | 'user_creation' | 'admin_action';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
}

export const useRecentActivity = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchRecentActivity = async () => {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Fetch recent subscriptions
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('id, username, mobile, status, created_at, price_toman')
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch recent user creation logs
      const { data: userLogs } = await supabase
        .from('user_creation_logs')
        .select('id, panel_name, success, created_at, error_message')
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch recent admin audit logs
      const { data: adminLogs } = await supabase
        .from('admin_audit_logs')
        .select('id, action, table_name, created_at')
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch recent test users
      const { data: testUsers } = await supabase
        .from('test_users')
        .select('id, username, email, phone_number, status, created_at, expire_date')
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false })
        .limit(10);

      const allActivities: Activity[] = [];

      // Process subscriptions
      subscriptions?.forEach(sub => {
        allActivities.push({
          id: `sub-${sub.id}`,
          type: 'subscription',
          title: 'New Subscription',
          description: `${sub.username} (${sub.mobile}) - ${sub.status} - ${sub.price_toman?.toLocaleString()} تومان`,
          timestamp: sub.created_at,
          status: sub.status
        });
      });

      // Process user creation logs
      userLogs?.forEach(log => {
        allActivities.push({
          id: `user-${log.id}`,
          type: 'user_creation',
          title: log.success ? 'User Created' : 'User Creation Failed',
          description: `Panel: ${log.panel_name}${log.error_message ? ` - ${log.error_message}` : ''}`,
          timestamp: log.created_at,
          status: log.success ? 'success' : 'error'
        });
      });

      // Process admin logs
      adminLogs?.forEach(log => {
        allActivities.push({
          id: `admin-${log.id}`,
          type: 'admin_action',
          title: 'Admin Action',
          description: `${log.action} on ${log.table_name}`,
          timestamp: log.created_at
        });
      });

      // Process test users
      testUsers?.forEach(user => {
        const isExpired = new Date(user.expire_date) <= new Date();
        allActivities.push({
          id: `test-${user.id}`,
          type: 'user_creation',
          title: 'Test Account Created',
          description: `${user.username} (${user.email}) - ${isExpired ? 'Expired' : 'Active'}`,
          timestamp: user.created_at,
          status: user.status === 'deleted' ? 'error' : (isExpired ? 'expired' : 'success')
        });
      });

      // Sort by timestamp
      allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setActivities(allActivities.slice(0, 15));
      setUnreadCount(allActivities.length);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentActivity();

    // Set up real-time subscriptions with unique channel names
    const subscriptionsChannel = supabase
      .channel(`admin-subscriptions-changes-${Date.now()}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'subscriptions' },
        () => {
          console.log('Subscriptions updated, refreshing activity');
          fetchRecentActivity();
        }
      )
      .subscribe();

    const userLogsChannel = supabase
      .channel(`admin-user-logs-changes-${Date.now()}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_creation_logs' },
        () => {
          console.log('User logs updated, refreshing activity');
          fetchRecentActivity();
        }
      )
      .subscribe();

    const testUsersChannel = supabase
      .channel(`admin-test-users-changes-${Date.now()}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'test_users' },
        () => {
          console.log('Test users updated, refreshing activity');
          fetchRecentActivity();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up subscriptions');
      subscriptionsChannel.unsubscribe();
      userLogsChannel.unsubscribe();
      testUsersChannel.unsubscribe();
    };
  }, []);

  const markAllAsRead = () => {
    setUnreadCount(0);
  };

  return {
    activities,
    loading,
    unreadCount,
    markAllAsRead,
    refresh: fetchRecentActivity
  };
};
