import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, AlertCircle, TestTube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TestDebugLog } from './TestDebugLog';

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
}

interface DetailedLog {
  step: string;
  status: 'success' | 'error' | 'info';
  message: string;
  details?: any;
  timestamp: string;
}

interface TestResult {
  success: boolean;
  panel: {
    id: string;
    name: string;
    type: string;
    url: string;
  };
  authentication: {
    success: boolean;
    tokenReceived?: boolean;
    tokenType?: string;
    isSudo?: boolean;
    error?: string;
  };
  userCreation: {
    success: boolean;
    username?: string;
    subscriptionUrl?: string;
    error?: string;
  };
  detailedLogs: DetailedLog[];
  timestamp: string;
}

interface PanelTestConnectionProps {
  panel: Panel;
  onTestComplete?: (result: TestResult) => void;
}

export const PanelTestConnection = ({ panel, onTestComplete }: PanelTestConnectionProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [showDebugLogs, setShowDebugLogs] = useState(false);

  const testConnection = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      console.log('Testing panel connection:', panel.id);
      
      const { data, error } = await supabase.functions.invoke('test-panel-connection', {
        body: { panelId: panel.id }
      });

      if (error) {
        console.error('Test connection error:', error);
        throw new Error(error.message);
      }

      console.log('Test connection result:', data);
      setTestResult(data);
      
      if (data.success) {
        toast.success(`Panel ${panel.name} is working correctly!`);
      } else {
        toast.error(`Panel ${panel.name} test failed. Check the details below.`);
      }
      
      if (onTestComplete) {
        onTestComplete(data);
      }
      
    } catch (error) {
      console.error('Failed to test panel connection:', error);
      const errorResult: TestResult = {
        success: false,
        panel: {
          id: panel.id,
          name: panel.name,
          type: panel.type,
          url: panel.panel_url
        },
        authentication: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        userCreation: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        detailedLogs: [
          {
            step: 'Test Initialization',
            status: 'error',
            message: `Failed to initialize test: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date().toISOString()
          }
        ],
        timestamp: new Date().toISOString()
      };
      setTestResult(errorResult);
      toast.error(`Failed to test panel ${panel.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    if (success) return <CheckCircle className="w-4 h-4 text-green-600" />;
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  const getStatusBadge = (success: boolean) => {
    if (success) return <Badge className="bg-green-100 text-green-800">Success</Badge>;
    return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
  };

  return (
    <div className="space-y-4">
      <Button 
        onClick={testConnection} 
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Testing Connection...
          </>
        ) : (
          <>
            <TestTube className="w-4 h-4 mr-2" />
            Test Panel Connection
          </>
        )}
      </Button>

      {testResult && (
        <>
          <Card className={`${testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(testResult.success)}
                Connection Test Results
                {getStatusBadge(testResult.success)}
              </CardTitle>
              <CardDescription>
                Test completed at {new Date(testResult.timestamp).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  {getStatusIcon(testResult.authentication.success)}
                  Authentication Test
                </h4>
                <div className="text-sm text-gray-600 ml-6">
                  {testResult.authentication.success ? (
                    <div>
                      <p>✅ Successfully authenticated with panel</p>
                      {testResult.authentication.tokenReceived && (
                        <p>✅ Access token received</p>
                      )}
                      {testResult.authentication.tokenType && (
                        <p>Token type: {testResult.authentication.tokenType}</p>
                      )}
                      {testResult.authentication.isSudo !== undefined && (
                        <p>Sudo privileges: {testResult.authentication.isSudo ? 'Yes' : 'No'}</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p>❌ Authentication failed</p>
                      {testResult.authentication.error && (
                        <p className="text-red-600">Error: {testResult.authentication.error}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium flex items-center gap-2">
                  {getStatusIcon(testResult.userCreation.success)}
                  User Creation Test
                </h4>
                <div className="text-sm text-gray-600 ml-6">
                  {testResult.userCreation.success ? (
                    <div>
                      <p>✅ Successfully created and deleted test user</p>
                      {testResult.userCreation.username && (
                        <p>Test username: {testResult.userCreation.username}</p>
                      )}
                      {testResult.userCreation.subscriptionUrl && (
                        <p>✅ Subscription URL generated</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p>❌ User creation failed</p>
                      {testResult.userCreation.error && (
                        <p className="text-red-600">Error: {testResult.userCreation.error}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t">
                <h4 className="font-medium">Panel Information</h4>
                <div className="text-sm text-gray-600">
                  <p>Name: {testResult.panel.name}</p>
                  <p>Type: {testResult.panel.type}</p>
                  <p>URL: {testResult.panel.url}</p>
                </div>
              </div>

              {/* Debug Logs Toggle */}
              {testResult.detailedLogs && testResult.detailedLogs.length > 0 && (
                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDebugLogs(!showDebugLogs)}
                    className="w-full"
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    {showDebugLogs ? 'Hide' : 'Show'} Detailed Debug Logs
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Debug Logs Component */}
          <TestDebugLog
            logs={testResult.detailedLogs || []}
            title="Panel Connection Debug Logs"
            isVisible={showDebugLogs}
          />
        </>
      )}
    </div>
  );
};
