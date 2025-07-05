import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle, RefreshCw, Bug } from 'lucide-react';

interface WebhookLog {
  id: string;
  trigger_type: string;
  success: boolean;
  response_status: number | null;
  response_body: string | null;
  error_message: string | null;
  sent_at: string;
  payload: any;
}

export const WebhookDebugPanel = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Failed to load webhook logs:', error);
      toast({
        title: "Error",
        description: "Failed to load webhook logs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testWebhook = async () => {
    setTesting(true);
    try {
      console.log('WEBHOOK_DEBUG: Testing webhook via unified admin system...');
      
      const { data, error } = await supabase.functions.invoke('send-webhook-notification', {
        body: {
          type: 'test',
          webhook_type: 'test_account_creation',
          test_user_id: 'debug-test-' + Date.now(),
          username: `debug_test_${Math.floor(Math.random() * 10000)}`,
          email: 'debug@test.com',
          phone_number: '09123456789',
          panel_name: 'Debug Test Panel',
          subscription_url: 'vmess://debug-test-url',
          data_limit_gb: 1,
          expire_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        }
      });

      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (data?.success) {
        toast({
          title: "Webhook Test Success",
          description: "Test webhook sent successfully",
        });
      } else {
        toast({
          title: "Webhook Test Failed",
          description: `Webhook failed: ${data?.error || 'Unknown error'}`,
          variant: "destructive"
        });
      }
      
      // Refresh logs after test
      setTimeout(loadLogs, 1000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Webhook Test Error",
        description: `Failed to test webhook: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="w-5 h-5" />
          Webhook Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={loadLogs}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Logs
              </>
            )}
          </Button>
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
              'Test Webhook'
            )}
          </Button>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No webhook logs found. Try testing a webhook or creating a test user.
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {log.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <Badge variant={log.success ? "default" : "destructive"}>
                      {log.trigger_type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(log.sent_at).toLocaleString()}
                    </span>
                  </div>
                  {log.response_status && (
                    <Badge variant="outline">
                      HTTP {log.response_status}
                    </Badge>
                  )}
                </div>
                
                {log.error_message && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    <strong>Error:</strong> {log.error_message}
                  </div>
                )}
                
                {log.response_body && (
                  <div className="text-sm bg-gray-50 p-2 rounded">
                    <strong>Response:</strong> {log.response_body}
                  </div>
                )}
                
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    View Payload
                  </summary>
                  <pre className="mt-2 bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                    {JSON.stringify(log.payload, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};