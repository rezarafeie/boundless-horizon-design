import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TestUserCard } from "./TestUserCard";
import { Loader2, Search, Users, Calendar, Trash2 } from "lucide-react";

interface TestUser {
  id: string;
  email: string;
  phone_number: string;
  username: string;
  panel_id: string;
  panel_name: string;
  subscription_url: string;
  expire_date: string;
  data_limit_bytes: number;
  ip_address: string | null;
  device_info: any;
  status: 'active' | 'expired' | 'deleted';
  created_at: string;
  updated_at: string;
}

export const TestUsersManagement = () => {
  const { toast } = useToast();
  const [testUsers, setTestUsers] = useState<TestUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [panelFilter, setPanelFilter] = useState("all");
  const [availablePanels, setAvailablePanels] = useState<{ id: string; name: string }[]>([]);

  const loadTestUsers = async () => {
    try {
      setLoading(true);
      console.log('ADMIN_TESTS: Loading test users...');

      const { data, error } = await supabase
        .from('test_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('ADMIN_TESTS: Error loading test users:', error);
        toast({
          title: "Error",
          description: "Failed to load test users",
          variant: "destructive"
        });
        return;
      }

      console.log('ADMIN_TESTS: Loaded test users:', data?.length || 0);
      setTestUsers((data || []).map(user => ({
        ...user,
        ip_address: user.ip_address as string | null
      })) as TestUser[]);

      // Extract unique panels
      const panels = [...new Set(data?.map(user => ({ id: user.panel_id, name: user.panel_name })) || [])]
        .filter((panel, index, self) => 
          index === self.findIndex(p => p.id === panel.id)
        );
      setAvailablePanels(panels);

    } catch (error) {
      console.error('ADMIN_TESTS: Error loading test users:', error);
      toast({
        title: "Error",
        description: "Failed to load test users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTestUsers();
  }, []);

  // Filter test users based on search and filters
  const filteredTestUsers = testUsers.filter(user => {
    const matchesSearch = !searchTerm || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone_number.includes(searchTerm) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    const matchesPanel = panelFilter === "all" || user.panel_id === panelFilter;

    return matchesSearch && matchesStatus && matchesPanel;
  });

  // Calculate statistics
  const stats = {
    total: testUsers.length,
    active: testUsers.filter(user => user.status === 'active' && new Date(user.expire_date) > new Date()).length,
    expired: testUsers.filter(user => user.status === 'active' && new Date(user.expire_date) <= new Date()).length,
    deleted: testUsers.filter(user => user.status === 'deleted').length
  };

  const handleUserUpdate = () => {
    loadTestUsers(); // Reload data after any update
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading test users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Test Users Management</h1>
        <Button onClick={loadTestUsers} disabled={loading}>
          <Search className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.expired}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deleted</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.deleted}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search by email, phone, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Panel</label>
              <Select value={panelFilter} onValueChange={setPanelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All panels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Panels</SelectItem>
                  {availablePanels.map((panel) => (
                    <SelectItem key={panel.id} value={panel.id}>
                      {panel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Users List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Test Users ({filteredTestUsers.length})
        </h2>

        {filteredTestUsers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                {testUsers.length === 0 
                  ? "No test users found. Test accounts will appear here once users create free trials."
                  : "No test users match the current filters."
                }
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredTestUsers.map((user) => (
              <TestUserCard 
                key={user.id} 
                user={user} 
                onUpdate={handleUserUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};