import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, User, FileText, Search, Plus, Users, CreditCard, Settings } from 'lucide-react';
import { telegramBotApi } from '@/services/telegramBotApi';

const AdminTelegramBot = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);

  // Search User
  const [searchChatId, setSearchChatId] = useState('');
  
  // Add User
  const [newUserChatId, setNewUserChatId] = useState('');
  
  // Search Invoice
  const [searchUsername, setSearchUsername] = useState('');
  
  // Add Invoice
  const [invoice, setInvoice] = useState({
    username: '',
    chatId: '',
    location: '',
    nameProduct: 'product1',
    status: 'active',
    note: ''
  });

  const handleSearchUser = async () => {
    if (!searchChatId.trim()) {
      toast({ title: "Error", description: "Please enter a Chat ID", variant: "destructive" });
      return;
    }

    setLoading('search-user');
    const result = await telegramBotApi.getUserById(searchChatId);
    setLoading(null);

    if (result.success) {
      setResults({ type: 'user', data: result.data });
      toast({ title: "Success", description: "User found successfully" });
    } else {
      toast({ title: "Error", description: result.error || "User not found", variant: "destructive" });
      setResults({ type: 'error', message: result.error });
    }
  };

  const handleAddUser = async () => {
    if (!newUserChatId.trim()) {
      toast({ title: "Error", description: "Please enter a Chat ID", variant: "destructive" });
      return;
    }

    setLoading('add-user');
    const result = await telegramBotApi.addUser(newUserChatId);
    setLoading(null);

    if (result.success) {
      toast({ title: "Success", description: "User created successfully" });
      setNewUserChatId('');
      setResults({ type: 'success', message: 'User created successfully' });
    } else {
      toast({ title: "Error", description: result.error || "Failed to create user", variant: "destructive" });
      setResults({ type: 'error', message: result.error });
    }
  };

  const handleFetchUsers = async () => {
    setLoading('fetch-users');
    const result = await telegramBotApi.getAllUsers(50);
    setLoading(null);

    if (result.success) {
      setResults({ type: 'users', data: result.data });
      toast({ title: "Success", description: `Found ${Array.isArray(result.data) ? result.data.length : 0} users` });
    } else {
      toast({ title: "Error", description: result.error || "Failed to fetch users", variant: "destructive" });
      setResults({ type: 'error', message: result.error });
    }
  };

  const handleSearchInvoice = async () => {
    if (!searchUsername.trim()) {
      toast({ title: "Error", description: "Please enter a username", variant: "destructive" });
      return;
    }

    setLoading('search-invoice');
    const result = await telegramBotApi.getInvoiceByUsername(searchUsername);
    setLoading(null);

    if (result.success) {
      setResults({ type: 'invoice', data: result.data });
      toast({ title: "Success", description: "Invoice found successfully" });
    } else {
      toast({ title: "Error", description: result.error || "Invoice not found", variant: "destructive" });
      setResults({ type: 'error', message: result.error });
    }
  };

  const handleAddInvoice = async () => {
    if (!invoice.username || !invoice.chatId || !invoice.location) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setLoading('add-invoice');
    const result = await telegramBotApi.addInvoice({
      username: invoice.username,
      nameProduct: invoice.nameProduct,
      chatId: invoice.chatId,
      location: invoice.location,
      status: invoice.status as 'active' | 'pending' | 'failed',
      note: invoice.note
    });
    setLoading(null);

    if (result.success) {
      toast({ title: "Success", description: "Invoice created successfully" });
      setInvoice({ username: '', chatId: '', location: '', nameProduct: 'product1', status: 'active', note: '' });
      setResults({ type: 'success', message: 'Invoice created successfully' });
    } else {
      toast({ title: "Error", description: result.error || "Failed to create invoice", variant: "destructive" });
      setResults({ type: 'error', message: result.error });
    }
  };

  const handleFetchInvoices = async () => {
    setLoading('fetch-invoices');
    const result = await telegramBotApi.getAllInvoices(50);
    setLoading(null);

    if (result.success) {
      setResults({ type: 'invoices', data: result.data });
      toast({ title: "Success", description: `Found ${Array.isArray(result.data) ? result.data.length : 0} invoices` });
    } else {
      toast({ title: "Error", description: result.error || "Failed to fetch invoices", variant: "destructive" });
      setResults({ type: 'error', message: result.error });
    }
  };

  const handleFetchServices = async () => {
    setLoading('fetch-services');
    const result = await telegramBotApi.getAllServices(50);
    setLoading(null);

    if (result.success) {
      setResults({ type: 'services', data: result.data });
      toast({ title: "Success", description: `Found ${Array.isArray(result.data) ? result.data.length : 0} services` });
    } else {
      toast({ title: "Error", description: result.error || "Failed to fetch services", variant: "destructive" });
      setResults({ type: 'error', message: result.error });
    }
  };

  const renderResults = () => {
    if (!results) return null;

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          {results.type === 'error' && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive">{results.message}</p>
            </div>
          )}
          
          {results.type === 'success' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700">{results.message}</p>
            </div>
          )}
          
          {results.type === 'user' && (
            <div className="space-y-2">
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
                {JSON.stringify(results.data, null, 2)}
              </pre>
            </div>
          )}
          
          {results.type === 'users' && (
            <div className="space-y-4">
              <p className="font-medium">Found {Array.isArray(results.data) ? results.data.length : 0} users</p>
              <div className="max-h-64 overflow-auto">
                <pre className="bg-muted p-4 rounded-lg text-sm">
                  {JSON.stringify(results.data, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          {results.type === 'invoice' && (
            <div className="space-y-2">
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
                {JSON.stringify(results.data, null, 2)}
              </pre>
            </div>
          )}
          
          {results.type === 'invoices' && (
            <div className="space-y-4">
              <p className="font-medium">Found {Array.isArray(results.data) ? results.data.length : 0} invoices</p>
              <div className="max-h-64 overflow-auto">
                <pre className="bg-muted p-4 rounded-lg text-sm">
                  {JSON.stringify(results.data, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          {results.type === 'services' && (
            <div className="space-y-4">
              <p className="font-medium">Found {Array.isArray(results.data) ? results.data.length : 0} services</p>
              <div className="max-h-64 overflow-auto">
                <pre className="bg-muted p-4 rounded-lg text-sm">
                  {JSON.stringify(results.data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Telegram Bot Panel</h1>
          <p className="text-muted-foreground">
            Manage users, invoices, and services through the Telegram bot API
          </p>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="invoices">
              <CreditCard className="w-4 h-4 mr-2" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="services">
              <Settings className="w-4 h-4 mr-2" />
              Services
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Search User */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Search User
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="search-chat-id">Chat ID</Label>
                    <Input
                      id="search-chat-id"
                      value={searchChatId}
                      onChange={(e) => setSearchChatId(e.target.value)}
                      placeholder="Enter chat ID"
                    />
                  </div>
                  <Button 
                    onClick={handleSearchUser} 
                    disabled={loading === 'search-user'}
                    className="w-full"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    {loading === 'search-user' ? 'Searching...' : 'Search by Chat ID'}
                  </Button>
                </CardContent>
              </Card>

              {/* Add User */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add New User
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="new-chat-id">Chat ID</Label>
                    <Input
                      id="new-chat-id"
                      value={newUserChatId}
                      onChange={(e) => setNewUserChatId(e.target.value)}
                      placeholder="Enter chat ID"
                    />
                  </div>
                  <Button 
                    onClick={handleAddUser} 
                    disabled={loading === 'add-user'}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {loading === 'add-user' ? 'Creating...' : 'Create User'}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Get All Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  All Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleFetchUsers} 
                  disabled={loading === 'fetch-users'}
                >
                  <Users className="w-4 h-4 mr-2" />
                  {loading === 'fetch-users' ? 'Loading...' : 'Fetch Users'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Search Invoice */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Search Invoice
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="search-username">Username</Label>
                    <Input
                      id="search-username"
                      value={searchUsername}
                      onChange={(e) => setSearchUsername(e.target.value)}
                      placeholder="Enter username"
                    />
                  </div>
                  <Button 
                    onClick={handleSearchInvoice} 
                    disabled={loading === 'search-invoice'}
                    className="w-full"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    {loading === 'search-invoice' ? 'Searching...' : 'Search Invoice'}
                  </Button>
                </CardContent>
              </Card>

              {/* Add Invoice */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add New Invoice
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="invoice-username">Username *</Label>
                      <Input
                        id="invoice-username"
                        value={invoice.username}
                        onChange={(e) => setInvoice({...invoice, username: e.target.value})}
                        placeholder="Username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="invoice-chat-id">Chat ID *</Label>
                      <Input
                        id="invoice-chat-id"
                        value={invoice.chatId}
                        onChange={(e) => setInvoice({...invoice, chatId: e.target.value})}
                        placeholder="Chat ID"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="invoice-location">Location *</Label>
                      <Input
                        id="invoice-location"
                        value={invoice.location}
                        onChange={(e) => setInvoice({...invoice, location: e.target.value})}
                        placeholder="e.g. Tehran"
                      />
                    </div>
                    <div>
                      <Label htmlFor="invoice-product">Product Name</Label>
                      <Input
                        id="invoice-product"
                        value={invoice.nameProduct}
                        onChange={(e) => setInvoice({...invoice, nameProduct: e.target.value})}
                        placeholder="product1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="invoice-status">Status</Label>
                    <Select 
                      value={invoice.status} 
                      onValueChange={(value) => setInvoice({...invoice, status: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="invoice-note">Note (Optional)</Label>
                    <Textarea
                      id="invoice-note"
                      value={invoice.note}
                      onChange={(e) => setInvoice({...invoice, note: e.target.value})}
                      placeholder="Optional note"
                      rows={2}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleAddInvoice} 
                    disabled={loading === 'add-invoice'}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {loading === 'add-invoice' ? 'Creating...' : 'Create Invoice'}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Get All Invoices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  All Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleFetchInvoices} 
                  disabled={loading === 'fetch-invoices'}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {loading === 'fetch-invoices' ? 'Loading...' : 'Fetch All Invoices'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Service Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleFetchServices} 
                  disabled={loading === 'fetch-services'}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {loading === 'fetch-services' ? 'Loading...' : 'Fetch Services'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {renderResults()}
      </div>
    </AdminLayout>
  );
};

export default AdminTelegramBot;