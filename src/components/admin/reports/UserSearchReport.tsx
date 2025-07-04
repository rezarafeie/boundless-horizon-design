
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Database, MessageCircle, Server } from 'lucide-react';

interface UserSearchReportProps {
  searchQuery: string;
}

interface SearchResult {
  source: 'database' | 'panel' | 'telegram';
  username: string;
  status: string;
  details: any;
}

export const UserSearchReport = ({ searchQuery }: UserSearchReportProps) => {
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
      // This would search across all systems
      // For now, we'll simulate the search results
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate some results
      const mockResults: SearchResult[] = [
        {
          source: 'database',
          username: searchQuery,
          status: 'active',
          details: {
            mobile: '09123456789',
            email: 'user@example.com',
            created_at: '2025-07-01',
            plan: 'Lite'
          }
        },
        {
          source: 'panel',
          username: searchQuery,
          status: 'online',
          details: {
            data_used: '2.5 GB',
            expire_date: '2025-08-01',
            panel_name: 'Marzban Panel 1'
          }
        },
        {
          source: 'telegram',
          username: searchQuery,
          status: 'active',
          details: {
            chat_id: '123456789',
            first_name: 'John',
            last_name: 'Doe',
            last_seen: '2025-07-04'
          }
        }
      ];

      setResults(mockResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
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
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
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
