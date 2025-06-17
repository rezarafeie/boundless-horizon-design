
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
import { Pencil, Plus, Trash2 } from 'lucide-react';
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

export const PlansManagement = () => {
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: plans, isLoading, error } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      console.log('Fetching subscription plans...');
      
      // Try to fetch with explicit error handling
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('Plans query result:', { data, error });
      
      if (error) {
        console.error('Error fetching plans:', error);
        throw error;
      }
      
      console.log(`Successfully fetched ${data?.length || 0} plans`);
      return data as Plan[];
    },
    retry: 1
  });

  const savePlanMutation = useMutation({
    mutationFn: async (planData: Partial<Plan> & { id?: string }) => {
      console.log('Saving plan:', planData);
      
      if (planData.id) {
        const { id, ...updateData } = planData;
        const { error } = await supabase
          .from('subscription_plans')
          .update(updateData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const insertData = {
          plan_id: planData.plan_id!,
          name_en: planData.name_en!,
          name_fa: planData.name_fa!,
          description_en: planData.description_en,
          description_fa: planData.description_fa,
          price_per_gb: planData.price_per_gb!,
          api_type: planData.api_type!,
          default_data_limit_gb: planData.default_data_limit_gb!,
          default_duration_days: planData.default_duration_days!,
          is_visible: planData.is_visible ?? true,
          is_active: planData.is_active ?? true,
        };
        console.log('Inserting plan:', insertData);
        const { error } = await supabase
          .from('subscription_plans')
          .insert(insertData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      setEditingPlan(null);
      setShowNewPlanForm(false);
      toast.success('Plan saved successfully');
    },
    onError: (error: any) => {
      console.error('Error saving plan:', error);
      toast.error('Failed to save plan: ' + error.message);
    }
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting plan:', id);
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
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete plan: ' + error.message);
    }
  });

  const PlanForm = ({ plan, onSave, onCancel }: {
    plan?: Plan;
    onSave: (plan: Partial<Plan>) => void;
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
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave({ ...formData, id: plan?.id });
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>{plan ? 'Edit Plan' : 'Create New Plan'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Button type="submit">Save Plan</Button>
              <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  };

  // Show error state
  if (error) {
    console.error('Plans component error:', error);
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
        {plans?.map((plan) => (
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
            </CardContent>
          </Card>
        ))}
        
        {(!plans || plans.length === 0) && !isLoading && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 mb-4">No subscription plans found.</p>
              <Button onClick={() => setShowNewPlanForm(true)}>
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
