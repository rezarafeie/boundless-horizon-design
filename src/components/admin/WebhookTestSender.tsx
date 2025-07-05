import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface WebhookTestSenderProps {
  webhookUrl?: string;
}

export const WebhookTestSender = ({ webhookUrl }: WebhookTestSenderProps) => {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    response?: any;
    error?: string;
  } | null>(null);
  
  const [selectedTestType, setSelectedTestType] = useState('subscription_creation');
  const [customPayload, setCustomPayload] = useState('');
  const [useCustomPayload, setUseCustomPayload] = useState(false);

  const generateTestPayload = (testType: string) => {
    const basePayload = {
      webhook_type: testType,
      type: testType === 'test_account_creation' ? 'new_test_user' : 'new_subscription',
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    switch (testType) {
      case 'manual_payment_approval':
        return {
          ...basePayload,
          subscription_id: 'test-sub-12345',
          username: 'test_user_manual',
          mobile: '09123456789',
          email: 'manual@test.com',
          amount: 250000,
          payment_method: 'manual_transfer',
          receipt_url: 'https://example.com/receipt.jpg',
          plan_name: 'Premium Test Plan',
          panel_name: 'Test Panel Server',
          data_limit_gb: 50,
          duration_days: 30,
          status: 'pending'
        };
      
      case 'test_account_creation':
        return {
          ...basePayload,
          test_user_id: 'test-user-12345',
          username: 'test_user_free',
          email: 'testuser@example.com',
          mobile: '09123456789',
          phone_number: '09123456789',
          panel_name: 'Free Test Panel',
          subscription_url: 'vmess://eyJ2IjoiMiIsInBzIjoi...',
          data_limit_gb: 1,
          expire_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_free_trial: true
        };
      
      case 'subscription_creation':
        return {
          ...basePayload,
          subscription_id: 'test-sub-67890',
          username: 'test_user_premium',
          mobile: '09123456789',
          email: 'premium@test.com',
          amount: 500000,
          payment_method: 'zarinpal',
          plan_name: 'Premium Monthly',
          panel_name: 'Germany Server 1',
          data_limit_gb: 100,
          duration_days: 30,
          subscription_url: 'vmess://eyJ2IjoiMiIsInBzIjoi...',
          status: 'active'
        };
      
      case 'stripe_payment_success':
        return {
          ...basePayload,
          subscription_id: 'test-sub-stripe-123',
          username: 'stripe_test_user',
          email: 'stripe@test.com',
          amount: 2500, // cents
          currency: 'usd',
          payment_method: 'stripe',
          payment_id: 'pi_test_1234567890',
          plan_name: 'International Plan'
        };
      
      case 'zarinpal_payment_success':
        return {
          ...basePayload,
          subscription_id: 'test-sub-zarinpal-456',
          username: 'zarinpal_test_user',
          mobile: '09123456789',
          amount: 300000, // toman
          payment_method: 'zarinpal',
          authority: 'A00000000000000000000000000123456789',
          ref_id: '123456789',
          plan_name: 'Iran Premium Plan'
        };
      
      default:
        return basePayload;
    }
  };

  const sendTestWebhook = async () => {
    if (!webhookUrl) {
      toast({
        title: 'Error',
        description: 'No webhook URL configured. Please set up webhook URL first.',
        variant: 'destructive'
      });
      return;
    }

    setTesting(true);
    setTestResult(null);
    
    try {
      let payload;
      
      if (useCustomPayload && customPayload.trim()) {
        try {
          payload = JSON.parse(customPayload);
        } catch (e) {
          throw new Error('Invalid JSON in custom payload');
        }
      } else {
        payload = generateTestPayload(selectedTestType);
      }

      console.log('Sending test webhook with payload:', payload);

      const { data, error } = await supabase.functions.invoke('send-webhook-notification', {
        body: payload
      });

      console.log('Webhook test response:', { data, error });

      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }

      setTestResult({
        success: data?.success || false,
        response: data,
        error: data?.error
      });

      if (data?.success) {
        toast({
          title: 'Webhook Test Successful!',
          description: 'Test webhook was sent successfully to your endpoint.',
        });
      } else {
        toast({
          title: 'Webhook Test Failed',
          description: data?.error || 'Unknown error occurred',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Webhook test error:', error);
      setTestResult({
        success: false,
        error: error.message
      });
      
      toast({
        title: 'Test Failed',
        description: `Webhook test failed: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Test Webhook Sender
        </CardTitle>
        <CardDescription>
          Send test webhooks to verify your endpoint configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Webhook URL Display */}
        <div className="space-y-2">
          <Label>Current Webhook URL</Label>
          <div className="p-2 bg-muted rounded font-mono text-sm">
            {webhookUrl || 'No webhook URL configured'}
          </div>
        </div>

        {/* Test Type Selection */}
        <div className="space-y-2">
          <Label>Test Webhook Type</Label>
          <Select value={selectedTestType} onValueChange={setSelectedTestType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual_payment_approval">Manual Payment Approval</SelectItem>
              <SelectItem value="test_account_creation">Test Account Creation</SelectItem>
              <SelectItem value="subscription_creation">Subscription Creation</SelectItem>
              <SelectItem value="stripe_payment_success">Stripe Payment Success</SelectItem>
              <SelectItem value="zarinpal_payment_success">ZarinPal Payment Success</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Payload Option */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useCustomPayload"
              checked={useCustomPayload}
              onChange={(e) => setUseCustomPayload(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="useCustomPayload">Use Custom Payload</Label>
          </div>
          
          {useCustomPayload && (
            <div className="space-y-2">
              <Label>Custom JSON Payload</Label>
              <Textarea
                value={customPayload}
                onChange={(e) => setCustomPayload(e.target.value)}
                placeholder='{"webhook_type": "custom_test", "message": "Hello World"}'
                rows={6}
                className="font-mono text-sm"
              />
            </div>
          )}
        </div>

        {/* Preview of Generated Payload */}
        {!useCustomPayload && (
          <div className="space-y-2">
            <Label>Preview of Test Payload</Label>
            <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-48">
              {JSON.stringify(generateTestPayload(selectedTestType), null, 2)}
            </pre>
          </div>
        )}

        {/* Send Button */}
        <Button 
          onClick={sendTestWebhook} 
          disabled={testing || !webhookUrl}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending Test...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Test Webhook
            </>
          )}
        </Button>

        {/* Test Result */}
        {testResult && (
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              {testResult.success ? (
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
              <span className="font-medium">Test Result</span>
            </div>

            {testResult.error && (
              <div className="space-y-1">
                <Label className="text-sm text-red-600">Error Message:</Label>
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {testResult.error}
                </p>
              </div>
            )}

            {testResult.response && (
              <div className="space-y-1">
                <Label className="text-sm">Response Details:</Label>
                <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(testResult.response, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          <strong>Tip:</strong> Check your webhook endpoint logs to verify the payload was received correctly.
          Make sure your endpoint returns a 2xx status code for successful processing.
        </div>
      </CardContent>
    </Card>
  );
};