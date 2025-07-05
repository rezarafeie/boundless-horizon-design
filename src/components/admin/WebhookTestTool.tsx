
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle, Send } from 'lucide-react';

export const WebhookTestTool = () => {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  const testWebhook = async () => {
    setTesting(true);
    try {
      console.log('WEBHOOK_TEST: Testing webhook via unified admin system...');
      
      const { data, error } = await supabase.functions.invoke('send-webhook-notification', {
        body: {
          type: 'test',
          webhook_type: 'test',
          username: 'webhook_test_user',
          test_message: 'Admin webhook connectivity test',
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString()
        }
      });

      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (data?.success) {
        setLastTestResult({ success: true });
        toast({
          title: "Webhook Test Success",
          description: "Webhook endpoint is reachable via admin configuration",
        });
      } else {
        const errorMsg = data?.error || 'Unknown webhook error';
        setLastTestResult({ success: false, error: errorMsg });
        toast({
          title: "Webhook Test Failed",
          description: `Webhook failed: ${errorMsg}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastTestResult({ success: false, error: errorMessage });
      toast({
        title: "Webhook Test Error",
        description: `Failed to test webhook: ${errorMessage}`,
        variant: "destructive"
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
          Webhook Connectivity Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Test webhook endpoint connectivity and response
            </p>
            {lastTestResult && (
              <div className="flex items-center gap-2 mt-2">
                {lastTestResult.success ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Connected
                    </Badge>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-600" />
                    <Badge variant="destructive">
                      Failed
                    </Badge>
                    {lastTestResult.error && (
                      <span className="text-xs text-red-600">
                        {lastTestResult.error}
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <Button 
            onClick={testWebhook}
            disabled={testing}
            size="sm"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Test Webhook
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
          <strong>Note:</strong> This test uses the admin webhook configuration. Configure your webhook URL in the Webhook Settings tab.
        </div>
      </CardContent>
    </Card>
  );
};
