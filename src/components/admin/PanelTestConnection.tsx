
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, TestTube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  enabled_protocols: string[];
  panel_config_data: any;
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
  responseTime?: number;
  detailedLogs: DetailedLog[];
  timestamp: string;
}

interface PanelTestConnectionProps {
  panel: Panel;
  onTestComplete?: (result: TestResult) => void;
  disabled?: boolean;
}

export const PanelTestConnection = ({ panel, onTestComplete, disabled = false }: PanelTestConnectionProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentTestResult, setCurrentTestResult] = useState<TestResult | null>(null);

  const fetchLatestPanelConfig = async (panelId: string) => {
    try {
      console.log('PANEL-TEST: Fetching latest panel configuration for:', panelId);
      
      const { data: panelData, error } = await supabase
        .from('panel_servers')
        .select('*')
        .eq('id', panelId)
        .single();

      if (error) {
        console.error('PANEL-TEST: Failed to fetch panel config:', error);
        throw new Error(`Failed to fetch panel configuration: ${error.message}`);
      }

      console.log('PANEL-TEST: Latest panel config retrieved:', {
        enabled_protocols: panelData.enabled_protocols,
        panel_config_data: panelData.panel_config_data
      });

      return panelData;
    } catch (error) {
      console.error('PANEL-TEST: Error fetching panel config:', error);
      throw error;
    }
  };

  const buildDynamicProxiesObject = (enabledProtocols: string[]) => {
    const proxies: Record<string, {}> = {};
    
    // Only include enabled protocols
    enabledProtocols.forEach(protocol => {
      proxies[protocol] = {};
    });

    console.log('PANEL-TEST: Built dynamic proxies object:', proxies);
    return proxies;
  };

  const testConnection = async () => {
    setIsLoading(true);
    setCurrentTestResult(null);
    
    try {
      console.log('PANEL-TEST: Starting connection test for panel:', panel.id);
      
      // Step 1: Fetch latest panel configuration
      const latestPanelConfig = await fetchLatestPanelConfig(panel.id);
      const enabledProtocols = Array.isArray(latestPanelConfig.enabled_protocols) 
        ? latestPanelConfig.enabled_protocols as string[]
        : ['vless', 'vmess', 'trojan', 'shadowsocks']; // fallback

      console.log('PANEL-TEST: Using enabled protocols:', enabledProtocols);

      // Step 2: Build dynamic proxies object
      const dynamicProxies = buildDynamicProxiesObject(enabledProtocols);

      // Step 3: Call the test function with updated panel config
      const { data, error } = await supabase.functions.invoke('test-panel-connection', {
        body: { 
          panelId: panel.id,
          dynamicProxies: dynamicProxies,
          enabledProtocols: enabledProtocols
        }
      });

      if (error) {
        console.error('PANEL-TEST: Test connection error:', error);
        throw new Error(error.message);
      }

      console.log('PANEL-TEST: Test connection result:', data);
      
      // Set the current test result for immediate display
      setCurrentTestResult(data);
      
      if (onTestComplete) {
        onTestComplete(data);
      }
      
    } catch (error) {
      console.error('PANEL-TEST: Failed to test panel connection:', error);
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
      setCurrentTestResult(errorResult);
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
      {/* Test Controls */}
      <Button 
        onClick={testConnection} 
        disabled={isLoading || disabled}
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

      {/* Current Test Status */}
      {isLoading && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-800">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="font-medium">Testing in progress...</span>
            </div>
            <p className="text-sm text-blue-600 mt-1">
              Fetching latest panel configuration and testing connection...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current Test Result */}
      {currentTestResult && (
        <Card className={`${currentTestResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(currentTestResult.success)}
              Connection Test Results
              {getStatusBadge(currentTestResult.success)}
              <Badge variant="outline" className="text-xs">Latest</Badge>
            </CardTitle>
            <CardDescription>
              Test completed at {new Date(currentTestResult.timestamp).toLocaleString()}
              {currentTestResult.responseTime && (
                <span className="ml-2">• Response time: {currentTestResult.responseTime}ms</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium flex items-center gap-2">
                {getStatusIcon(currentTestResult.authentication.success)}
                Authentication Test
              </h4>
              <div className="text-sm text-gray-600 ml-6">
                {currentTestResult.authentication.success ? (
                  <div>
                    <p>✅ Successfully authenticated with panel</p>
                    {currentTestResult.authentication.tokenReceived && (
                      <p>✅ Access token received</p>
                    )}
                    {currentTestResult.authentication.tokenType && (
                      <p>Token type: {currentTestResult.authentication.tokenType}</p>
                    )}
                    {currentTestResult.authentication.isSudo !== undefined && (
                      <p>Sudo privileges: {currentTestResult.authentication.isSudo ? 'Yes' : 'No'}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p>❌ Authentication failed</p>
                    {currentTestResult.authentication.error && (
                      <p className="text-red-600">Error: {currentTestResult.authentication.error}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium flex items-center gap-2">
                {getStatusIcon(currentTestResult.userCreation.success)}
                User Creation Test
              </h4>
              <div className="text-sm text-gray-600 ml-6">
                {currentTestResult.userCreation.success ? (
                  <div>
                    <p>✅ Successfully created and deleted test user</p>
                    {currentTestResult.userCreation.username && (
                      <p>Test username: {currentTestResult.userCreation.username}</p>
                    )}
                    {currentTestResult.userCreation.subscriptionUrl && (
                      <p>✅ Subscription URL generated</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p>❌ User creation failed</p>
                    {currentTestResult.userCreation.error && (
                      <p className="text-red-600">Error: {currentTestResult.userCreation.error}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t">
              <h4 className="font-medium">Panel Information</h4>
              <div className="text-sm text-gray-600">
                <p>Name: {currentTestResult.panel.name}</p>
                <p>Type: {currentTestResult.panel.type}</p>
                <p>URL: {currentTestResult.panel.url}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Always show debug logs for the current test */}
      {currentTestResult && currentTestResult.detailedLogs && currentTestResult.detailedLogs.length > 0 && (
        <TestDebugLog
          logs={currentTestResult.detailedLogs}
          title="Panel Connection Debug Logs"
          isVisible={true}
        />
      )}
    </div>
  );
};
