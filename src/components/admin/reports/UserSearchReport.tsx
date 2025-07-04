
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Database, MessageSquare, Server, Users, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '../DateRangeSelector';

interface UserSearchReportProps {
  searchQuery: string;
  dateRange: DateRange;
}

interface SearchResult {
  id: string;
  source: 'database' | 'panel' | 'telegram';
  type: 'subscription' | 'user' | 'telegram_user';
  username?: string;
  mobile?: string;
  email?: string;
  status?: string;
  panel_name?: string;
  created_at?: string;
  details: Record<string, any>;
}

export const UserSearchReport = ({ searchQuery, dateRange }: UserSearchReportProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchResults: SearchResult[] = [];

      // Search in database subscriptions with date filter
      if (sourceFilter === 'all' || sourceFilter === 'database') {
        const { data: subscriptions, error } = await supabase
          .from('subscriptions')
          .select('*')
          .or(`username.ilike.%${searchQuery}%,mobile.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString())
          .limit(20);

        if (!error && subscriptions) {
          subscriptions.forEach(sub => {
            searchResults.push({
              id: `db-${sub.id}`,
              source: 'database',
              type: 'subscription',
              username: sub.username,
              mobile: sub.mobile,
              email: sub.email,
              status: sub.status,
              created_at: sub.created_at,
              details: {
                price_toman: sub.price_toman,
                data_limit_gb: sub.data_limit_gb,
                duration_days: sub.duration_days,
                expire_at: sub.expire_at
              }
            });
          });
        }
      }

      // Search panels (mock data with date consideration)
      if (sourceFilter === 'all' || sourceFilter === 'panel') {
        // This would normally call panel APIs to search for users
        // For now, we'll add mock panel results
        if (searchQuery.toLowerCase().includes('test')) {
          searchResults.push({
            id: `panel-mock-1`,
            source: 'panel',
            type: 'user',
            username: `${searchQuery}_panel_user`,
            panel_name: 'Germany Panel',
            status: 'active',
            details: {
              data_used: '5.2 GB',
              data_limit: '10 GB',
              expire_date: '2025-08-04'
            }
          });
        }
      }

      // Mock Telegram search (would normally call Telegram API)
      if (sourceFilter === 'all' || sourceFilter === 'telegram') {
        if (searchQuery.length > 3) {
          searchResults.push({
            id: `tg-mock-1`,
            source: 'telegram',
            type: 'telegram_user',
            username: `@${searchQuery}_tg`,
            details: {
              first_name: 'Mock User',
              last_seen: new Date().toISOString(),
              chat_id: '123456789'
            }
          });
        }
      }

      setResults(searchResults);

    } catch (error: any) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: error.message || "Failed to search users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      const debounceTimer = setTimeout(() => {
        searchUsers();
      }, 500);
      return () => clearTimeout(debounceTimer);
    } else {
      setResults([]);
    }
  }, [searchQuery, sourceFilter, dateRange]);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'database':
        return <Database className="w-4 h-4 text-blue-600" />;
      case 'panel':
        return <Server className="w-4 h-4 text-green-600" />;
      case 'telegram':
        return <MessageSquare className="w-4 h-4 text-purple-600" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'expired':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">User Search Results</h2>
          <p className="text-sm text-muted-foreground">
            Search results from {dateRange.preset === 'custom' 
              ? `${dateRange.from.toLocaleDateString()} to ${dateRange.to.toLocaleDateString()}`
              : dateRange.preset.toUpperCase()
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="database">Database</SelectItem>
              <SelectItem value="panel">Panels</SelectItem>
              <SelectItem value="telegram">Telegram</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={searchUsers} disabled={loading} size="sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {!searchQuery.trim() ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Enter a search query to find users across all systems
            </p>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">Searching...</p>
          </CardContent>
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No users found matching "{searchQuery}"
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Found {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="grid gap-4">
            {results.map((result) => (
              <Card key={result.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {getSourceIcon(result.source)}
                      {result.username || result.mobile || 'Unknown User'}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {result.source}
                      </Badge>
                      {result.status && (
                        <Badge variant="secondary" className={`text-xs ${getStatusColor(result.status)}`}>
                          {result.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {result.panel_name && (
                    <p className="text-sm text-muted-foreground">Panel: {result.panel_name}</p>
                  )}
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Contact Info</h4>
                      <div className="space-y-1 text-sm">
                        {result.mobile && <p>Mobile: {result.mobile}</p>}
                        {result.email && <p>Email: {result.email}</p>}
                        {result.details.chat_id && <p>Chat ID: {result.details.chat_id}</p>}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Details</h4>
                      <div className="space-y-1 text-sm">
                        {result.details.price_toman && (
                          <p>Price: {result.details.price_toman.toLocaleString()} تومان</p>
                        )}
                        {result.details.data_limit_gb && (
                          <p>Data Limit: {result.details.data_limit_gb} GB</p>
                        )}
                        {result.details.data_used && (
                          <p>Data Used: {result.details.data_used}</p>
                        )}
                        {result.details.expire_date && (
                          <p>Expires: {new Date(result.details.expire_date).toLocaleDateString()}</p>
                        )}
                        {result.details.first_name && (
                          <p>Name: {result.details.first_name}</p>
                        )}
                        {result.created_at && (
                          <p>Created: {new Date(result.created_at).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
