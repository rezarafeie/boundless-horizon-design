
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TestUserCard } from "./TestUserCard";
import { Loader2, Search, Users, Calendar, Trash2, RefreshCw } from "lucide-react";

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
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Test Users Management</h1>
        <Button onClick={loadTestUsers} disabled={loading} size="sm" className="w-full sm:w-auto">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards - Mobile optimized 2x2 grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Total</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-2 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Active</CardTitle>
            <div className="h-2 w-2 bg-green-500 rounded-full flex-shrink-0"></div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Expired</CardTitle>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-2 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-yellow-600">{stats.expired}</div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Deleted</CardTitle>
            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-2 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-red-600">{stats.deleted}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters - Mobile responsive */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:space-x-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by email, phone, or username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-1 sm:gap-0 sm:space-x-4 sm:flex">
              <div className="space-y-2 sm:w-40">
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

              <div className="space-y-2 sm:w-40">
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
          </div>
        </CardContent>
      </Card>

      {/* Test Users List */}
      <div className="space-y-4">
        <h2 className="text-base sm:text-lg font-semibold">
          Test Users ({filteredTestUsers.length})
        </h2>

        {filteredTestUsers.length === 0 ? (
          <Card>
            <CardContent className="py-6 sm:py-8">
              <div className="text-center text-muted-foreground text-sm sm:text-base">
                {testUsers.length === 0 
                  ? "No test users found. Test accounts will appear here once users create free trials."
                  : "No test users match the current filters."
                }
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4">
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
