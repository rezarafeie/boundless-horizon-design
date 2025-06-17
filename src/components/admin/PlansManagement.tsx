import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Pencil, Plus, Trash2, AlertCircle } from 'lucide-react';
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
  is_visible: boolean;
  is_active: boolean;
}

interface Panel {
  id: string;
  name: string;
  type: 'marzban' | 'marzneshin';
  panel_url: string;
  country_en: string;
  country_fa: string;
  is_active: boolean;
  health_status: 'online' | 'offline' | 'unknown';
  default_inbounds: any[];
}

interface PlanPanelMapping {
  id: string;
  plan_id: string;
  panel_id: string;
  inbound_ids: any[];
  is_primary: boolean;
}

export const PlansManagement = () => {
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const queryClient = useQueryClient();

  // Fetch plans with panel mappings
  const { data: plans, isLoading, error } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      console.log('=== PLANS: Starting fetch ===');
      
      const { data, error } = await supabase
        .from('subscription_plans')
        .select(`
          *,
          plan_panel_mappings (
            id,
            panel_id,
            inbound_ids,
            is_primary,
            panel_servers (
              name,
              country_en,
              health_status
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      console.log('PLANS: Raw response:', { data, error, count: data?.length });
      
      if (error) {
        console.error('PLANS: Query error:', error);
        throw error;
      }
      
      console.log('PLANS: Successfully fetched', data?.length || 0, 'plans');
      return data as (Plan & { plan_panel_mappings: any[] })[];
    },
    retry: 1
  });

  // Fetch active panels
  const { data: activePanels } = useQuery({
    queryKey: ['active-panels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_servers')
        .select('*')
        .eq('is_active', true)
        .eq('health_status', 'online')
        .order('name');
      
      if (error) throw error;
      return data as Panel[];
    }
  });

  const savePlanMutation = useMutation({
    mutationFn: async (planData: Partial<Plan> & { id?: string; selectedPanelId?: string; selectedInbounds?: string[] }) => {
      console.log('PLANS: Saving plan data:', planData);
      
      if (!planData.selectedPanelId) {
        throw new Error('Panel selection is required');
      }

      if (planData.id) {
        console.log('PLANS: Updating existing plan');
        const { id, selectedPanelId, selectedInbounds, ...updateData } = planData;
        
        // Update plan
        const { error: planError } = await supabase
          .from('subscription_plans')
          .update(updateData)
          .eq('id', id);
        
        if (planError) throw planError;

        // Update panel mapping
        const { error: mappingError } = await supabase
          .from('plan_panel_mappings')
          .upsert({
            plan_id: id,
            panel_id: selectedPanelId,
            inbound_ids: selectedInbounds || [],
            is_primary: true
          }, {
            onConflict: 'plan_id,panel_id'
          });

        if (mappingError) throw mappingError;
      } else {
        console.log('PLANS: Creating new plan');
        const { selectedPanelId, selectedInbounds, ...insertData } = planData;
        
        const planInsertData = {
          plan_id: insertData.plan_id!,
          name_en: insertData.name_en!,
          name_fa: insertData.name_fa!,
          description_en: insertData.description_en,
          description_fa: insertData.description_fa,
          price_per_gb: insertData.price_per_gb!,
          api_type: insertData.api_type!,
          default_data_limit_gb: insertData.default_data_limit_gb!,
          default_duration_days: insertData.default_duration_days!,
          is_visible: insertData.is_visible ?? true,
          is_active: insertData.is_active ?? true,
        };

        const { data: newPlan, error: planError } = await supabase
          .from('subscription_plans')
          .insert(planInsertData)
          .select()
          .single();

        if (planError) throw planError;

        // Create panel mapping
        const { error: mappingError } = await supabase
          .from('plan_panel_mappings')
          .insert({
            plan_id: newPlan.id,
            panel_id: selectedPanelId,
            inbound_ids: selectedInbounds || [],
            is_primary: true
          });

        if (mappingError) throw mappingError;
      }
    },
    onSuccess: () => {
      console.log('PLANS: Save mutation successful');
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
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
      
      // Delete panel mappings first
      await supabase
        .from('plan_panel_mappings')
        .delete()
        .eq('plan_id', id);

      // Delete plan
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      toast.success('Plan deleted successfully');
    },
    onError: (error: any) => {
      console.error('PLANS: Delete mutation error:', error);
      toast.error('Failed to delete plan: ' + error.message);
    }
  });

  const PlanForm = ({ plan, onSave, onCancel }: {
    plan?: Plan & { plan_panel_mappings?: any[] };
    onSave: (plan: any) => void;
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
      is_visible: plan?.is_visible ?? true,
      is_active: plan?.is_active ?? true,
      selectedPanelId: plan?.plan_panel_mappings?.[0]?.panel_id || '',
      selectedInbounds: plan?.plan_panel_mappings?.[0]?.inbound_ids || []
    });

    const selectedPanel = activePanels?.find(p => p.id === formData.selectedPanelId);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      console.log('PLANS: Form submitted with data:', formData);
      onSave({ ...formData, id: plan?.id });
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>{plan ? 'Edit Plan' : 'Create New Plan'}</CardTitle>
          {(!activePanels || activePanels.length === 0) && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">
                No active panels available. You need to add and activate panels before creating plans.
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Panel Selection - Required First */}
            <div>
              <Label htmlFor="panel">Panel Server *</Label>
              <Select 
                value={formData.selectedPanelId} 
                onValueChange={(value) => {
                  const panel = activePanels?.find(p => p.id === value);
                  setFormData({ 
                    ...formData, 
                    selectedPanelId: value,
                    api_type: panel?.type as 'marzban' | 'marzneshin' || 'marzban'
                  });
                }}
                disabled={!activePanels || activePanels.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an active panel" />
                </SelectTrigger>
                <SelectContent>
                  {activePanels?.map((panel) => (
                    <SelectItem key={panel.id} value={panel.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant={panel.health_status === 'online' ? 'default' : 'secondary'}>
                          {panel.health_status}
                        </Badge>
                        {panel.name} ({panel.country_en})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.selectedPanelId && selectedPanel && (
                <p className="text-sm text-gray-600 mt-1">
                  API Type will be set to: {selectedPanel.type}
                </p>
              )}
            </div>

            {/* Inbound Selection */}
            {selectedPanel && selectedPanel.default_inbounds && selectedPanel.default_inbounds.length > 0 && (
              <div>
                <Label>Available Inbounds</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {selectedPanel.default_inbounds.map((inbound: any, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`inbound-${index}`}
                        checked={formData.selectedInbounds.includes(inbound.tag || inbound.name || inbound)}
                        onChange={(e) => {
                          const inboundValue = inbound.tag || inbound.name || inbound;
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              selectedInbounds: [...formData.selectedInbounds, inboundValue]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selectedInbounds: formData.selectedInbounds.filter(i => i !== inboundValue)
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`inbound-${index}`} className="text-sm">
                        {inbound.tag || inbound.name || inbound}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="plan_id">Plan ID</Label>
                <Input
                  id="plan_id"
                  value={formData.plan_id}
                  onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>API Type</Label>
                <Input
                  value={formData.api_type}
                  disabled
                  className="bg-gray-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name_en">Name (English)</Label>
                <Input
                  id="name_en"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="name_fa">Name (Persian)</Label>
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
                <Textarea
                  id="description_en"
                  value={formData.description_en}
                  onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description_fa">Description (Persian)</Label>
                <Textarea
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

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_visible"
                  checked={formData.is_visible}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_visible: checked })}
                />
                <Label htmlFor="is_visible">Visible to Users</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button 
                type="submit" 
                disabled={!formData.selectedPanelId || !activePanels || activePanels.length === 0}
              >
                Save Plan
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  };

  console.log('PLANS: Component render - isLoading:', isLoading, 'plans count:', plans?.length, 'error:', error);

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
              <Button 
                onClick={() => window.location.reload()} 
                className="mt-4"
              >
                Retry
              </Button>
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
            Manage your subscription plans ({plans?.length || 0} plans found)
          </p>
          {(!activePanels || activePanels.length === 0) && (
            <p className="text-amber-600 text-sm mt-1">
              ⚠️ No active panels available. Add panels first before creating plans.
            </p>
          )}
        </div>
        <Button 
          onClick={() => setShowNewPlanForm(true)}
          disabled={!activePanels || activePanels.length === 0}
        >
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
          plan={editingPlan as any}
          onSave={(plan) => savePlanMutation.mutate(plan)}
          onCancel={() => setEditingPlan(null)}
        />
      )}

      <div className="grid gap-6">
        {plans?.map((plan: any) => (
          <Card key={plan.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {plan.name_en}
                    <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {plan.is_visible && <Badge variant="outline">Visible</Badge>}
                  </CardTitle>
                  <CardDescription>{plan.description_en}</CardDescription>
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Plan ID:</span>
                  <p>{plan.plan_id}</p>
                </div>
                <div>
                  <span className="font-medium">API Type:</span>
                  <p className="capitalize">{plan.api_type}</p>
                </div>
                <div>
                  <span className="font-medium">Price per GB:</span>
                  <p>{plan.price_per_gb.toLocaleString()} Toman</p>
                </div>
                <div>
                  <span className="font-medium">Default Limits:</span>
                  <p>{plan.default_data_limit_gb}GB / {plan.default_duration_days} days</p>
                </div>
              </div>
              
              {/* Show connected panels */}
              {plan.plan_panel_mappings && plan.plan_panel_mappings.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <span className="font-medium text-sm">Connected Panels:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {plan.plan_panel_mappings.map((mapping: any) => (
                      <Badge key={mapping.id} variant="outline">
                        {mapping.panel_servers?.name} ({mapping.panel_servers?.country_en})
                        <span className={`ml-2 w-2 h-2 rounded-full ${
                          mapping.panel_servers?.health_status === 'online' ? 'bg-green-500' : 'bg-red-500'
                        }`}></span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        
        {(!plans || plans.length === 0) && !isLoading && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 mb-4">No subscription plans found.</p>
              <Button 
                onClick={() => setShowNewPlanForm(true)}
                disabled={!activePanels || activePanels.length === 0}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Plan
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
