
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Users, Database, Shield, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useRecentActivity, Activity } from '@/hooks/useRecentActivity';
import { formatDistanceToNow } from 'date-fns';

const getActivityIcon = (activity: Activity) => {
  switch (activity.type) {
    case 'subscription':
      return <Users className="w-4 h-4" />;
    case 'user_creation':
      return activity.status === 'success' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />;
    case 'admin_action':
      return <Shield className="w-4 h-4" />;
    default:
      return <Database className="w-4 h-4" />;
  }
};

const getActivityColor = (activity: Activity) => {
  switch (activity.status) {
    case 'active':
      return 'text-green-600';
    case 'pending':
      return 'text-yellow-600';
    case 'expired':
    case 'error':
      return 'text-red-600';
    case 'success':
      return 'text-green-600';
    default:
      return 'text-gray-600';
  }
};

export const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Safely use the hook with error handling
  let activities, loading, unreadCount, markAllAsRead;
  
  try {
    const hookResult = useRecentActivity();
    activities = hookResult.activities;
    loading = hookResult.loading;
    unreadCount = hookResult.unreadCount;
    markAllAsRead = hookResult.markAllAsRead;
  } catch (err) {
    console.error('Error in useRecentActivity:', err);
    setError('Failed to load notifications');
    activities = [];
    loading = false;
    unreadCount = 0;
    markAllAsRead = () => {};
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && unreadCount > 0) {
      // Mark as read when opened
      setTimeout(() => markAllAsRead(), 1000);
    }
  };

  // Handle potential errors gracefully
  const safeActivities = activities || [];
  const safeUnreadCount = unreadCount || 0;

  if (error) {
    return (
      <Button variant="ghost" size="sm" className="relative">
        <Bell className="w-4 h-4 text-muted-foreground" />
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-4 h-4" />
          {safeUnreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {safeUnreadCount > 99 ? '99+' : safeUnreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Recent Activity</h3>
            {safeUnreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {safeUnreadCount} new
              </Badge>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-96">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 animate-pulse" />
              Loading activities...
            </div>
          ) : safeActivities.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2" />
              No recent activity
            </div>
          ) : (
            <div className="divide-y">
              {safeActivities.map((activity) => (
                <div key={activity.id} className="p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getActivityIcon(activity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate">
                          {activity.title}
                        </p>
                        <time className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </time>
                      </div>
                      <p className={`text-xs truncate ${getActivityColor(activity)}`}>
                        {activity.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {safeActivities.length > 0 && (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full text-xs">
              View All Activity
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
