
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Zap, RefreshCw, CheckCircle, XCircle, Server, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const ManualVpnCreationTool = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    planId: '',
    dataLimitGB: 10,
    durationDays: 30,
    notes: 'Manual VPN creation test'
  });
  const [manualApiBody, setManualApiBody] = useState('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [creationResult, setCreationResult] = useState<any>(null);
  const { toast } = useToast();

  // Fetch subscription plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select(`
          *,
          panel_servers!assigned_panel_id(
            id,
            name,
            type,
            panel_url,
            is_active,
            health_status
          )
        `)
        .eq('is_active', true)
        .order('name_en');

      if (error) throw error;
      return data;
    },
  });

  // Fetch all available panels
  const { data: panels } = useQuery({
    queryKey: ['panel-servers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_servers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log('🔧 MANUAL_VPN_TOOL:', message);
  };

  const clearLogs = () => {
    setDebugLogs([]);
    setCreationResult(null);
  };

  const generateRandomUsername = () => {
    const randomId = Math.floor(Math.random() * 900000) + 100000;
    const randomSuffix = Math.random().toString(36).substring(2, 5);
    return `bnets_${randomId}_${randomSuffix}`;
  };

  const getDefaultApiBody = () => {
    const expireTimestamp = Math.floor(Date.now() / 1000) + (formData.durationDays * 24 * 60 * 60);
    const dataLimitBytes = formData.dataLimitGB * 1073741824;
    
    return JSON.stringify({
      "username": "{{username}}",
      "status": "active",
      "expire": "{{expire}}",
      "data_limit": "{{data_limit}}",
      "data_limit_reset_strategy": "no_reset",
      "note": "{{note}}",
      "group_ids": [1],
      "proxy_settings": {
        "vmess": { "id": "sample-vmess-id" },
        "vless": { "id": "sample-vless-id", "flow": "xtls-rprx-vision" },
        "trojan": { "password": "sample-trojan-password" },
        "shadowsocks": { "password": "sample-ss-password", "method": "chacha20-ietf-poly1305" }
      },
      "on_hold_expire_duration": 0,
      "on_hold_timeout": "{{expire}}",
      "auto_delete_in_days": 0,
      "next_plan": {
        "user_template_id": 0,
        "data_limit": 0,
        "expire": 0,
        "add_remaining_traffic": false
      }
    }, null, 2);
  };

  const replaceVariables = (jsonString: string) => {
    const expireTimestamp = Math.floor(Date.now() / 1000) + (formData.durationDays * 24 * 60 * 60);
    const dataLimitBytes = formData.dataLimitGB * 1073741824;
    
    return jsonString
      .replace(/{{username}}/g, formData.username)
      .replace(/{{expire}}/g, expireTimestamp.toString())
      .replace(/{{data_limit}}/g, dataLimitBytes.toString())
      .replace(/{{note}}/g, formData.notes);
  };

  const handleCreateVpn = async () => {
    if (!formData.planId || !formData.username) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setIsCreating(true);
    setDebugLogs([]);
    setCreationResult(null);

    try {
      addDebugLog('🚀 Starting manual VPN creation test');
      addDebugLog(`Username: ${formData.username}`);
      addDebugLog(`Plan ID: ${formData.planId}`);
      addDebugLog(`Data Limit: ${formData.dataLimitGB}GB`);
      addDebugLog(`Duration: ${formData.durationDays} days`);

      // Get selected plan details
      const selectedPlan = plans?.find(p => p.id === formData.planId);
      if (!selectedPlan) {
        throw new Error('Selected plan not found');
      }

      addDebugLog(`Selected Plan: ${selectedPlan.name_en} (${selectedPlan.plan_id})`);
      
      if (selectedPlan.panel_servers) {
        addDebugLog(`Assigned Panel: ${selectedPlan.panel_servers.name} (${selectedPlan.panel_servers.type})`);
        addDebugLog(`Panel Status: ${selectedPlan.panel_servers.health_status}`);
        addDebugLog(`Panel URL: ${selectedPlan.panel_servers.panel_url}`);
      } else {
        addDebugLog('⚠️ No panel assigned to this plan');
      }

      // Determine panel type and edge function
      const panelType = selectedPlan.panel_servers?.type;
      const edgeFunctionName = panelType === 'marzneshin' ? 'marzneshin-create-user' : 'marzban-create-user';
      
      addDebugLog(`Panel Type: ${panelType}`);
      addDebugLog(`Edge Function: ${edgeFunctionName}`);

      let requestData;
      
      if (isManualMode && manualApiBody.trim()) {
        // Manual mode: use custom API body with variable replacement
        try {
          const processedBody = replaceVariables(manualApiBody);
          const parsedBody = JSON.parse(processedBody);
          
          addDebugLog('🔧 Manual Mode: Using custom API body');
          addDebugLog(`Variables replaced: username, expire, data_limit, note`);
          
          // For manual mode, we send the custom body directly to a special endpoint
          requestData = {
            username: formData.username,
            customApiBody: parsedBody,
            panelId: selectedPlan.panel_servers?.id,
            subscriptionId: 'manual-test-' + Date.now(),
            manualMode: true
          };
          
        } catch (error) {
          addDebugLog(`❌ Invalid JSON in manual API body: ${error.message}`);
          throw new Error(`Invalid JSON in manual API body: ${error.message}`);
        }
      } else {
        // Standard mode: use form data
        requestData = {
          username: formData.username,
          dataLimitGB: formData.dataLimitGB,
          durationDays: formData.durationDays,
          notes: formData.notes,
          panelId: selectedPlan.panel_servers?.id,
          subscriptionId: 'manual-test-' + Date.now()
        };
      }

      addDebugLog('📤 Sending request to edge function...');
      addDebugLog(`Request Data: ${JSON.stringify(requestData, null, 2)}`);

      // Call the appropriate edge function
      const { data: result, error } = await supabase.functions.invoke(edgeFunctionName, {
        body: requestData
      });

      addDebugLog('📥 Received response from edge function');

      if (error) {
        addDebugLog(`❌ Edge function error: ${error.message}`);
        throw error;
      }

      if (!result?.success) {
        addDebugLog(`❌ VPN creation failed: ${result?.error || 'Unknown error'}`);
        throw new Error(result?.error || 'VPN creation failed');
      }

      addDebugLog('✅ VPN creation successful!');
      addDebugLog(`Response: ${JSON.stringify(result, null, 2)}`);

      if (result.data?.subscription_url) {
        addDebugLog(`🔗 Subscription URL: ${result.data.subscription_url}`);
      }

      setCreationResult(result);

      toast({
        title: 'VPN Created Successfully',
        description: `User ${formData.username} has been created on ${panelType} panel`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`❌ Error: ${errorMessage}`);
      
      setCreationResult({
        success: false,
        error: errorMessage
      });

      toast({
        title: 'VPN Creation Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Manual VPN Creation Tool
          </CardTitle>
          <CardDescription>
            Test VPN creation functions directly with debug logging for troubleshooting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Manual Mode Toggle */}
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="manual-mode"
                checked={isManualMode}
                onChange={(e) => {
                  setIsManualMode(e.target.checked);
                  if (e.target.checked && !manualApiBody.trim()) {
                    setManualApiBody(getDefaultApiBody());
                  }
                }}
                className="rounded"
              />
              <Label htmlFor="manual-mode" className="font-medium">
                Manual Mode
              </Label>
            </div>
            <p className="text-sm text-blue-700">
              Enable to manually edit the API request body with variable support ({"{{username}}"}, {"{{expire}}"}, {"{{data_limit}}"}, {"{{note}}"})
            </p>
          </div>

          {isManualMode ? (
            /* Manual API Body Editor */
            <div className="space-y-2">
              <Label htmlFor="apiBody">Custom API Request Body</Label>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Edit the JSON body that will be sent to the panel API. Supported variables: 
                  <code className="bg-gray-100 px-1 rounded">{"{{username}}"}</code>, 
                  <code className="bg-gray-100 px-1 rounded">{"{{expire}}"}</code>, 
                  <code className="bg-gray-100 px-1 rounded">{"{{data_limit}}"}</code>, 
                  <code className="bg-gray-100 px-1 rounded">{"{{note}}"}</code>
                </p>
                <Textarea
                  id="apiBody"
                  value={manualApiBody}
                  onChange={(e) => setManualApiBody(e.target.value)}
                  placeholder="Enter custom API body JSON..."
                  rows={15}
                  className="font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setManualApiBody(getDefaultApiBody())}
                  >
                    Reset to Default Template
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      try {
                        const formatted = JSON.stringify(JSON.parse(manualApiBody), null, 2);
                        setManualApiBody(formatted);
                        toast({ title: 'JSON formatted successfully' });
                      } catch (error) {
                        toast({ 
                          title: 'Invalid JSON', 
                          description: error.message,
                          variant: 'destructive' 
                        });
                      }
                    }}
                  >
                    Format JSON
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Form Fields */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="flex gap-2">
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="bnets_123456_abc"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormData(prev => ({ ...prev, username: generateRandomUsername() }))}
                >
                  Generate
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">Subscription Plan</Label>
              <Select value={formData.planId} onValueChange={(value) => setFormData(prev => ({ ...prev, planId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans?.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      <div className="flex items-center gap-2">
                        <span>{plan.name_en}</span>
                        <Badge variant="outline" className="text-xs">
                          {plan.plan_id}
                        </Badge>
                        {plan.panel_servers && (
                          <Badge variant={plan.panel_servers.health_status === 'online' ? 'default' : 'destructive'} className="text-xs">
                            {plan.panel_servers.type}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataLimit">Data Limit (GB)</Label>
              <Input
                id="dataLimit"
                type="number"
                value={formData.dataLimitGB}
                onChange={(e) => setFormData(prev => ({ ...prev, dataLimitGB: parseInt(e.target.value) }))}
                min="1"
                max="1000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (Days)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.durationDays}
                onChange={(e) => setFormData(prev => ({ ...prev, durationDays: parseInt(e.target.value) }))}
                min="1"
                max="365"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes for the VPN user"
                rows={2}
              />
            </div>
          </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleCreateVpn}
              disabled={isCreating || !formData.username || !formData.planId}
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Creating VPN...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Create VPN User
                </>
              )}
            </Button>
            <Button onClick={clearLogs} variant="outline">
              Clear Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Creation Result */}
      {creationResult && (
        <Card className={creationResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {creationResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              Creation Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            {creationResult.success ? (
              <div className="space-y-2">
                <p className="text-green-800">VPN user created successfully!</p>
                {creationResult.data?.subscription_url && (
                  <div>
                    <strong>Subscription URL:</strong>
                    <p className="font-mono text-sm bg-white p-2 rounded border break-all">
                      {creationResult.data.subscription_url}
                    </p>
                  </div>
                )}
                {creationResult.data && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium">Response Details</summary>
                    <pre className="text-xs bg-white p-2 rounded border mt-2 overflow-auto">
                      {JSON.stringify(creationResult.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ) : (
              <p className="text-red-800">Error: {creationResult.error}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Debug Logs */}
      {debugLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Logs</CardTitle>
            <CardDescription>
              Real-time logging of the VPN creation process
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-auto">
              {debugLogs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Panel Status Overview */}
      {panels && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Panel Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {panels.map((panel) => (
                <div key={panel.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Badge variant={panel.health_status === 'online' ? 'default' : 'destructive'}>
                    {panel.health_status}
                  </Badge>
                  <div>
                    <div className="font-medium">{panel.name}</div>
                    <div className="text-sm text-gray-600">
                      {panel.type} • {panel.panel_url}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
