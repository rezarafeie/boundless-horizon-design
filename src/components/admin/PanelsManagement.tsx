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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pencil, Plus, Trash2, Server, X, TestTube } from 'lucide-react';
import { toast } from 'sonner';
import { PanelTestConnection } from './PanelTestConnection';

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

interface Inbound {
  tag: string;
  country_en: string;
  country_fa: string;
  protocol: string;
  port?: number;
}

export const PanelsManagement = () => {
  const [editingPanel, setEditingPanel] = useState<Panel | null>(null);
  const [showNewPanelForm, setShowNewPanelForm] = useState(false);
  const [testingPanelId, setTestingPanelId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: panels, isLoading, error } = useQuery({
    queryKey: ['admin-panels'],
    queryFn: async () => {
      console.log('=== PANELS: Starting fetch ===');
      
      const { data, error } = await supabase
        .from('panel_servers')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('PANELS: Raw response:', { data, error, count: data?.length });
      
      if (error) {
        console.error('PANELS: Query error:', error);
        throw error;
      }
      
      console.log('PANELS: Successfully fetched', data?.length || 0, 'panels');
      return data as Panel[];
    },
    retry: 1
  });

  const savePanelMutation = useMutation({
    mutationFn: async (panelData: Partial<Panel> & { id?: string }) => {
      console.log('PANELS: Saving panel data:', panelData);
      
      if (panelData.id) {
        console.log('PANELS: Updating existing panel');
        const { id, ...updateData } = panelData;
        const { error } = await supabase
          .from('panel_servers')
          .update(updateData)
          .eq('id', id);
        if (error) {
          console.error('PANELS: Update error:', error);
          throw error;
        }
      } else {
        console.log('PANELS: Creating new panel');
        const insertData = {
          name: panelData.name!,
          type: panelData.type!,
          panel_url: panelData.panel_url!,
          username: panelData.username!,
          password: panelData.password!,
          country_en: panelData.country_en!,
          country_fa: panelData.country_fa!,
          default_inbounds: panelData.default_inbounds || [],
          is_active: panelData.is_active ?? true,
        };
        console.log('PANELS: Insert data:', insertData);
        const { data, error } = await supabase
          .from('panel_servers')
          .insert(insertData)
          .select();
        if (error) {
          console.error('PANELS: Insert error:', error);
          throw error;
        }
        console.log('PANELS: Insert successful:', data);
      }
    },
    onSuccess: () => {
      console.log('PANELS: Save mutation successful');
      queryClient.invalidateQueries({ queryKey: ['admin-panels'] });
      setEditingPanel(null);
      setShowNewPanelForm(false);
      toast.success('Panel saved successfully');
    },
    onError: (error: any) => {
      console.error('PANELS: Save mutation error:', error);
      toast.error('Failed to save panel: ' + error.message);
    }
  });

  const deletePanelMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('PANELS: Deleting panel:', id);
      const { error } = await supabase
        .from('panel_servers')
        .delete()
        .eq('id', id);
      if (error) {
        console.error('PANELS: Delete error:', error);
        throw error;
      }
      console.log('PANELS: Delete successful');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-panels'] });
      toast.success('Panel deleted successfully');
    },
    onError: (error: any) => {
      console.error('PANELS: Delete mutation error:', error);
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
      is_active: panel?.is_active ?? true,
    });

    const [inbounds, setInbounds] = useState<Inbound[]>(
      panel?.default_inbounds || [{ tag: '', country_en: '', country_fa: '', protocol: 'vless' }]
    );

    const addInbound = () => {
      setInbounds([...inbounds, { tag: '', country_en: '', country_fa: '', protocol: 'vless' }]);
    };

    const removeInbound = (index: number) => {
      if (inbounds.length > 1) {
        setInbounds(inbounds.filter((_, i) => i !== index));
      }
    };

    const updateInbound = (index: number, field: keyof Inbound, value: string | number) => {
      const updated = inbounds.map((inbound, i) => 
        i === index ? { ...inbound, [field]: value } : inbound
      );
      setInbounds(updated);
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      console.log('PANELS: Form submitted with data:', formData, 'inbounds:', inbounds);
      
      // Validate inbounds
      const validInbounds = inbounds.filter(inbound => 
        inbound.tag.trim() && inbound.country_en.trim() && inbound.country_fa.trim()
      );

      if (validInbounds.length === 0) {
        toast.error('At least one valid inbound is required');
        return;
      }

      onSave({ 
        ...formData, 
        id: panel?.id,
        default_inbounds: validInbounds
      });
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>{panel ? 'Edit Panel' : 'Add New Panel'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Configuration Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  <Label htmlFor="country_en">Panel Country (English)</Label>
                  <Input
                    id="country_en"
                    value={formData.country_en}
                    onChange={(e) => setFormData({ ...formData, country_en: e.target.value })}
                    placeholder="Germany"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="country_fa">Panel Country (Persian)</Label>
                  <Input
                    id="country_fa"
                    value={formData.country_fa}
                    onChange={(e) => setFormData({ ...formData, country_fa: e.target.value })}
                    placeholder="آلمان"
                    required
                  />
                </div>
              </div>

              {/* Inbounds Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Inbound Configuration</Label>
                  <Button type="button" onClick={addInbound} size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Inbound
                  </Button>
                </div>
                
                {inbounds.map((inbound, index) => (
                  <Card key={index} className="p-4 bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium">Inbound #{index + 1}</span>
                      {inbounds.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeInbound(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`tag-${index}`}>Inbound Tag</Label>
                        <Input
                          id={`tag-${index}`}
                          value={inbound.tag}
                          onChange={(e) => updateInbound(index, 'tag', e.target.value)}
                          placeholder="e.g., VLESS_TCP_GERMANY"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`protocol-${index}`}>Protocol</Label>
                        <Select 
                          value={inbound.protocol} 
                          onValueChange={(value) => updateInbound(index, 'protocol', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vless">VLESS</SelectItem>
                            <SelectItem value="vmess">VMess</SelectItem>
                            <SelectItem value="trojan">Trojan</SelectItem>
                            <SelectItem value="shadowsocks">Shadowsocks</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor={`country_en-${index}`}>Country (English)</Label>
                        <Input
                          id={`country_en-${index}`}
                          value={inbound.country_en}
                          onChange={(e) => updateInbound(index, 'country_en', e.target.value)}
                          placeholder="Germany"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`country_fa-${index}`}>Country (Persian)</Label>
                        <Input
                          id={`country_fa-${index}`}
                          value={inbound.country_fa}
                          onChange={(e) => updateInbound(index, 'country_fa', e.target.value)}
                          placeholder="آلمان"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`port-${index}`}>Port (Optional)</Label>
                        <Input
                          id={`port-${index}`}
                          type="number"
                          value={inbound.port || ''}
                          onChange={(e) => updateInbound(index, 'port', parseInt(e.target.value) || '')}
                          placeholder="443"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
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

            {/* Test Connection - Only show for existing panels */}
            {panel && (
              <div className="pt-6 border-t">
                <PanelTestConnection 
                  panel={panel} 
                  onTestComplete={(result) => {
                    queryClient.invalidateQueries({ queryKey: ['admin-panels'] });
                  }}
                />
              </div>
            )}
          </div>
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

  console.log('PANELS: Component render - isLoading:', isLoading, 'panels count:', panels?.length, 'error:', error);

  if (error) {
    console.error('PANELS: Component error state:', error);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Panel Servers</h1>
          <p className="text-gray-600">Error loading panels</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-red-600">
              <p>Error loading panels: {error?.message || 'Unknown error'}</p>
              <p className="text-sm mt-2">Check the browser console for more details.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    console.log('PANELS: Component loading state');
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
          <p className="text-gray-600">
            Manage your VPN panel servers ({panels?.length || 0} panels found)
          </p>
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
                    onClick={() => setTestingPanelId(testingPanelId === panel.id ? null : panel.id)}
                  >
                    <TestTube className="w-4 h-4" />
                  </Button>
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
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
              
              {/* Show Inbounds */}
              {panel.default_inbounds && panel.default_inbounds.length > 0 && (
                <div>
                  <span className="font-medium text-sm">Configured Inbounds:</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {panel.default_inbounds.map((inbound: any, index: number) => (
                      <div key={index} className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm">{inbound.tag}</span>
                          <Badge variant="outline">{inbound.protocol}</Badge>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {inbound.country_en} ({inbound.country_fa})
                          {inbound.port && ` - Port: ${inbound.port}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {testingPanelId === panel.id && (
                <div className="mt-4 pt-4 border-t">
                  <PanelTestConnection 
                    panel={panel} 
                    onTestComplete={(result) => {
                      queryClient.invalidateQueries({ queryKey: ['admin-panels'] });
                      setTestingPanelId(null);
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        
        {(!panels || panels.length === 0) && !isLoading && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 mb-4">No panel servers found.</p>
              <Button onClick={() => setShowNewPanelForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Panel
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
