import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Settings, Globe, Server } from 'lucide-react';
import { CountrySelector } from './CountrySelector';
import { Country } from '@/data/countries';

interface Plan {
  id: string;
  plan_id: string;
  name_en: string;
  name_fa: string;
  description_en?: string;
  description_fa?: string;
  price_per_gb: number;
  api_type: 'marzban' | 'marzneshin';
  default_data_limit_gb: number;
  default_duration_days: number;
  is_active: boolean;
  is_visible: boolean;
  assigned_panel_id?: string;
  available_countries?: Country[];
  created_at: string;
  updated_at: string;
  panel_servers?: {
    id: string;
    name: string;
    type: string;
    health_status: string;
    is_active: boolean;
  };
}

interface PanelServer {
  id: string;
  name: string;
  type: 'marzban' | 'marzneshin';
  health_status: 'online' | 'offline' | 'unknown';
  is_active: boolean;
  country_en: string;
}

const PlansManagement = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [panels, setPanels] = useState<PanelServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  
  const [formData, setFormData] = useState({
    plan_id: '',
    name_en: '',
    name_fa: '',
    description_en: '',
    description_fa: '',
    price_per_gb: 0,
    api_type: 'marzban' as 'marzban' | 'marzneshin',
    default_data_limit_gb: 10,
    default_duration_days: 30,
    is_active: true,
    is_visible: true,
    assigned_panel_id: 'none',
    available_countries: [] as Country[]
  });

  const fetchPanels = async () => {
    try {
      const { data, error } = await supabase
        .from('panel_servers')
        .select('id, name, type, health_status, is_active, country_en')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      // Cast the data to proper types
      const typedPanels: PanelServer[] = (data || []).map(panel => ({
        ...panel,
        type: panel.type as 'marzban' | 'marzneshin',
        health_status: panel.health_status as 'online' | 'offline' | 'unknown'
      }));
      
      setPanels(typedPanels);
    } catch (error) {
      console.error('Error fetching panels:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch panels',
        variant: 'destructive'
      });
    }
  };

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select(`
          *,
          panel_servers (
            id,
            name,
            type,
            health_status,
            is_active
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to properly handle available_countries and api_type
      const transformedPlans: Plan[] = (data || []).map(plan => {
        let availableCountries: Country[] = [];
        
        // Safely parse available_countries from Json to Country[]
        if (plan.available_countries && Array.isArray(plan.available_countries)) {
          availableCountries = (plan.available_countries as unknown[])
            .filter((country: any) => 
              country && 
              typeof country === 'object' && 
              typeof country.code === 'string' && 
              typeof country.name === 'string' && 
              typeof country.flag === 'string'
            )
            .map((country: any) => ({
              code: country.code,
              name: country.name,
              flag: country.flag
            })) as Country[];
        }
        
        return {
          ...plan,
          api_type: plan.api_type as 'marzban' | 'marzneshin',
          available_countries: availableCountries
        };
      });

      setPlans(transformedPlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch plans',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchPanels();
  }, []);

  const handleSave = async () => {
    try {
      const planData = {
        plan_id: formData.plan_id,
        name_en: formData.name_en,
        name_fa: formData.name_fa,
        description_en: formData.description_en,
        description_fa: formData.description_fa,
        price_per_gb: formData.price_per_gb,
        api_type: formData.api_type,
        default_data_limit_gb: formData.default_data_limit_gb,
        default_duration_days: formData.default_duration_days,
        is_active: formData.is_active,
        is_visible: formData.is_visible,
        assigned_panel_id: formData.assigned_panel_id === 'none' ? null : formData.assigned_panel_id || null,
        available_countries: formData.available_countries.map(country => ({
          code: country.code,
          name: country.name,
          flag: country.flag
        })) as any // Cast to Json type
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Plan updated successfully'
        });
      } else {
        const { error } = await supabase
          .from('subscription_plans')
          .insert(planData);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Plan created successfully'
        });
      }

      setIsDialogOpen(false);
      setEditingPlan(null);
      resetForm();
      fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to save plan',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (plan: Plan) => {
    console.log('Editing plan:', plan);
    setEditingPlan(plan);
    setFormData({
      plan_id: plan.plan_id,
      name_en: plan.name_en,
      name_fa: plan.name_fa,
      description_en: plan.description_en || '',
      description_fa: plan.description_fa || '',
      price_per_gb: plan.price_per_gb,
      api_type: plan.api_type,
      default_data_limit_gb: plan.default_data_limit_gb,
      default_duration_days: plan.default_duration_days,
      is_active: plan.is_active,
      is_visible: plan.is_visible,
      assigned_panel_id: plan.assigned_panel_id || 'none',
      available_countries: plan.available_countries || []
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;

    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Plan deleted successfully'
      });
      
      fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete plan',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      plan_id: '',
      name_en: '',
      name_fa: '',
      description_en: '',
      description_fa: '',
      price_per_gb: 0,
      api_type: 'marzban',
      default_data_limit_gb: 10,
      default_duration_days: 30,
      is_active: true,
      is_visible: true,
      assigned_panel_id: 'none',
      available_countries: []
    });
  };

  const handleCountryChange = (countries: Country[]) => {
    setFormData(prev => ({ ...prev, available_countries: countries }));
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading plans...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Plans Management</h1>
            <p className="text-muted-foreground">Manage subscription plans and their panel assignments</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingPlan(null); }} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
              <DialogHeader>
                <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
                <DialogDescription>
                  {editingPlan ? 'Update plan details' : 'Create a new subscription plan'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="plan_id">Plan ID</Label>
                    <Input
                      id="plan_id"
                      value={formData.plan_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, plan_id: e.target.value }))}
                      placeholder="e.g., pro, lite"
                    />
                  </div>
                  <div>
                    <Label htmlFor="api_type">API Type</Label>
                    <Select value={formData.api_type} onValueChange={(value: 'marzban' | 'marzneshin') => 
                      setFormData(prev => ({ ...prev, api_type: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="marzban">Marzban</SelectItem>
                        <SelectItem value="marzneshin">Marzneshin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Panel Assignment Section */}
                <div>
                  <Label htmlFor="assigned_panel" className="flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    Assigned Panel
                  </Label>
                  <Select 
                    value={formData.assigned_panel_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_panel_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a panel for this plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No panel assigned</SelectItem>
                      {panels.map((panel) => (
                        <SelectItem key={panel.id} value={panel.id}>
                          <div className="flex items-center gap-2">
                            <span>{panel.name}</span>
                            <Badge variant={panel.health_status === 'online' ? 'default' : 'destructive'}>
                              {panel.health_status}
                            </Badge>
                            <Badge variant="outline">{panel.type}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.assigned_panel_id === 'none' && (
                    <p className="text-sm text-amber-600 mt-1">
                      ⚠️ Plans without assigned panels cannot create subscriptions
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name_en">Name (English)</Label>
                    <Input
                      id="name_en"
                      value={formData.name_en}
                      onChange={(e) => setFormData(prev => ({ ...prev, name_en: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="name_fa">Name (Persian)</Label>
                    <Input
                      id="name_fa"
                      value={formData.name_fa}
                      onChange={(e) => setFormData(prev => ({ ...prev, name_fa: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="description_en">Description (English)</Label>
                    <Textarea
                      id="description_en"
                      value={formData.description_en}
                      onChange={(e) => setFormData(prev => ({ ...prev, description_en: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description_fa">Description (Persian)</Label>
                    <Textarea
                      id="description_fa"
                      value={formData.description_fa}
                      onChange={(e) => setFormData(prev => ({ ...prev, description_fa: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="price_per_gb">Price per GB (Toman)</Label>
                    <Input
                      id="price_per_gb"
                      type="number"
                      value={formData.price_per_gb}
                      onChange={(e) => setFormData(prev => ({ ...prev, price_per_gb: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="default_data_limit_gb">Default Data Limit (GB)</Label>
                    <Input
                      id="default_data_limit_gb"
                      type="number"
                      value={formData.default_data_limit_gb}
                      onChange={(e) => setFormData(prev => ({ ...prev, default_data_limit_gb: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="default_duration_days">Default Duration (Days)</Label>
                    <Input
                      id="default_duration_days"
                      type="number"
                      value={formData.default_duration_days}
                      onChange={(e) => setFormData(prev => ({ ...prev, default_duration_days: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                {/* Country Selection */}
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4" />
                    Available Countries
                  </Label>
                  <CountrySelector
                    selectedCountries={formData.available_countries}
                    onCountriesChange={handleCountryChange}
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_visible"
                      checked={formData.is_visible}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_visible: checked }))}
                    />
                    <Label htmlFor="is_visible">Visible</Label>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button onClick={handleSave} className="w-full sm:w-auto">
                  {editingPlan ? 'Update' : 'Create'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Subscription Plans
            </CardTitle>
            <CardDescription>
              Configure and manage all subscription plans with their assigned panels
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {/* Mobile Card View */}
            <div className="block sm:hidden space-y-4">
              {plans.map((plan) => (
                <Card key={plan.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{plan.name_en}</h3>
                        <p className="text-sm text-muted-foreground">{plan.name_fa}</p>
                        <p className="text-xs font-mono">{plan.plan_id}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{plan.price_per_gb.toLocaleString()} T</p>
                        <Badge variant={plan.api_type === 'marzban' ? 'default' : 'secondary'}>
                          {plan.api_type}
                        </Badge>
                      </div>
                    </div>
                    
                    <div>
                      {plan.panel_servers ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{plan.panel_servers.name}</span>
                          <Badge variant={plan.panel_servers.health_status === 'online' ? 'default' : 'destructive'}>
                            {plan.panel_servers.health_status}
                          </Badge>
                        </div>
                      ) : (
                        <Badge variant="destructive">No Panel</Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {plan.available_countries?.slice(0, 3).map((country) => (
                        <Badge key={country.code} variant="outline" className="text-xs">
                          {country.flag} {country.code}
                        </Badge>
                      ))}
                      {(plan.available_countries?.length || 0) > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{(plan.available_countries?.length || 0) - 3}
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <Badge variant={plan.is_active ? 'default' : 'destructive'}>
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {plan.is_visible && (
                        <Badge variant="outline">Visible</Badge>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(plan)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(plan.id)}
                        className="flex-1"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Assigned Panel</TableHead>
                    <TableHead>API Type</TableHead>
                    <TableHead>Price/GB</TableHead>
                    <TableHead>Countries</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-mono">{plan.plan_id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{plan.name_en}</div>
                          <div className="text-sm text-muted-foreground">{plan.name_fa}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {plan.panel_servers ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{plan.panel_servers.name}</span>
                            <Badge variant={plan.panel_servers.health_status === 'online' ? 'default' : 'destructive'}>
                              {plan.panel_servers.health_status}
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant="destructive">No Panel</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={plan.api_type === 'marzban' ? 'default' : 'secondary'}>
                          {plan.api_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{plan.price_per_gb.toLocaleString()} T</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {plan.available_countries?.slice(0, 3).map((country) => (
                            <Badge key={country.code} variant="outline" className="text-xs">
                              {country.flag} {country.code}
                            </Badge>
                          ))}
                          {(plan.available_countries?.length || 0) > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{(plan.available_countries?.length || 0) - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge variant={plan.is_active ? 'default' : 'destructive'}>
                            {plan.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {plan.is_visible && (
                            <Badge variant="outline">Visible</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(plan)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(plan.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {plans.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No plans found. Create your first plan to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlansManagement;
