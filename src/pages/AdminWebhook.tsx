import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Plus, TestTube, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { WebhookDebugPanel } from '@/components/admin/WebhookDebugPanel';

interface WebhookConfig {
  id: string;
  webhook_url: string;
  method: string;
  headers: any;
  is_enabled: boolean;
}

interface WebhookTrigger {
  id: string;
  trigger_name: string;
  is_enabled: boolean;
}

interface WebhookPayloadConfig {
  id: string;
  parameter_name: string;
  parameter_type: string;
  parameter_source: string | null;
  custom_value: string | null;
  is_enabled: boolean;
}

interface WebhookLog {
  id: string;
  trigger_type: string;
  payload: any;
  success: boolean;
  response_status: number | null;
  response_body: string | null;
  error_message: string | null;
  sent_at: string;
}

const AdminWebhook = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<WebhookConfig | null>(null);
  const [triggers, setTriggers] = useState<WebhookTrigger[]>([]);
  const [payloadConfig, setPayloadConfig] = useState<WebhookPayloadConfig[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  // Form states
  const [webhookUrl, setWebhookUrl] = useState('');
  const [method, setMethod] = useState('POST');
  const [headersText, setHeadersText] = useState('{}');
  const [isEnabled, setIsEnabled] = useState(true);
  
  // New parameter form states
  const [newParamName, setNewParamName] = useState('');
  const [newParamType, setNewParamType] = useState('string');
  const [newParamSource, setNewParamSource] = useState('');
  const [newParamCustomValue, setNewParamCustomValue] = useState('');
  const [showAddParam, setShowAddParam] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading webhook data...');
      
      // Check admin session first
      const adminSession = localStorage.getItem('admin_session');
      if (!adminSession) {
        console.error('No admin session found');
        toast({
          title: 'Authentication Error',
          description: 'Please log in as admin first',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // Create service client for admin operations
      const { createClient } = await import('@supabase/supabase-js');
      const serviceClient = createClient(
        'https://feamvyruipxtafzhptkh.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlYW12eXJ1aXB4dGFmemhwdGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwODE0MzIsImV4cCI6MjA2NTY1NzQzMn0.OcYM5_AGC6CGNgzM_TwrjpcB1PYBiHmUbeuYe9LQJQg'
      );
      
      // Load webhook config - get the first one or create default
      const { data: configData, error: configError } = await serviceClient
        .from('webhook_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      console.log('Webhook config data:', configData, 'Error:', configError);

      if (configData) {
        setConfig(configData);
        setWebhookUrl(configData.webhook_url);
        setMethod(configData.method);
        setHeadersText(JSON.stringify(configData.headers || {}, null, 2));
        setIsEnabled(configData.is_enabled);

        // Load triggers for this config
        const { data: triggersData, error: triggersError } = await serviceClient
          .from('webhook_triggers')
          .select('*')
          .eq('webhook_config_id', configData.id)
          .order('trigger_name');

        console.log('Triggers data:', triggersData, 'Error:', triggersError);
        if (triggersData) {
          setTriggers(triggersData);
        }

        // Load payload config for this config
        const { data: payloadData, error: payloadError } = await serviceClient
          .from('webhook_payload_config')
          .select('*')
          .eq('webhook_config_id', configData.id)
          .order('parameter_name');

        console.log('Payload config data:', payloadData, 'Error:', payloadError);
        if (payloadData) {
          setPayloadConfig(payloadData);
        }
      } else {
        // Create initial webhook configuration if none exists
        console.log('No webhook config found, creating initial setup');
        const { data: newConfig } = await serviceClient
          .from('webhook_config')
          .insert({
            webhook_url: '',
            method: 'POST',
            headers: {},
            is_enabled: false
          })
          .select()
          .single();
          
        if (newConfig) {
          setConfig(newConfig);
          await createInitialWebhookSetup(newConfig.id);
          await loadData(); // Reload with new data
          return;
        }
        
        setWebhookUrl('');
        setMethod('POST');
        setHeadersText('{}');
        setIsEnabled(true);
        setTriggers([]);
        setPayloadConfig([]);
      }

      // Load recent logs
      const { data: logsData, error: logsError } = await serviceClient
        .from('webhook_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      console.log('Logs data:', logsData, 'Error:', logsError);
      if (logsData) {
        setLogs(logsData);
      }
    } catch (error) {
      console.error('Error loading webhook data:', error);
      toast({
        title: 'Error',
        description: `Failed to load webhook configuration: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createInitialWebhookSetup = async (configId: string) => {
    // Create default triggers
    const defaultTriggers = [
      'manual_payment_approval',
      'test_account_creation', 
      'subscription_creation',
      'stripe_payment_success',
      'zarinpal_payment_success',
      'subscription_update',
      'manual_admin_trigger'
    ];

    await supabase.from('webhook_triggers').insert(
      defaultTriggers.map(trigger => ({
        webhook_config_id: configId,
        trigger_name: trigger,
        is_enabled: true
      }))
    );
  };

  const saveWebhookConfig = async () => {
    try {
      let headers = {};
      try {
        headers = JSON.parse(headersText);
      } catch (e) {
        toast({
          title: 'Error',
          description: 'Invalid JSON format in headers',
          variant: 'destructive'
        });
        return;
      }

      const configData = {
        webhook_url: webhookUrl,
        method,
        headers,
        is_enabled: isEnabled
      };

      // Use service client for admin operations
      const { createClient } = await import('@supabase/supabase-js');
      const serviceClient = createClient(
        'https://feamvyruipxtafzhptkh.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlYW12eXJ1aXB4dGFmemhwdGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwODE0MzIsImV4cCI6MjA2NTY1NzQzMn0.OcYM5_AGC6CGNgzM_TwrjpcB1PYBiHmUbeuYe9LQJQg'
      );

      if (config) {
        const { error } = await serviceClient
          .from('webhook_config')
          .update(configData)
          .eq('id', config.id);
        
        if (error) throw error;
      } else {
        const { error } = await serviceClient
          .from('webhook_config')
          .insert(configData);
        
        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Webhook configuration saved'
      });

      loadData();
    } catch (error) {
      console.error('Error saving webhook config:', error);
      toast({
        title: 'Error',
        description: `Failed to save webhook configuration: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  const toggleTrigger = async (triggerId: string, enabled: boolean) => {
    try {
      // Use service client for admin operations
      const { createClient } = await import('@supabase/supabase-js');
      const serviceClient = createClient(
        'https://feamvyruipxtafzhptkh.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlYW12eXJ1aXB4dGFmemhwdGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwODE0MzIsImV4cCI6MjA2NTY1NzQzMn0.OcYM5_AGC6CGNgzM_TwrjpcB1PYBiHmUbeuYe9LQJQg'
      );

      const { error } = await serviceClient
        .from('webhook_triggers')
        .update({ is_enabled: enabled })
        .eq('id', triggerId);

      if (error) throw error;

      setTriggers(prev => prev.map(t => 
        t.id === triggerId ? { ...t, is_enabled: enabled } : t
      ));

      toast({
        title: 'Success',
        description: `Trigger ${enabled ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      console.error('Error updating trigger:', error);
      toast({
        title: 'Error',
        description: `Failed to update trigger: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  const togglePayloadParam = async (paramId: string, enabled: boolean) => {
    try {
      // Use service client for admin operations
      const { createClient } = await import('@supabase/supabase-js');
      const serviceClient = createClient(
        'https://feamvyruipxtafzhptkh.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlYW12eXJ1aXB4dGFmemhwdGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwODE0MzIsImV4cCI6MjA2NTY1NzQzMn0.OcYM5_AGC6CGNgzM_TwrjpcB1PYBiHmUbeuYe9LQJQg'
      );

      const { error } = await serviceClient
        .from('webhook_payload_config')
        .update({ is_enabled: enabled })
        .eq('id', paramId);

      if (error) throw error;

      setPayloadConfig(prev => prev.map(p => 
        p.id === paramId ? { ...p, is_enabled: enabled } : p
      ));

      toast({
        title: 'Success',
        description: `Parameter ${enabled ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      console.error('Error updating payload parameter:', error);
      toast({
        title: 'Error',
        description: `Failed to update payload parameter: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  const addCustomParameter = async () => {
    try {
      if (!newParamName.trim()) {
        toast({
          title: 'Error',
          description: 'Parameter name is required',
          variant: 'destructive'
        });
        return;
      }

      if (!config) {
        toast({
          title: 'Error',
          description: 'Please save webhook configuration first',
          variant: 'destructive'
        });
        return;
      }

      // Use service client for admin operations
      const { createClient } = await import('@supabase/supabase-js');
      const serviceClient = createClient(
        'https://feamvyruipxtafzhptkh.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlYW12eXJ1aXB4dGFmemhwdGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwODE0MzIsImV4cCI6MjA2NTY1NzQzMn0.OcYM5_AGC6CGNgzM_TwrjpcB1PYBiHmUbeuYe9LQJQg'
      );

      const { error } = await serviceClient
        .from('webhook_payload_config')
        .insert({
          webhook_config_id: config.id,
          parameter_name: newParamName,
          parameter_type: newParamType,
          parameter_source: newParamSource.trim() || null,
          custom_value: newParamCustomValue.trim() || null,
          is_enabled: true
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Custom parameter added'
      });

      // Reset form
      setNewParamName('');
      setNewParamType('string');
      setNewParamSource('');
      setNewParamCustomValue('');
      setShowAddParam(false);

      loadData();
    } catch (error) {
      console.error('Error adding custom parameter:', error);
      toast({
        title: 'Error',
        description: `Failed to add parameter: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  const deleteParameter = async (paramId: string) => {
    try {
      // Use service client for admin operations
      const { createClient } = await import('@supabase/supabase-js');
      const serviceClient = createClient(
        'https://feamvyruipxtafzhptkh.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlYW12eXJ1aXB4dGFmemhwdGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwODE0MzIsImV4cCI6MjA2NTY1NzQzMn0.OcYM5_AGC6CGNgzM_TwrjpcB1PYBiHmUbeuYe9LQJQg'
      );

      const { error } = await serviceClient
        .from('webhook_payload_config')
        .delete()
        .eq('id', paramId);

      if (error) throw error;

      setPayloadConfig(prev => prev.filter(p => p.id !== paramId));

      toast({
        title: 'Success',
        description: 'Parameter deleted'
      });
    } catch (error) {
      console.error('Error deleting parameter:', error);
      toast({
        title: 'Error',
        description: `Failed to delete parameter: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  const testWebhook = async () => {
    try {
      setTesting(true);

      if (!webhookUrl || webhookUrl.trim() === '') {
        toast({
          title: 'Test Failed',
          description: 'Please configure a webhook URL first',
          variant: 'destructive'
        });
        return;
      }

      const testPayload = {
        type: 'test',
        webhook_type: 'test',
        username: 'test_user',
        mobile: '09123456789',
        email: 'test@example.com',
        amount: 100000,
        payment_method: 'test',
        plan_name: 'Test Plan',
        panel_name: 'Test Panel',
        created_at: new Date().toISOString()
      };

      console.log('Testing webhook with payload:', testPayload);

      const { data, error } = await supabase.functions.invoke('send-webhook-notification', {
        body: testPayload
      });

      console.log('Webhook test response:', { data, error });

      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (data?.success) {
        toast({
          title: 'Test Successful',
          description: 'Webhook test completed successfully'
        });
      } else {
        throw new Error(data?.error || 'Unknown webhook error');
      }

      loadData(); // Reload to show new log entry
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast({
        title: 'Test Failed',
        description: `Webhook test failed: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  const generatePreview = () => {
    const enabledParams = payloadConfig.filter(p => p.is_enabled);
    const preview: any = {};
    
    enabledParams.forEach(param => {
      if (param.parameter_source) {
        // Use source field name as sample value
        preview[param.parameter_name] = `sample_${param.parameter_source}`;
      } else if (param.custom_value) {
        // Use custom value
        if (param.parameter_type === 'number') {
          preview[param.parameter_name] = Number(param.custom_value);
        } else if (param.parameter_type === 'boolean') {
          preview[param.parameter_name] = param.custom_value === 'true';
        } else {
          preview[param.parameter_name] = param.custom_value;
        }
      } else {
        // Default sample values based on type
        if (param.parameter_type === 'string') {
          preview[param.parameter_name] = `sample_${param.parameter_name}`;
        } else if (param.parameter_type === 'number') {
          preview[param.parameter_name] = 123;
        } else if (param.parameter_type === 'boolean') {
          preview[param.parameter_name] = true;
        } else {
          preview[param.parameter_name] = 'sample_value';
        }
      }
    });

    // Add sample manual payment data if manual_payment_approval trigger exists
    if (triggers.some(t => t.trigger_name === 'manual_payment_approval' && t.is_enabled)) {
      preview.manual_payment_data = {
        approve_link: "https://your-domain.com/admin/approve-order/12345?token=abc123",
        reject_link: "https://your-domain.com/admin/reject-order/12345?token=abc123",
        receipt_url: "https://your-storage.com/receipts/receipt-12345.jpg",
        subscription_data: {
          username: "sample_user",
          mobile: "09123456789",
          email: "user@example.com",
          plan_name: "Premium Plan",
          panel_name: "Server 1",
          amount: 250000
        }
      };
    }

    return preview;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Webhook Management</h1>
          <p className="text-muted-foreground">Configure and manage webhook notifications</p>
        </div>

        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="settings">Webhook Settings</TabsTrigger>
            <TabsTrigger value="payload">Payload Builder</TabsTrigger>
            <TabsTrigger value="triggers">Trigger Rules</TabsTrigger>
            <TabsTrigger value="logs">Logs & Testing</TabsTrigger>
            <TabsTrigger value="debug">Debug Panel</TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Configuration</CardTitle>
                <CardDescription>
                  Configure the webhook endpoint and request settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-webhook-endpoint.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method">HTTP Method</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="headers">Headers (JSON)</Label>
                  <Textarea
                    id="headers"
                    value={headersText}
                    onChange={(e) => setHeadersText(e.target.value)}
                    placeholder='{"Content-Type": "application/json"}'
                    rows={4}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enabled"
                    checked={isEnabled}
                    onCheckedChange={setIsEnabled}
                  />
                  <Label htmlFor="enabled">Enable webhook</Label>
                </div>

                <Button onClick={saveWebhookConfig}>
                  Save Configuration
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="triggers">
            <Card>
              <CardHeader>
                <CardTitle>Trigger Rules</CardTitle>
                <CardDescription>
                  Configure which events should trigger webhook notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {triggers.map((trigger) => (
                    <div key={trigger.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{trigger.trigger_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                          <p className="text-sm text-muted-foreground">
                            {trigger.trigger_name === 'manual_payment_approval' && 'Triggered when manual payment needs admin approval'}
                            {trigger.trigger_name === 'test_account_creation' && 'Triggered when a new test user account is created'}
                            {trigger.trigger_name === 'subscription_creation' && 'Triggered when a new subscription is created'}
                            {trigger.trigger_name === 'stripe_payment_success' && 'Triggered when Stripe payment succeeds'}
                            {trigger.trigger_name === 'zarinpal_payment_success' && 'Triggered when ZarinPal payment succeeds'}
                            {trigger.trigger_name === 'subscription_update' && 'Triggered when subscription is updated'}
                            {trigger.trigger_name === 'manual_admin_trigger' && 'Manually triggered by admin'}
                          </p>
                        </div>
                      <Switch
                        checked={trigger.is_enabled}
                        onCheckedChange={(checked) => toggleTrigger(trigger.id, checked)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payload">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payload Configuration</CardTitle>
                  <CardDescription>
                    Configure the data sent in webhook payloads
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Parameters</h4>
                      <Button onClick={() => setShowAddParam(true)} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Parameter
                      </Button>
                    </div>
                    
                    {showAddParam && (
                      <Card className="p-4 border-dashed">
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor="param-name">Parameter Name</Label>
                              <Input
                                id="param-name"
                                value={newParamName}
                                onChange={(e) => setNewParamName(e.target.value)}
                                placeholder="custom_field"
                              />
                            </div>
                            <div>
                              <Label htmlFor="param-type">Type</Label>
                              <Select value={newParamType} onValueChange={setNewParamType}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="string">String</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="boolean">Boolean</SelectItem>
                                  <SelectItem value="system">System</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor="param-source">Source Field (optional)</Label>
                              <Input
                                id="param-source"
                                value={newParamSource}
                                onChange={(e) => setNewParamSource(e.target.value)}
                                placeholder="subscription_id"
                              />
                            </div>
                            <div>
                              <Label htmlFor="param-custom">Custom Value (optional)</Label>
                              <Input
                                id="param-custom"
                                value={newParamCustomValue}
                                onChange={(e) => setNewParamCustomValue(e.target.value)}
                                placeholder="Fixed value"
                              />
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button onClick={addCustomParameter} size="sm">
                              Add Parameter
                            </Button>
                            <Button 
                              onClick={() => setShowAddParam(false)} 
                              variant="outline" 
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )}
                    
                    <div className="space-y-2">
                      {payloadConfig.map((param) => (
                        <div key={param.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{param.parameter_name}</span>
                              <Badge variant="outline">
                                {param.parameter_type}
                              </Badge>
                              {param.parameter_source && (
                                <Badge variant="secondary" className="text-xs">
                                  from: {param.parameter_source}
                                </Badge>
                              )}
                              {param.custom_value && (
                                <Badge variant="secondary" className="text-xs">
                                  value: {param.custom_value}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={param.is_enabled}
                              onCheckedChange={(checked) => togglePayloadParam(param.id, checked)}
                            />
                            <Button
                              onClick={() => deleteParameter(param.id)}
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payload Preview</CardTitle>
                  <CardDescription>
                    Preview of the JSON payload that will be sent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded text-sm overflow-auto max-h-96">
                    {JSON.stringify(generatePreview(), null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="logs">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Test Webhook</CardTitle>
                  <CardDescription>
                    Send a test webhook to verify your configuration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={testWebhook} disabled={testing}>
                    <TestTube className="w-4 h-4 mr-2" />
                    {testing ? 'Testing...' : 'Send Test Webhook'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Webhook Logs</CardTitle>
                  <CardDescription>
                    Recent webhook delivery attempts and their results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {logs.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No webhook logs found
                      </div>
                    ) : (
                      logs.map((log) => (
                        <Card key={log.id} className="border-l-4 border-l-primary/20">
                          <CardContent className="pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                              <div>
                                <Label className="text-xs text-muted-foreground">Trigger Type</Label>
                                <p className="font-medium">{log.trigger_type}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Status</Label>
                                <div className="flex items-center gap-2">
                                  {log.success ? (
                                    <Badge variant="default" className="bg-green-100 text-green-800">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Success
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive">
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Failed
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Response Status</Label>
                                <p className="font-medium">
                                  {log.response_status ? `HTTP ${log.response_status}` : (log.error_message || 'N/A')}
                                </p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Sent At</Label>
                                <p className="font-medium text-sm">
                                  {new Date(log.sent_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            
                            {/* Webhook URL */}
                            <div className="mb-4">
                              <Label className="text-xs text-muted-foreground">Webhook URL</Label>
                              <p className="font-mono text-sm bg-muted p-2 rounded">
                                {config?.webhook_url || 'Not configured'}
                              </p>
                            </div>

                            {/* Request Payload */}
                            <div className="mb-4">
                              <Label className="text-xs text-muted-foreground">Request Payload</Label>
                              <details className="mt-1">
                                <summary className="cursor-pointer text-sm text-primary hover:underline">
                                  View payload ({Object.keys(log.payload || {}).length} fields)
                                </summary>
                                <pre className="mt-2 bg-muted p-3 rounded text-xs overflow-auto max-h-48">
                                  {JSON.stringify(log.payload, null, 2)}
                                </pre>
                              </details>
                            </div>

                            {/* Response Body */}
                            {log.response_body && (
                              <div className="mb-4">
                                <Label className="text-xs text-muted-foreground">Response Body</Label>
                                <details className="mt-1">
                                  <summary className="cursor-pointer text-sm text-primary hover:underline">
                                    View response
                                  </summary>
                                  <pre className="mt-2 bg-muted p-3 rounded text-xs overflow-auto max-h-32">
                                    {log.response_body}
                                  </pre>
                                </details>
                              </div>
                            )}

                            {/* Error Message */}
                            {log.error_message && (
                              <div>
                                <Label className="text-xs text-muted-foreground">Error Message</Label>
                                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                  {log.error_message}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="debug">
            <WebhookDebugPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminWebhook;