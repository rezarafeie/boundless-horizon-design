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
import { Pencil, Plus, Trash2, Ticket, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface DiscountCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  description?: string;
  applicable_plans: string[];
  usage_limit_per_user?: number;
  total_usage_limit?: number;
  current_usage_count: number;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

export const DiscountsManagement = () => {
  const [editingDiscount, setEditingDiscount] = useState<DiscountCode | null>(null);
  const [showNewDiscountForm, setShowNewDiscountForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: discounts, isLoading, error } = useQuery({
    queryKey: ['admin-discounts'],
    queryFn: async () => {
      console.log('=== DISCOUNTS: Starting fetch ===');
      
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('DISCOUNTS: Raw response:', { data, error, count: data?.length });
      
      if (error) {
        console.error('DISCOUNTS: Query error:', error);
        throw error;
      }
      
      console.log('DISCOUNTS: Successfully fetched', data?.length || 0, 'discounts');
      return data as DiscountCode[];
    },
    retry: 1
  });

  const saveDiscountMutation = useMutation({
    mutationFn: async (discountData: Partial<DiscountCode> & { id?: string }) => {
      console.log('DISCOUNTS: Saving discount data:', discountData);
      
      if (discountData.id) {
        console.log('DISCOUNTS: Updating existing discount');
        const { id, ...updateData } = discountData;
        const { error } = await supabase
          .from('discount_codes')
          .update(updateData)
          .eq('id', id);
        if (error) {
          console.error('DISCOUNTS: Update error:', error);
          throw error;
        }
      } else {
        console.log('DISCOUNTS: Creating new discount');
        const insertData = {
          code: discountData.code!,
          discount_type: discountData.discount_type!,
          discount_value: discountData.discount_value!,
          description: discountData.description,
          applicable_plans: discountData.applicable_plans || ['all'],
          usage_limit_per_user: discountData.usage_limit_per_user,
          total_usage_limit: discountData.total_usage_limit,
          expires_at: discountData.expires_at,
          is_active: discountData.is_active ?? true,
        };
        console.log('DISCOUNTS: Insert data:', insertData);
        const { data, error } = await supabase
          .from('discount_codes')
          .insert(insertData)
          .select();
        if (error) {
          console.error('DISCOUNTS: Insert error:', error);
          throw error;
        }
        console.log('DISCOUNTS: Insert successful:', data);
      }
    },
    onSuccess: () => {
      console.log('DISCOUNTS: Save mutation successful');
      queryClient.invalidateQueries({ queryKey: ['admin-discounts'] });
      setEditingDiscount(null);
      setShowNewDiscountForm(false);
      toast.success('Discount code saved successfully');
    },
    onError: (error: any) => {
      console.error('DISCOUNTS: Save mutation error:', error);
      toast.error('Failed to save discount code: ' + error.message);
    }
  });

  const deleteDiscountMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('DISCOUNTS: Deleting discount:', id);
      const { error } = await supabase
        .from('discount_codes')
        .delete()
        .eq('id', id);
      if (error) {
        console.error('DISCOUNTS: Delete error:', error);
        throw error;
      }
      console.log('DISCOUNTS: Delete successful');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-discounts'] });
      toast.success('Discount code deleted successfully');
    },
    onError: (error: any) => {
      console.error('DISCOUNTS: Delete mutation error:', error);
      toast.error('Failed to delete discount code: ' + error.message);
    }
  });

  const DiscountForm = ({ discount, onSave, onCancel }: {
    discount?: DiscountCode;
    onSave: (discount: Partial<DiscountCode>) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState({
      code: discount?.code || '',
      discount_type: discount?.discount_type || 'percentage' as 'percentage' | 'fixed',
      discount_value: discount?.discount_value || 0,
      description: discount?.description || '',
      applicable_plans: discount?.applicable_plans || ['all'],
      usage_limit_per_user: discount?.usage_limit_per_user || 1,
      total_usage_limit: discount?.total_usage_limit || undefined,
      expires_at: discount?.expires_at ? discount.expires_at.split('T')[0] : '',
      is_active: discount?.is_active ?? true,
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      console.log('DISCOUNTS: Form submitted with data:', formData);
      const submitData = {
        ...formData,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        id: discount?.id
      };
      onSave(submitData);
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>{discount ? 'Edit Discount Code' : 'Create New Discount Code'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Discount Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="WELCOME10"
                  required
                />
              </div>
              <div>
                <Label htmlFor="discount_type">Discount Type</Label>
                <Select value={formData.discount_type} onValueChange={(value: 'percentage' | 'fixed') => 
                  setFormData({ ...formData, discount_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="discount_value">
                  Discount Value {formData.discount_type === 'percentage' ? '(%)' : '(Toman)'}
                </Label>
                <Input
                  id="discount_value"
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="usage_limit_per_user">Usage Limit per User</Label>
                <Input
                  id="usage_limit_per_user"
                  type="number"
                  value={formData.usage_limit_per_user}
                  onChange={(e) => setFormData({ ...formData, usage_limit_per_user: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="total_usage_limit">Total Usage Limit</Label>
                <Input
                  id="total_usage_limit"
                  type="number"
                  value={formData.total_usage_limit || ''}
                  onChange={(e) => setFormData({ ...formData, total_usage_limit: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description for this discount code"
              />
            </div>

            <div>
              <Label htmlFor="expires_at">Expiry Date (Optional)</Label>
              <Input
                id="expires_at"
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex space-x-2">
              <Button type="submit">Save Discount Code</Button>
              <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  };

  const getStatusBadge = (discount: DiscountCode) => {
    if (!discount.is_active) {
      return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
    }
    if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
      return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
    }
    if (discount.total_usage_limit && discount.current_usage_count >= discount.total_usage_limit) {
      return <Badge className="bg-orange-100 text-orange-800">Limit Reached</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Active</Badge>;
  };

  console.log('DISCOUNTS: Component render - isLoading:', isLoading, 'discounts count:', discounts?.length, 'error:', error);

  if (error) {
    console.error('DISCOUNTS: Component error state:', error);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Discount Codes</h1>
          <p className="text-gray-600">Error loading discount codes</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-red-600">
              <p>Error loading discount codes: {error?.message || 'Unknown error'}</p>
              <p className="text-sm mt-2">Check the browser console for more details.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    console.log('DISCOUNTS: Component loading state');
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Discount Codes</h1>
          <p className="text-gray-600">Loading discount codes...</p>
        </div>
      </div>
    );
  }

  const stats = discounts ? {
    total: discounts.length,
    active: discounts.filter(d => d.is_active && (!d.expires_at || new Date(d.expires_at) > new Date())).length,
    totalUsage: discounts.reduce((sum, d) => sum + d.current_usage_count, 0),
  } : { total: 0, active: 0, totalUsage: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Discount Codes</h1>
          <p className="text-gray-600">
            Manage discount codes and promotions ({discounts?.length || 0} codes found)
          </p>
        </div>
        <Button onClick={() => setShowNewDiscountForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Discount Code
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Ticket className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Codes</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Codes</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Ticket className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Usage</p>
                <p className="text-2xl font-bold">{stats.totalUsage}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showNewDiscountForm && (
        <DiscountForm
          onSave={(discount) => saveDiscountMutation.mutate(discount)}
          onCancel={() => setShowNewDiscountForm(false)}
        />
      )}

      {editingDiscount && (
        <DiscountForm
          discount={editingDiscount}
          onSave={(discount) => saveDiscountMutation.mutate(discount)}
          onCancel={() => setEditingDiscount(null)}
        />
      )}

      <div className="grid gap-6">
        {discounts?.map((discount) => (
          <Card key={discount.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">{discount.code}</code>
                    {getStatusBadge(discount)}
                  </CardTitle>
                  <CardDescription>{discount.description}</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingDiscount(discount)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteDiscountMutation.mutate(discount.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Discount:</span>
                  <p>
                    {discount.discount_value}
                    {discount.discount_type === 'percentage' ? '%' : ' Toman'}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Usage:</span>
                  <p>
                    {discount.current_usage_count}
                    {discount.total_usage_limit ? ` / ${discount.total_usage_limit}` : ' (unlimited)'}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Per User Limit:</span>
                  <p>{discount.usage_limit_per_user}</p>
                </div>
                <div>
                  <span className="font-medium">Expires:</span>
                  <p>{discount.expires_at ? new Date(discount.expires_at).toLocaleDateString() : 'Never'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {(!discounts || discounts.length === 0) && !isLoading && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 mb-4">No discount codes found.</p>
              <Button onClick={() => setShowNewDiscountForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Discount Code
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
