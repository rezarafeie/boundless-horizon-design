
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
import { Pencil, Plus, Trash2, Server, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Panel {
  id: string;
  name: string;
  type: 'marzban' | 'marzneshin';
  panel_url: string;
  username: string;
  password: string;
  country_en: string;
  country_fa: string;
  default_inbounds: any[];
  is_active: boolean;
  health_status: 'online' | 'offline' | 'unknown';
  last_health_check?: string;
}

export const PanelsManagement = () => {
  const [editingPanel, setEditingPanel] = useState<Panel | null>(null);
  const [showNewPanelForm, setShowNewPanelForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: panels, isLoading } = useQuery({
    queryKey: ['admin-panels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_servers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Panel[];
    }
  });

  const savePanelMutation = useMutation({
    mutationFn: async (panel: Partial<Panel>) => {
      if (panel.id) {
        const { error } = await supabase
          .from('panel_servers')
          .update(panel)
          .eq('id', panel.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('panel_servers')
          .insert(panel);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-panels'] });
      setEditingPanel(null);
      setShowNewPanelForm(false);
      toast.success('Panel saved successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to save panel: ' + error.message);
    }
  });

  const deletePanelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('panel_servers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-panels'] });
      toast.success('Panel deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete panel: ' + error.message);
    }
  });

  const PanelForm = ({ panel, onSave, onCancel }: {
    panel?: Panel;
    onSave: (panel: Partial<Panel>) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState({
      name: panel?.name || '',
      type: panel?.type || 'marzban' as 'marzban' | 'marzneshin',
      panel_url: panel?.panel_url || '',
      username: panel?.username || '',
      password: panel?.password || '',
      country_en: panel?.country_en || '',
      country_fa: panel?.country_fa || '',
      default_inbounds: panel?.default_inbounds || [],
      is_active: panel?.is_active ?? true,
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave({ ...formData, id: panel?.id });
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>{panel ? 'Edit Panel' : 'Add New Panel'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Panel Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="type">Panel Type</Label>
                <Select value={formData.type} onValueChange={(value: 'marzban' | 'marzneshin') => 
                  setFormData({ ...formData, type: value })}>
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

            <div>
              <Label htmlFor="panel_url">Panel URL</Label>
              <Input
                id="panel_url"
                value={formData.panel_url}
                onChange={(e) => setFormData({ ...formData, panel_url: e.target.value })}
                placeholder="https://panel.example.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Admin Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Admin Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country_en">Country (English)</Label>
                <Input
                  id="country_en"
                  value={formData.country_en}
                  onChange={(e) => setFormData({ ...formData, country_en: e.target.value })}
                  placeholder="Germany"
                  required
                />
              </div>
              <div>
                <Label htmlFor="country_fa">Country (Persian)</Label>
                <Input
                  id="country_fa"
                  value={formData.country_fa}
                  onChange={(e) => setFormData({ ...formData, country_fa: e.target.value })}
                  placeholder="آلمان"
                  required
                />
              </div>
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
              <Button type="submit">Save Panel</Button>
              <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-100 text-green-800">Online</Badge>;
      case 'offline':
        return <Badge className="bg-red-100 text-red-800">Offline</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Panel Servers</h1>
          <p className="text-gray-600">Loading panels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Panel Servers</h1>
          <p className="text-gray-600">Manage your VPN panel servers</p>
        </div>
        <Button onClick={() => setShowNewPanelForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Panel
        </Button>
      </div>

      {showNewPanelForm && (
        <PanelForm
          onSave={(panel) => savePanelMutation.mutate(panel)}
          onCancel={() => setShowNewPanelForm(false)}
        />
      )}

      {editingPanel && (
        <PanelForm
          panel={editingPanel}
          onSave={(panel) => savePanelMutation.mutate(panel)}
          onCancel={() => setEditingPanel(null)}
        />
      )}

      <div className="grid gap-6">
        {panels?.map((panel) => (
          <Card key={panel.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5" />
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {panel.name}
                      <Badge variant={panel.is_active ? 'default' : 'secondary'}>
                        {panel.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {getStatusBadge(panel.health_status)}
                    </CardTitle>
                    <CardDescription>{panel.country_en} - {panel.type}</CardDescription>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingPanel(panel)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deletePanelMutation.mutate(panel.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Panel URL:</span>
                  <p className="text-blue-600">{panel.panel_url}</p>
                </div>
                <div>
                  <span className="font-medium">Username:</span>
                  <p>{panel.username}</p>
                </div>
                <div>
                  <span className="font-medium">Last Health Check:</span>
                  <p>{panel.last_health_check ? new Date(panel.last_health_check).toLocaleString() : 'Never'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
