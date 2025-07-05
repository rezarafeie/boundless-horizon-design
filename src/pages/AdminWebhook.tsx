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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load webhook config
      const { data: configData } = await supabase
        .from('webhook_config')
        .select('*')
        .maybeSingle();

      if (configData) {
        setConfig(configData);
        setWebhookUrl(configData.webhook_url);
        setMethod(configData.method);
        setHeadersText(JSON.stringify(configData.headers, null, 2));
        setIsEnabled(configData.is_enabled);
      }

      // Load triggers
      const { data: triggersData } = await supabase
        .from('webhook_triggers')
        .select('*')
        .order('trigger_name');

      if (triggersData) {
        setTriggers(triggersData);
      }

      // Load payload config
      const { data: payloadData } = await supabase
        .from('webhook_payload_config')
        .select('*')
        .order('parameter_name');

      if (payloadData) {
        setPayloadConfig(payloadData);
      }

      // Load recent logs
      const { data: logsData } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (logsData) {
        setLogs(logsData);
      }
    } catch (error) {
      console.error('Error loading webhook data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load webhook configuration',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
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

      if (config) {
        await supabase
          .from('webhook_config')
          .update(configData)
          .eq('id', config.id);
      } else {
        await supabase
          .from('webhook_config')
          .insert(configData);
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
        description: 'Failed to save webhook configuration',
        variant: 'destructive'
      });
    }
  };

  const toggleTrigger = async (triggerId: string, enabled: boolean) => {
    try {
      await supabase
        .from('webhook_triggers')
        .update({ is_enabled: enabled })
        .eq('id', triggerId);

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
        description: 'Failed to update trigger',
        variant: 'destructive'
      });
    }
  };

  const testWebhook = async () => {
    try {
      setTesting(true);

      const testPayload = {
        type: 'test',
        webhook_type: 'test',
        username: 'test_user',
        mobile: '09123456789',
        email: 'test@example.com',
        amount: 100000,
        payment_method: 'test',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase.functions.invoke('send-webhook-notification', {
        body: testPayload
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Test Successful',
        description: 'Webhook test completed successfully'
      });

      loadData(); // Reload to show new log entry
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast({
        title: 'Test Failed',
        description: 'Webhook test failed',
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
      if (param.parameter_type === 'string') {
        preview[param.parameter_name] = param.custom_value || `sample_${param.parameter_name}`;
      } else if (param.parameter_type === 'number') {
        preview[param.parameter_name] = param.custom_value ? Number(param.custom_value) : 123;
      } else if (param.parameter_type === 'boolean') {
        preview[param.parameter_name] = param.custom_value === 'true';
      } else {
        preview[param.parameter_name] = param.custom_value || 'sample_value';
      }
    });

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
                        <h4 className="font-medium">{trigger.trigger_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {trigger.trigger_name === 'new_subscription' && 'Triggered when a new subscription is created'}
                          {trigger.trigger_name === 'new_test_user' && 'Triggered when a new test user is created'}
                          {trigger.trigger_name === 'payment_pending' && 'Triggered when manual payment needs approval'}
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
                  <div className="space-y-2">
                    {payloadConfig.map((param) => (
                      <div key={param.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="font-medium">{param.parameter_name}</span>
                          <Badge variant="outline" className="ml-2">
                            {param.parameter_type}
                          </Badge>
                        </div>
                        <Switch
                          checked={param.is_enabled}
                          onCheckedChange={(checked) => {
                            // Update payload config - simplified for demo
                            setPayloadConfig(prev => prev.map(p => 
                              p.id === param.id ? { ...p, is_enabled: checked } : p
                            ));
                          }}
                        />
                      </div>
                    ))}
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
                  <pre className="bg-muted p-4 rounded text-sm overflow-auto">
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Trigger</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Response</TableHead>
                        <TableHead>Sent At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{log.trigger_type}</TableCell>
                          <TableCell>
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
                          </TableCell>
                          <TableCell>
                            {log.response_status ? `${log.response_status}` : log.error_message}
                          </TableCell>
                          <TableCell>
                            {new Date(log.sent_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminWebhook;