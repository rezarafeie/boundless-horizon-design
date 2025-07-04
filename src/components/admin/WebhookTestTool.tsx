
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { WebhookService } from '@/utils/webhookUtils';
import { Loader2, CheckCircle, XCircle, Send } from 'lucide-react';

export const WebhookTestTool = () => {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  const testWebhook = async () => {
    setTesting(true);
    try {
      console.log('WEBHOOK_TEST: Testing webhook connectivity...');
      
      const result = await WebhookService.testWebhookEndpoint();
      setLastTestResult(result.reachable ? { success: true } : { success: false, error: result.error });
      
      if (result.reachable) {
        toast({
          title: "Webhook Test Success",
          description: "Webhook endpoint is reachable and responding correctly",
        });
      } else {
        toast({
          title: "Webhook Test Failed",
          description: `Webhook endpoint is not reachable: ${result.error}`,
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
          <strong>Webhook URL:</strong> https://rafeie.app.n8n.cloud/webhook-test/bnetswewbmailnewusernotification
        </div>
      </CardContent>
    </Card>
  );
};
