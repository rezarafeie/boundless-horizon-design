
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, MessageSquare, Users, CreditCard, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from '../DateRangeSelector';

interface TelegramBotReportProps {
  refreshTrigger: number;
  dateRange: DateRange;
}

interface TelegramStats {
  botStatus: 'online' | 'offline' | 'unknown';
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  revenue: number;
  recentUsers: Array<{
    id: number;
    first_name: string;
    username?: string;
    last_seen: string;
  }>;
  lastUpdate: string;
}

export const TelegramBotReport = ({ refreshTrigger, dateRange }: TelegramBotReportProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<TelegramStats>({
    botStatus: 'unknown',
    totalUsers: 0,
    activeUsers: 0,
    totalMessages: 0,
    revenue: 0,
    recentUsers: [],
    lastUpdate: ''
  });

  const loadTelegramData = async () => {
    setLoading(true);
    
    try {
      // Fetch real Telegram bot statistics
      const { telegramBotApi } = await import('@/services/telegramBotApi');
      const result = await telegramBotApi.getDashboardStats();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch Telegram stats');
      }
      
      const telegramStats = result.data;

      // Process the Telegram bot stats
      const processedStats = {
        totalUsers: telegramStats?.totalUsers || 0,
        activeUsers: telegramStats?.activeUsers || 0,
        totalMessages: 0, // Not available in current API
        revenue: telegramStats?.totalRevenue || 0,
        recentUsers: telegramStats?.recentUsers || []
      };

      setStats({
        botStatus: 'online',
        ...processedStats,
        lastUpdate: new Date().toISOString()
      });

    } catch (error: any) {

      // Set fallback data to show the error state
      setStats(prev => ({
        ...prev,
        botStatus: 'offline',
        lastUpdate: new Date().toISOString()
      }));

      toast({
        title: "Telegram Bot API Error",
        description: error.message || "Failed to load Telegram bot data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTelegramData();
  }, [refreshTrigger, dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
  };

  const getStatusBadge = (status: 'online' | 'offline' | 'unknown') => {
    const variants = {
      online: 'default',
      offline: 'destructive',
      unknown: 'secondary'
    } as const;
    
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Telegram Bot Report</h2>
          <p className="text-sm text-muted-foreground">
            Data from {dateRange.preset === 'custom' 
              ? `${dateRange.from.toLocaleDateString()} to ${dateRange.to.toLocaleDateString()}`
              : dateRange.preset.toUpperCase()
            }
          </p>
        </div>
        <Button onClick={loadTelegramData} disabled={loading} size="sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Bot Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Bot Status
            </CardTitle>
            {getStatusBadge(stats.botStatus)}
          </div>
        </CardHeader>
        
        <CardContent>
          {stats.botStatus === 'offline' ? (
            <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Bot is offline or unreachable</p>
                <p className="text-sm text-destructive/80">
                  Check API connection and bot configuration
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium">Total Users</p>
                        <p className="text-lg font-bold">{stats.totalUsers.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">Active Users</p>
                        <p className="text-lg font-bold">{stats.activeUsers.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium">Messages</p>
                        <p className="text-lg font-bold">{stats.totalMessages.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-orange-600" />
                      <div>
                        <p className="text-sm font-medium">Revenue</p>
                        <p className="text-sm font-bold">{formatCurrency(stats.revenue)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Users */}
              {stats.recentUsers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.recentUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <p className="font-medium">{user.first_name}</p>
                            {user.username && (
                              <p className="text-sm text-muted-foreground">@{user.username}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {new Date(user.last_seen).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              Last updated: {stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleString() : 'Never'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
