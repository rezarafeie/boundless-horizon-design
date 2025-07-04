
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Database, MessageCircle, Server, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserSearchReportProps {
  searchQuery: string;
}

interface SearchResult {
  source: 'database' | 'panel' | 'telegram';
  username: string;
  status: string;
  details: any;
  panel_name?: string;
}

export const UserSearchReport = ({ searchQuery }: UserSearchReportProps) => {
  const { toast } = useToast();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    } else {
      setResults([]);
    }
  }, [searchQuery]);

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const searchResults: SearchResult[] = [];

      // Search in database
      await searchInDatabase(searchResults);
      
      // Search in panels
      await searchInPanels(searchResults);
      
      // Search in Telegram bot
      await searchInTelegramBot(searchResults);

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Some search sources may be unavailable",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const searchInDatabase = async (results: SearchResult[]) => {
    try {
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('*, subscription_plans(name_en, name_fa)')
        .or(`username.ilike.%${searchQuery}%,mobile.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;

      subscriptions?.forEach(sub => {
        results.push({
          source: 'database',
          username: sub.username,
          status: sub.status,
          details: {
            mobile: sub.mobile,
            email: sub.email || 'N/A',
            created_at: new Date(sub.created_at).toLocaleDateString(),
            plan: sub.subscription_plans?.name_en || 'Unknown',
            expire_at: sub.expire_at ? new Date(sub.expire_at).toLocaleDateString() : 'N/A',
            data_limit_gb: sub.data_limit_gb,
            price_toman: sub.price_toman
          }
        });
      });
    } catch (error) {
      console.error('Database search error:', error);
    }
  };

  const searchInPanels = async (results: SearchResult[]) => {
    try {
      // Get active panels
      const { data: panels, error } = await supabase
        .from('panel_servers')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      // Search in each panel
      for (const panel of panels || []) {
        try {
          const functionName = panel.type === 'marzban' ? 'marzban-get-user' : 'marzneshin-get-user';
          
          const { data, error: searchError } = await supabase.functions.invoke(functionName, {
            body: { 
              username: searchQuery,
              panelConfig: panel
            }
          });

          if (!searchError && data?.success && data?.user) {
            results.push({
              source: 'panel',
              username: data.user.username,
              status: data.user.status || (data.user.is_active ? 'active' : 'inactive'),
              panel_name: panel.name,
              details: {
                panel_name: panel.name,
                panel_type: panel.type,
                subscription_url: data.user.subscription_url || 'N/A',
                data_limit: data.user.data_limit ? `${Math.round(data.user.data_limit / (1024*1024*1024))} GB` : 'N/A',
                used_traffic: data.user.used_traffic ? `${Math.round(data.user.used_traffic / (1024*1024*1024))} GB` : '0 GB',
                expire_date: data.user.expire_date || data.user.expire ? 
                  new Date(data.user.expire_date || data.user.expire * 1000).toLocaleDateString() : 'N/A'
              }
            });
          }
        } catch (panelError) {
          console.error(`Search error in panel ${panel.name}:`, panelError);
        }
      }
    } catch (error) {
      console.error('Panels search error:', error);
    }
  };

  const searchInTelegramBot = async (results: SearchResult[]) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('http://b.bnets.co/api/users', {
        method: 'POST',
        headers: {
          'Token': '6169452dd5a55778f35fcedaa1fbd7b9',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          actions: 'users',
          limit: 1000
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        const users = data.data || [];
        
        const matchedUsers = users.filter((user: any) => 
          user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.chat_id.includes(searchQuery) ||
          user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        matchedUsers.forEach((user: any) => {
          results.push({
            source: 'telegram',
            username: user.username || `${user.first_name} ${user.last_name}`,
            status: user.status || 'unknown',
            details: {
              chat_id: user.chat_id,
              first_name: user.first_name || 'N/A',
              last_name: user.last_name || 'N/A',
              username: user.username || 'N/A',
              created_at: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A',
              last_seen: user.last_seen ? new Date(user.last_seen).toLocaleDateString() : 'N/A'
            }
          });
        });
      }
    } catch (error) {
      console.error('Telegram search error:', error);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'database': return <Database className="w-4 h-4" />;
      case 'panel': return <Server className="w-4 h-4" />;
      case 'telegram': return <MessageCircle className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'database': return 'bg-blue-100 text-blue-800';
      case 'panel': return 'bg-green-100 text-green-800';
      case 'telegram': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'online': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-yellow-100 text-yellow-800';
      case 'deleted':
      case 'disabled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!searchQuery.trim()) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Enter a search query to find users across all systems</p>
            <p className="text-sm mt-2">Search by username, mobile number, or chat ID</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Searching across all systems...</p>
            <p className="text-sm text-muted-foreground mt-1">Database • Panels • Telegram Bot</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">
        Search Results for "{searchQuery}" ({results.length} found)
      </h2>

      {results.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No users found matching "{searchQuery}"</p>
              <p className="text-sm mt-2">Try searching with a different username, mobile, or chat_id</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {results.map((result, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getSourceIcon(result.source)}
                    {result.username}
                    {result.panel_name && (
                      <Badge variant="outline" className="text-xs">
                        {result.panel_name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getSourceColor(result.source)}>
                      {result.source.toUpperCase()}
                    </Badge>
                    <Badge className={getStatusColor(result.status)}>
                      {result.status}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(result.details).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="text-sm font-medium capitalize">
                        {key.replace('_', ' ')}:
                      </span>
                      <span className="text-sm font-mono">
                        {value !== null && value !== undefined ? String(value) : 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
