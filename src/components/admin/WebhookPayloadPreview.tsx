import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Copy, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateSampleData } from '@/utils/webhookDatabaseDetection';

interface WebhookPayloadPreviewProps {
  payloadConfig: WebhookPayloadConfig[];
  triggers: WebhookTrigger[];
}

interface WebhookPayloadConfig {
  id: string;
  parameter_name: string;
  parameter_type: string;
  parameter_source: string | null;
  custom_value: string | null;
  is_enabled: boolean;
}

interface WebhookTrigger {
  id: string;
  trigger_name: string;
  is_enabled: boolean;
}

export const WebhookPayloadPreview = ({ payloadConfig, triggers }: WebhookPayloadPreviewProps) => {
  const { toast } = useToast();
  const [selectedTrigger, setSelectedTrigger] = useState<string>('');
  const [previewPayload, setPreviewPayload] = useState<any>({});
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    generatePreview();
  }, [payloadConfig, selectedTrigger, refreshKey]);

  const generatePreview = () => {
    const enabledParams = payloadConfig.filter(p => p.is_enabled);
    const preview: any = {};

    // Add basic webhook metadata
    preview.webhook_type = selectedTrigger || 'subscription_creation';
    preview.trigger_type = selectedTrigger || 'subscription_creation';
    preview.timestamp = new Date().toISOString();

    // Add configured parameters
    enabledParams.forEach(param => {
      let value: any;

      if (param.parameter_source) {
        // Generate sample data based on parameter source
        value = generateSampleData(param.parameter_source, getDataTypeFromSource(param.parameter_source));
      } else if (param.custom_value) {
        // Use custom value - try to parse as JSON, fall back to string
        try {
          value = JSON.parse(param.custom_value);
        } catch {
          value = param.custom_value;
        }
      } else {
        // Generate default sample based on parameter name
        value = generateSampleData(param.parameter_name, 'text');
      }

      // Handle nested parameter names (e.g., "subscription.username")
      if (param.parameter_name.includes('.')) {
        const parts = param.parameter_name.split('.');
        let current = preview;
        
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) {
            current[parts[i]] = {};
          }
          current = current[parts[i]];
        }
        
        current[parts[parts.length - 1]] = value;
      } else {
        preview[param.parameter_name] = value;
      }
    });

    // Add trigger-specific sample data
    if (selectedTrigger) {
      addTriggerSpecificData(preview, selectedTrigger);
    }

    setPreviewPayload(preview);
  };

  const addTriggerSpecificData = (preview: any, triggerType: string) => {
    switch (triggerType) {
      case 'manual_payment_approval':
        preview.payment_verification = {
          receipt_uploaded: true,
          receipt_url: 'https://storage.example.com/receipts/receipt-12345.jpg',
          requires_manual_approval: true,
          admin_decision_required: true,
          amount_toman: 250000,
          payment_method: 'manual_transfer'
        };
        
        preview.admin_actions = {
          approve_url: 'https://admin.example.com/approve/12345?token=abc123',
          reject_url: 'https://admin.example.com/reject/12345?token=abc123',
          admin_dashboard_url: 'https://admin.example.com/users',
          subscription_management_url: 'https://admin.example.com/users?search=sample_user'
        };

        preview.subscription_data = {
          id: 'sub-12345-example',
          username: 'sample_user_123',
          mobile: '09123456789',
          email: 'user@example.com',
          data_limit_gb: 50,
          duration_days: 30,
          price_toman: 250000,
          status: 'pending_approval',
          plan_name: 'Premium Plan',
          panel_name: 'Germany Server 1',
          created_at: new Date().toISOString()
        };
        break;

      case 'test_account_creation':
        preview.test_user_data = {
          id: 'test-12345-example',
          username: 'test_user_123',
          email: 'test@example.com',
          phone_number: '09123456789',
          panel_name: 'Germany Server 1',
          expire_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          subscription_url: 'vmess://eyJ2IjoiMiIsInBzIjoi...',
          data_limit_gb: 1,
          is_free_trial: true
        };
        break;

      case 'subscription_creation':
        preview.subscription_details = {
          id: 'sub-12345-example',
          username: 'premium_user_456',
          mobile: '09123456789',
          email: 'user@example.com',
          plan_name: 'Premium Monthly',
          panel_name: 'Germany Server 1',
          data_limit_gb: 100,
          duration_days: 30,
          price_toman: 500000,
          payment_method: 'zarinpal',
          status: 'active',
          subscription_url: 'vmess://eyJ2IjoiMiIsInBzIjoi...'
        };
        break;

      case 'stripe_payment_success':
        preview.payment_data = {
          payment_id: 'pi_1234567890',
          amount: 2500, // cents
          currency: 'usd',
          status: 'succeeded',
          payment_method: 'card',
          customer_email: 'customer@example.com'
        };
        break;

      case 'zarinpal_payment_success':
        preview.payment_data = {
          authority: 'A00000000000000000000000000123456789',
          ref_id: '123456789',
          amount: 250000, // toman
          status: 'OK',
          payment_method: 'zarinpal'
        };
        break;

      case 'subscription_update':
        preview.update_details = {
          previous_status: 'pending',
          new_status: 'active',
          updated_fields: ['status', 'subscription_url', 'updated_at'],
          updated_by: 'system',
          reason: 'payment_confirmed'
        };
        break;
    }
  };

  const getDataTypeFromSource = (source: string): string => {
    const numericFields = ['data_limit_gb', 'duration_days', 'price_toman', 'amount', 'max_amount'];
    const booleanFields = ['is_enabled', 'is_active', 'success', 'is_free_trial'];
    const timestampFields = ['created_at', 'updated_at', 'expire_at', 'signed_at'];
    const uuidFields = ['id', 'subscription_id', 'plan_id', 'panel_id', 'user_id'];

    if (numericFields.some(field => source.includes(field))) return 'integer';
    if (booleanFields.some(field => source.includes(field))) return 'boolean';
    if (timestampFields.some(field => source.includes(field))) return 'timestamp';
    if (uuidFields.some(field => source.includes(field))) return 'uuid';
    
    return 'text';
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(previewPayload, null, 2));
      toast({
        title: 'Copied!',
        description: 'Payload preview copied to clipboard'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive'
      });
    }
  };

  const refreshPreview = () => {
    setRefreshKey(prev => prev + 1);
    toast({
      title: 'Refreshed',
      description: 'Payload preview updated with new sample data'
    });
  };

  const enabledTriggers = triggers.filter(t => t.is_enabled);
  const enabledParams = payloadConfig.filter(p => p.is_enabled);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Payload Preview
            </CardTitle>
            <CardDescription>
              Dynamic preview of webhook payload based on your configuration
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={refreshPreview} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={copyToClipboard} variant="outline" size="sm">
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trigger Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Preview for Trigger:</label>
            <Badge variant="outline">
              {enabledParams.length} parameters enabled
            </Badge>
          </div>
          <Select value={selectedTrigger} onValueChange={setSelectedTrigger}>
            <SelectTrigger>
              <SelectValue placeholder="Select trigger type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Triggers (Generic)</SelectItem>
              {enabledTriggers.map(trigger => (
                <SelectItem key={trigger.id} value={trigger.trigger_name}>
                  {trigger.trigger_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Preview Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">JSON Payload:</span>
            <Badge variant={Object.keys(previewPayload).length > 0 ? "default" : "secondary"}>
              {Object.keys(previewPayload).length} fields
            </Badge>
          </div>
          
          <div className="relative">
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-96 border">
              <code>{JSON.stringify(previewPayload, null, 2)}</code>
            </pre>
            
            {Object.keys(previewPayload).length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg">
                <div className="text-center">
                  <p className="text-muted-foreground">No parameters configured</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add parameters to see the payload preview
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Parameter Summary */}
        {enabledParams.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Active Parameters:</span>
            <div className="flex flex-wrap gap-2">
              {enabledParams.map(param => (
                <Badge key={param.id} variant="secondary" className="text-xs">
                  {param.parameter_name}
                  {param.parameter_source && (
                    <span className="ml-1 text-muted-foreground">
                      ← {param.parameter_source}
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Helpful Notes */}
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> This preview shows sample data. Actual webhook payloads will contain real data from your database based on the configured parameter sources. 
            {selectedTrigger && ` This preview is optimized for "${selectedTrigger}" trigger type.`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};