
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Server, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PanelTestConnection } from './PanelTestConnection';
import { PanelTestHistory } from './PanelTestHistory';

interface Panel {
  id: string;
  name: string;
  type: 'marzban' | 'marzneshin';
  panel_url: string;
  username: string;
  password: string;
  country_en: string;
  country_fa: string;
  is_active: boolean;
  health_status: 'online' | 'offline' | 'unknown';
  last_health_check: string | null;
  default_inbounds: any[];
}

export const PanelsManagement = () => {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState<Panel | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'failed'>('all');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'marzban' as 'marzban' | 'marzneshin',
    panel_url: '',
    username: '',
    password: '',
    country_en: '',
    country_fa: '',
    is_active: true,
    default_inbounds: '[]'
  });

  const fetchPanels = async () => {
    try {
      const { data, error } = await supabase
        .from('panel_servers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching panels:', error);
        return;
      }

      setPanels(data || []);
    } catch (error) {
      console.error('Failed to fetch panels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPanels();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'marzban',
      panel_url: '',
      username: '',
      password: '',
      country_en: '',
      country_fa: '',
      is_active: true,
      default_inbounds: '[]'
    });
    setEditingPanel(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const panelData = {
        ...formData,
        default_inbounds: JSON.parse(formData.default_inbounds || '[]')
      };

      if (editingPanel) {
        const { error } = await supabase
          .from('panel_servers')
          .update(panelData)
          .eq('id', editingPanel.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('panel_servers')
          .insert([panelData]);

        if (error) throw error;
      }

      await fetchPanels();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving panel:', error);
    }
  };

  const handleEdit = (panel: Panel) => {
    setEditingPanel(panel);
    setFormData({
      name: panel.name,
      type: panel.type,
      panel_url: panel.panel_url,
      username: panel.username,
      password: panel.password,
      country_en: panel.country_en,
      country_fa: panel.country_fa,
      is_active: panel.is_active,
      default_inbounds: JSON.stringify(panel.default_inbounds || [])
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this panel?')) return;

    try {
      const { error } = await supabase
        .from('panel_servers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchPanels();
    } catch (error) {
      console.error('Error deleting panel:', error);
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'offline':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getHealthStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-100 text-green-800">Online</Badge>;
      case 'offline':
        return <Badge className="bg-red-100 text-red-800">Offline</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Unknown</Badge>;
    }
  };

  const filteredPanels = panels.filter(panel => {
    if (filterStatus === 'failed') {
      return panel.health_status === 'offline';
    }
    return true;
  });

  if (isLoading) {
    return <div className="flex justify-center items-center p-8">Loading panels...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Panel Management</h1>
          <p className="text-gray-600">Manage your panel servers and test their connectivity</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={(value: 'all' | 'failed') => setFilterStatus(value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Panels</SelectItem>
              <SelectItem value="failed">Failed Tests Only</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Panel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingPanel ? 'Edit Panel' : 'Add New Panel'}
                </DialogTitle>
                <DialogDescription>
                  Configure a new panel server or edit existing one
                </DialogDescription>
              </DialogHeader>
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
                    <Select value={formData.type} onValueChange={(value: 'marzban' | 'marzneshin') => setFormData({ ...formData, type: value })}>
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
                    type="url"
                    value={formData.panel_url}
                    onChange={(e) => setFormData({ ...formData, panel_url: e.target.value })}
                    placeholder="https://panel.example.com"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
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

                <div>
                  <Label htmlFor="default_inbounds">Default Inbounds (JSON)</Label>
                  <Textarea
                    id="default_inbounds"
                    value={formData.default_inbounds}
                    onChange={(e) => setFormData({ ...formData, default_inbounds: e.target.value })}
                    placeholder='[{"tag": "vless", "port": 443}]'
                    rows={3}
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

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingPanel ? 'Update Panel' : 'Create Panel'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6">
        {filteredPanels.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Server className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {filterStatus === 'failed' ? 'No Failed Panels' : 'No Panels Found'}
              </h3>
              <p className="text-gray-600 mb-4">
                {filterStatus === 'failed' 
                  ? 'All panels are working correctly!' 
                  : 'Get started by adding your first panel server.'
                }
              </p>
              {filterStatus === 'all' && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Panel
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredPanels.map((panel) => (
            <Card key={panel.id} className="relative">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getHealthStatusIcon(panel.health_status)}
                      {panel.name}
                      {getHealthStatusBadge(panel.health_status)}
                      <Badge variant={panel.is_active ? 'default' : 'secondary'}>
                        {panel.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {panel.type.charAt(0).toUpperCase() + panel.type.slice(1)} Panel • {panel.country_en} ({panel.country_fa})
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(panel)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(panel.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">URL:</span>
                    <p className="text-gray-600 break-all">{panel.panel_url}</p>
                  </div>
                  <div>
                    <span className="font-medium">Username:</span>
                    <p className="text-gray-600">{panel.username}</p>
                  </div>
                  <div>
                    <span className="font-medium">Last Health Check:</span>
                    <p className="text-gray-600">
                      {panel.last_health_check 
                        ? new Date(panel.last_health_check).toLocaleString()
                        : 'Never'
                      }
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Default Inbounds:</span>
                    <p className="text-gray-600">
                      {panel.default_inbounds?.length || 0} configured
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <PanelTestConnection panel={panel} onTestComplete={fetchPanels} />
                  <PanelTestHistory 
                    panelId={panel.id} 
                    panelName={panel.name}
                    onRefresh={fetchPanels}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
