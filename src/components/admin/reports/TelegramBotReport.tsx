
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, MessageCircle, Receipt, Users, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TelegramBotReportProps {
  refreshTrigger: number;
}

interface TelegramUser {
  chat_id: string;
  username: string;
  first_name: string;
  last_name: string;
  created_at: string;
  status: string;
}

interface TelegramInvoice {
  id: string;
  chat_id: string;
  amount: number;
  status: string;
  product_name: string;
  created_at: string;
}

interface TelegramStats {
  totalUsers: number;
  totalInvoices: number;
  activeServices: number;
  totalRevenue: number;
  users: TelegramUser[];
  invoices: TelegramInvoice[];
}

export const TelegramBotReport = ({ refreshTrigger }: TelegramBotReportProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<TelegramStats>({
    totalUsers: 0,
    totalInvoices: 0,
    activeServices: 0,
    totalRevenue: 0,
    users: [],
    invoices: []
  });

  const loadTelegramData = async () => {
    setLoading(true);
    try {
      // Get users from Telegram bot API
      const usersResponse = await fetch('http://b.bnets.co/api/users', {
        method: 'POST',
        headers: {
          'Token': '6169452dd5a55778f35fcedaa1fbd7b9',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          actions: 'users',
          limit: 1000
        })
      });

      const usersData = await usersResponse.json();

      // Get invoices from Telegram bot API
      const invoicesResponse = await fetch('http://b.bnets.co/api/invoice', {
        method: 'POST',
        headers: {
          'Token': '6169452dd5a55778f35fcedaa1fbd7b9',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          actions: 'invoices',
          limit: 1000,
          page: 1
        })
      });

      const invoicesData = await invoicesResponse.json();

      // Process the data
      const users = usersData.data || [];
      const invoices = invoicesData.data || [];

      const totalRevenue = invoices.reduce((sum: number, invoice: any) => 
        sum + (invoice.amount || 0), 0
      );

      const activeServices = users.filter((user: any) => 
        user.status === 'active'
      ).length;

      setStats({
        totalUsers: users.length,
        totalInvoices: invoices.length,
        activeServices,
        totalRevenue,
        users: users.slice(0, 20), // Show first 20 users
        invoices: invoices.slice(0, 20) // Show first 20 invoices
      });

    } catch (error) {
      console.error('Error loading Telegram data:', error);
      toast({
        title: "Error",
        description: "Failed to load Telegram bot data. Check API connection.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTelegramData();
  }, [refreshTrigger]);

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      // Search in the loaded users first
      const filteredUsers = stats.users.filter(user => 
        user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.chat_id.includes(searchQuery) ||
        user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Could also make additional API call for more specific search
      console.log('Search results:', filteredUsers);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Search failed",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Telegram Bot Report</h2>
        <Button onClick={loadTelegramData} disabled={loading} size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Bot Data
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Bot Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Search by username, chat_id, or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
            />
            <Button onClick={searchUsers} disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">In Telegram bot</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Services</CardTitle>
            <MessageCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeServices}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalInvoices}</div>
            <p className="text-xs text-muted-foreground">All invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Receipt className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">From bot invoices</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stats.users.map((user, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      @{user.username} • {user.chat_id}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{user.status}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(user.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              {stats.users.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No users data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stats.invoices.map((invoice, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{invoice.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Chat ID: {invoice.chat_id}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">{formatCurrency(invoice.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.status} • {formatDate(invoice.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              {stats.invoices.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No invoices data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
