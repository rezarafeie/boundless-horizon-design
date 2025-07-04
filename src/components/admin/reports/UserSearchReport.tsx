
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, User, Database, Server, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DebugLogger } from './DebugLogger';
import { useDebugLogger } from '@/hooks/useDebugLogger';

interface UserSearchReportProps {
  searchQuery: string;
}

interface SearchResult {
  source: 'database' | 'panel' | 'telegram';
  type: string;
  data: any;
}

export const UserSearchReport = ({ searchQuery }: UserSearchReportProps) => {
  const { toast } = useToast();
  const { logs, logApiCall, logInfo, logError, clearLogs } = useDebugLogger();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const searchAllSystems = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const searchResults: SearchResult[] = [];

    try {
      logInfo('Starting user search across all systems', { 
        query: query.trim(),
        timestamp: new Date().toISOString() 
      });

      // Search in database (subscriptions)
      try {
        const dbResults = await logApiCall('Search database subscriptions', async () => {
          const { data, error } = await supabase
            .from('subscriptions')
            .select(`
              *,
              subscription_plans(name_en, name_fa)
            `)
            .or(`username.ilike.%${query}%,mobile.ilike.%${query}%,email.ilike.%${query}%`)
            .order('created_at', { ascending: false })
            .limit(20);

          if (error) throw error;
          return data || [];
        });

        dbResults.forEach(sub => {
          searchResults.push({
            source: 'database',
            type: 'subscription',
            data: sub
          });
        });

        logInfo('Database search completed', { count: dbResults.length });
      } catch (error) {
        logError('Database search failed', error);
      }

      // Search in active panels
      try {
        const panelsData = await logApiCall('Get active panels for search', async () => {
          const { data, error } = await supabase
            .from('panel_servers')
            .select('*')
            .eq('is_active', true);
          
          if (error) throw error;
          return data || [];
        });

        // Search each panel for the user
        for (const panel of panelsData) {
          try {
            const panelResults = await logApiCall(`Search panel ${panel.name}`, async () => {
              // Try to get user from panel
              if (panel.type === 'marzban') {
                const { data, error } = await supabase.functions.invoke('marzban-get-user', {
                  body: { 
                    panelId: panel.id,
                    username: query.trim()
                  }
                });
                
                if (error) throw error;
                if (data?.success && data?.user) {
                  return [{
                    ...data.user,
                    panel_name: panel.name,
                    panel_country: panel.country_en
                  }];
                }
              } else if (panel.type === 'marzneshin') {
                const { data, error } = await supabase.functions.invoke('marzneshin-get-user', {
                  body: { 
                    panelId: panel.id,
                    username: query.trim()
                  }
                });
                
                if (error) throw error;
                if (data?.success && data?.user) {
                  return [{
                    ...data.user,
                    panel_name: panel.name,
                    panel_country: panel.country_en
                  }];
                }
              }
              
              return [];
            });

            panelResults.forEach(user => {
              searchResults.push({
                source: 'panel',
                type: panel.type,
                data: user
              });
            });

          } catch (error) {
            logError(`Panel search failed for ${panel.name}`, error);
          }
        }

        logInfo('Panel search completed', { panelsSearched: panelsData.length });
      } catch (error) {
        logError('Panel search setup failed', error);
      }

      // Search in Telegram bot (mock for now)
      try {
        const telegramResults = await logApiCall('Search Telegram users', async () => {
          // Mock Telegram search - in real implementation this would search bot users
          if (query.toLowerCase().includes('test') || query.includes('123')) {
            return [{
              id: Math.floor(Math.random() * 1000000),
              first_name: 'Telegram User',
              username: query.toLowerCase().includes('test') ? 'test_user' : undefined,
              phone: query.includes('123') ? '+98912' + query : undefined,
              subscription_status: 'active',
              last_activity: new Date().toISOString()
            }];
          }
          return [];
        });

        telegramResults.forEach(user => {
          searchResults.push({
            source: 'telegram',
            type: 'bot_user',
            data: user
          });
        });

        logInfo('Telegram search completed', { count: telegramResults.length });
      } catch (error) {
        logError('Telegram search failed', error);
      }

      setResults(searchResults);
      logInfo('Search completed across all systems', { 
        totalResults: searchResults.length,
        bySource: {
          database: searchResults.filter(r => r.source === 'database').length,
          panel: searchResults.filter(r => r.source === 'panel').length,
          telegram: searchResults.filter(r => r.source === 'telegram').length
        }
      });

    } catch (error: any) {
      logError('Search failed', error);
      toast({
        title: "Search Error",
        description: "Failed to search across systems: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchAllSystems(searchQuery);
    }, 500); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'database': return <Database className="w-4 h-4" />;
      case 'panel': return <Server className="w-4 h-4" />;
      case 'telegram': return <MessageSquare className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'database': return 'blue';
      case 'panel': return 'green';
      case 'telegram': return 'purple';
      default: return 'gray';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fa-IR');
  };

  return (
    <div className="space-y-4">
      <DebugLogger logs={logs} onClear={clearLogs} />
      
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Search Results</h2>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="w-4 h-4 animate-pulse" />
            Searching...
          </div>
        )}
      </div>

      {!searchQuery || searchQuery.trim().length < 2 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Enter at least 2 characters to search</p>
          </CardContent>
        </Card>
      ) : results.length === 0 && !loading ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Found {results.length} result(s) for "{searchQuery}"
          </div>
          
          {results.map((result, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {getSourceIcon(result.source)}
                    {result.source === 'database' ? 'Database Record' :
                     result.source === 'panel' ? `${result.type} Panel` :
                     'Telegram Bot'}
                  </CardTitle>
                  <Badge variant={getSourceColor(result.source) as any}>
                    {result.source}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                {result.source === 'database' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Username</p>
                        <p className="text-sm">{result.data.username}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Mobile</p>
                        <p className="text-sm">{result.data.mobile}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Status</p>
                        <Badge variant={result.data.status === 'active' ? 'default' : 'secondary'}>
                          {result.data.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Price</p>
                        <p className="text-sm">{result.data.price_toman?.toLocaleString()} تومان</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-sm">{formatDate(result.data.created_at)}</p>
                    </div>
                  </div>
                )}
                
                {result.source === 'panel' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Username</p>
                        <p className="text-sm">{result.data.username}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Panel</p>
                        <p className="text-sm">{result.data.panel_name} ({result.data.panel_country})</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Status</p>
                        <Badge variant={result.data.status === 'active' ? 'default' : 'secondary'}>
                          {result.data.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Data Limit</p>
                        <p className="text-sm">{(result.data.data_limit / (1024*1024*1024)).toFixed(2)} GB</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {result.source === 'telegram' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Name</p>
                        <p className="text-sm">{result.data.first_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Username</p>
                        <p className="text-sm">{result.data.username || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Phone</p>
                        <p className="text-sm">{result.data.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Status</p>
                        <Badge variant={result.data.subscription_status === 'active' ? 'default' : 'secondary'}>
                          {result.data.subscription_status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
