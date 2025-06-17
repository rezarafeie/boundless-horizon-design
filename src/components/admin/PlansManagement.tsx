
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Plus, Trash2, Settings, X } from 'lucide-react';
import { toast } from 'sonner';

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
}

interface Panel {
  id: string;
  name: string;
  type: 'marzban' | 'marzneshin';
  country_en: string;
  country_fa: string;
  default_inbounds: any[];
  is_active: boolean;
  health_status: 'online' | 'offline' | 'unknown';
}

interface PlanPanelMapping {
  id: string;
  plan_id: string;
  panel_id: string;
  is_primary: boolean;
  inbound_ids: string[];
}

export const PlansManagement = () => {
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: plans, isLoading, error } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      console.log('=== PLANS: Starting fetch ===');
      
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('PLANS: Raw response:', { data, error, count: data?.length });
      
      if (error) {
        console.error('PLANS: Query error:', error);
        throw error;
      }
      
      console.log('PLANS: Successfully fetched', data?.length || 0, 'plans');
      return data as Plan[];
    },
    retry: 1
  });

  const { data: panels } = useQuery({
    queryKey: ['admin-panels-for-plans'],
    queryFn: async () => {
      console.log('=== PLANS: Fetching panels for plan creation ===');
      
      const { data, error } = await supabase
        .from('panel_servers')
        .select('*')
        .eq('is_active', true); // Only check if panel is active, not health status
      
      console.log('PLANS: Panels response:', { data, error, count: data?.length });
      
      if (error) {
        console.error('PLANS: Panels query error:', error);
        throw error;
      }
      
      console.log('PLANS: Successfully fetched', data?.length || 0, 'active panels');
      return data as Panel[];
    },
    retry: 1
  });

  const { data: planPanelMappings } = useQuery({
    queryKey: ['plan-panel-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_panel_mappings')
        .select('*');
      
      if (error) {
        console.error('PLANS: Plan panel mappings query error:', error);
        throw error;
      }
      
      return data as PlanPanelMapping[];
    }
  });

  const savePlanMutation = useMutation({
    mutationFn: async (planData: Partial<Plan> & { id?: string; selectedPanels?: { panelId: string; isPrimary: boolean; inboundIds: string[] }[] }) => {
      console.log('PLANS: Saving plan data:', planData);
      
      const { selectedPanels, ...planFields } = planData;
      
      if (planData.id) {
        console.log('PLANS: Updating existing plan');
        const { id, ...updateData } = planFields;
        const { error } = await supabase
          .from('subscription_plans')
          .update(updateData)
          .eq('id', id);
        if (error) {
          console.error('PLANS: Update error:', error);
          throw error;
        }
      } else {
        console.log('PLANS: Creating new plan');
        const insertData = {
          plan_id: planFields.plan_id!,
          name_en: planFields.name_en!,
          name_fa: planFields.name_fa!,
          description_en: planFields.description_en || '',
          description_fa: planFields.description_fa || '',
          price_per_gb: planFields.price_per_gb!,
          api_type: planFields.api_type!,
          default_data_limit_gb: planFields.default_data_limit_gb!,
          default_duration_days: planFields.default_duration_days!,
          is_active: planFields.is_active ?? true,
          is_visible: planFields.is_visible ?? true,
        };
        console.log('PLANS: Insert data:', insertData);
        const { data, error } = await supabase
          .from('subscription_plans')
          .insert(insertData)
          .select()
          .single();
        if (error) {
          console.error('PLANS: Insert error:', error);
          throw error;
        }
        console.log('PLANS: Insert successful:', data);
        
        // Now handle panel mappings
        if (selectedPanels && selectedPanels.length > 0) {
          console.log('PLANS: Creating panel mappings for new plan');
          const mappings = selectedPanels.map(panel => ({
            plan_id: data.id,
            panel_id: panel.panelId,
            is_primary: panel.isPrimary,
            inbound_ids: panel.inboundIds
          }));
          
          const { error: mappingError } = await supabase
            .from('plan_panel_mappings')
            .insert(mappings);
            
          if (mappingError) {
            console.error('PLANS: Panel mapping error:', mappingError);
            throw mappingError;
          }
          console.log('PLANS: Panel mappings created successfully');
        }
      }
    },
    onSuccess: () => {
      console.log('PLANS: Save mutation successful');
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      queryClient.invalidateQueries({ queryKey: ['plan-panel-mappings'] });
      setEditingPlan(null);
      setShowNewPlanForm(false);
      toast.success('Plan saved successfully');
    },
    onError: (error: any) => {
      console.error('PLANS: Save mutation error:', error);
      toast.error('Failed to save plan: ' + error.message);
    }
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('PLANS: Deleting plan:', id);
      
      // First delete panel mappings
      await supabase
        .from('plan_panel_mappings')
        .delete()
        .eq('plan_id', id);
      
      // Then delete the plan
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', id);
      if (error) {
        console.error('PLANS: Delete error:', error);
        throw error;
      }
      console.log('PLANS: Delete successful');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      queryClient.invalidateQueries({ queryKey: ['plan-panel-mappings'] });
      toast.success('Plan deleted successfully');
    },
    onError: (error: any) => {
      console.error('PLANS: Delete mutation error:', error);
      toast.error('Failed to delete plan: ' + error.message);
    }
  });

  const PlanForm = ({ plan, onSave, onCancel }: {
    plan?: Plan;
    onSave: (plan: Partial<Plan> & { selectedPanels: { panelId: string; isPrimary: boolean; inboundIds: string[] }[] }) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState({
      plan_id: plan?.plan_id || '',
      name_en: plan?.name_en || '',
      name_fa: plan?.name_fa || '',
      description_en: plan?.description_en || '',
      description_fa: plan?.description_fa || '',
      price_per_gb: plan?.price_per_gb || 0,
      api_type: plan?.api_type || 'marzban' as 'marzban' | 'marzneshin',
      default_data_limit_gb: plan?.default_data_limit_gb || 10,
      default_duration_days: plan?.default_duration_days || 30,
      is_active: plan?.is_active ?? true,
      is_visible: plan?.is_visible ?? true,
    });

    const [selectedPanels, setSelectedPanels] = useState<{ panelId: string; isPrimary: boolean; inboundIds: string[] }[]>([]);

    const togglePanelSelection = (panelId: string) => {
      setSelectedPanels(prev => {
        const exists = prev.find(p => p.panelId === panelId);
        if (exists) {
          return prev.filter(p => p.panelId !== panelId);
        } else {
          return [...prev, { panelId, isPrimary: false, inboundIds: [] }];
        }
      });
    };

    const setPrimaryPanel = (panelId: string) => {
      setSelectedPanels(prev => 
        prev.map(p => ({ ...p, isPrimary: p.panelId === panelId }))
      );
    };

    const updateInbounds = (panelId: string, inboundIds: string[]) => {
      setSelectedPanels(prev =>
        prev.map(p => p.panelId === panelId ? { ...p, inboundIds } : p)
      );
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      console.log('PLANS: Form submitted with data:', formData, 'selectedPanels:', selectedPanels);
      
      if (!panels || panels.length === 0) {
        toast.error('No active panels available. Add panels first before creating plans.');
        return;
      }

      if (selectedPanels.length === 0) {
        toast.error('Please select at least one panel for this plan.');
        return;
      }

      const hasPrimary = selectedPanels.some(p => p.isPrimary);
      if (!hasPrimary && selectedPanels.length > 1) {
        toast.error('Please select a primary panel when multiple panels are chosen.');
        return;
      }

      onSave({ 
        ...formData, 
        id: plan?.id,
        selectedPanels
      });
    };

    if (!panels || panels.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>⚠️ No Active Panels Available</CardTitle>
            <CardDescription>
              You need to add and activate at least one panel server before creating subscription plans.
              Panels can have any health status (online, offline, or unknown) as long as they are marked as active.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onCancel} variant="outline">
              Cancel
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>{plan ? 'Edit Plan' : 'Add New Plan'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="plan_id">Plan ID</Label>
                <Input
                  id="plan_id"
                  value={formData.plan_id}
                  onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                  placeholder="unique-plan-id"
                  required
                />
              </div>
              <div>
                <Label htmlFor="api_type">API Type</Label>
                <Select value={formData.api_type} onValueChange={(value: 'marzban' | 'marzneshin') => 
                  setFormData({ ...formData, api_type: value })}>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name_en">Plan Name (English)</Label>
                <Input
                  id="name_en"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="name_fa">Plan Name (Persian)</Label>
                <Input
                  id="name_fa"
                  value={formData.name_fa}
                  onChange={(e) => setFormData({ ...formData, name_fa: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="description_en">Description (English)</Label>
                <Input
                  id="description_en"
                  value={formData.description_en}
                  onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description_fa">Description (Persian)</Label>
                <Input
                  id="description_fa"
                  value={formData.description_fa}
                  onChange={(e) => setFormData({ ...formData, description_fa: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="price_per_gb">Price per GB (Toman)</Label>
                <Input
                  id="price_per_gb"
                  type="number"
                  value={formData.price_per_gb}
                  onChange={(e) => setFormData({ ...formData, price_per_gb: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="default_data_limit_gb">Default Data Limit (GB)</Label>
                <Input
                  id="default_data_limit_gb"
                  type="number"
                  value={formData.default_data_limit_gb}
                  onChange={(e) => setFormData({ ...formData, default_data_limit_gb: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="default_duration_days">Default Duration (Days)</Label>
                <Input
                  id="default_duration_days"
                  type="number"
                  value={formData.default_duration_days}
                  onChange={(e) => setFormData({ ...formData, default_duration_days: parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>

            {/* Panel Selection */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Select Panels for this Plan</Label>
              <p className="text-sm text-gray-600">Choose which panel servers will handle subscriptions for this plan. Health status can be online, offline, or unknown.</p>
              
              <div className="grid gap-4">
                {panels.map((panel) => {
                  const isSelected = selectedPanels.some(p => p.panelId === panel.id);
                  const selectedPanel = selectedPanels.find(p => p.panelId === panel.id);
                  
                  return (
                    <Card key={panel.id} className={`${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => togglePanelSelection(panel.id)}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{panel.name}</span>
                                <Badge variant={panel.is_active ? 'default' : 'secondary'}>
                                  {panel.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                                <Badge variant={panel.health_status === 'online' ? 'default' : 'secondary'}>
                                  {panel.health_status}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">{panel.country_en} - {panel.type}</p>
                            </div>
                          </div>
                          
                          {isSelected && selectedPanels.length > 1 && (
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={selectedPanel?.isPrimary || false}
                                onCheckedChange={() => setPrimaryPanel(panel.id)}
                              />
                              <Label className="text-sm">Primary</Label>
                            </div>
                          )}
                        </div>
                        
                        {isSelected && panel.default_inbounds && panel.default_inbounds.length > 0 && (
                          <div className="mt-3">
                            <Label className="text-sm font-medium">Available Inbounds:</Label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {panel.default_inbounds.map((inbound: any, index: number) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={selectedPanel?.inboundIds.includes(inbound.tag) || false}
                                    onCheckedChange={(checked) => {
                                      const currentIds = selectedPanel?.inboundIds || [];
                                      const newIds = checked 
                                        ? [...currentIds, inbound.tag]
                                        : currentIds.filter(id => id !== inbound.tag);
                                      updateInbounds(panel.id, newIds);
                                    }}
                                  />
                                  <span className="text-sm">{inbound.tag}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_visible"
                  checked={formData.is_visible}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_visible: checked })}
                />
                <Label htmlFor="is_visible">Visible to Users</Label>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button type="submit">Save Plan</Button>
              <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  };

  const getPlanPanels = (planId: string) => {
    if (!planPanelMappings || !panels) return [];
    
    const mappings = planPanelMappings.filter(m => m.plan_id === planId);
    return mappings.map(mapping => {
      const panel = panels.find(p => p.id === mapping.panel_id);
      return panel ? { ...panel, mapping } : null;
    }).filter(Boolean);
  };

  console.log('PLANS: Component render - isLoading:', isLoading, 'plans count:', plans?.length, 'panels count:', panels?.length, 'error:', error);

  if (error) {
    console.error('PLANS: Component error state:', error);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="text-gray-600">Error loading plans</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-red-600">
              <p>Error loading plans: {error?.message || 'Unknown error'}</p>
              <p className="text-sm mt-2">Check the browser console for more details.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    console.log('PLANS: Component loading state');
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="text-gray-600">Loading plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="text-gray-600">
            Manage your VPN subscription plans ({plans?.length || 0} plans found, {panels?.length || 0} active panels available)
          </p>
        </div>
        <Button onClick={() => setShowNewPlanForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Plan
        </Button>
      </div>

      {showNewPlanForm && (
        <PlanForm
          onSave={(plan) => savePlanMutation.mutate(plan)}
          onCancel={() => setShowNewPlanForm(false)}
        />
      )}

      {editingPlan && (
        <PlanForm
          plan={editingPlan}
          onSave={(plan) => savePlanMutation.mutate(plan)}
          onCancel={() => setEditingPlan(null)}
        />
      )}

      <div className="grid gap-6">
        {plans?.map((plan) => {
          const planPanels = getPlanPanels(plan.id);
          
          return (
            <Card key={plan.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5" />
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {plan.name_en} ({plan.name_fa})
                        <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                          {plan.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant={plan.is_visible ? 'default' : 'outline'}>
                          {plan.is_visible ? 'Visible' : 'Hidden'}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{plan.description_en} / {plan.description_fa}</CardDescription>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingPlan(plan)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deletePlanMutation.mutate(plan.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div>
                    <span className="font-medium">Plan ID:</span>
                    <p className="font-mono">{plan.plan_id}</p>
                  </div>
                  <div>
                    <span className="font-medium">API Type:</span>
                    <p>{plan.api_type}</p>
                  </div>
                  <div>
                    <span className="font-medium">Price per GB:</span>
                    <p>{plan.price_per_gb.toLocaleString()} Toman</p>
                  </div>
                  <div>
                    <span className="font-medium">Defaults:</span>
                    <p>{plan.default_data_limit_gb}GB / {plan.default_duration_days} days</p>
                  </div>
                </div>
                
                {/* Show Associated Panels */}
                {planPanels.length > 0 && (
                  <div>
                    <span className="font-medium text-sm">Associated Panels:</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      {planPanels.map((panelData: any, index: number) => {
                        if (!panelData) return null;
                        const { mapping, ...panel } = panelData;
                        return (
                          <div key={index} className="p-2 bg-gray-50 dark:bg-gray-800 rounded flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">{panel.name}</span>
                                {mapping.is_primary && <Badge variant="default">Primary</Badge>}
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {panel.country_en} - {panel.type}
                              </p>
                            </div>
                            <Badge variant={panel.health_status === 'online' ? 'default' : 'secondary'}>
                              {panel.health_status}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        
        {(!plans || plans.length === 0) && !isLoading && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 mb-4">No subscription plans found.</p>
              <Button onClick={() => setShowNewPlanForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Plan
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
