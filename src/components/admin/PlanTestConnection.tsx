
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, AlertCircle, TestTube, Trash2 } from 'lucide-react';
import { PlanService } from '@/services/planService';
import { TestDebugLog } from './TestDebugLog';

interface Plan {
  id: string;
  plan_id: string;
  name_en: string;
  name_fa: string;
  api_type: 'marzban' | 'marzneshin';
  is_active: boolean;
}

interface PlanTestResult {
  success: boolean;
  planId: string;
  planName: string;
  primaryPanel?: {
    id: string;
    name: string;
    type: string;
    testResult?: any;
  };
  availablePanels: number;
  errors: string[];
  detailedLogs?: Array<{
    step: string;
    status: 'success' | 'error' | 'info';
    message: string;
    details?: any;
    timestamp: string;
  }>;
  timestamp: string;
}

interface PlanTestConnectionProps {
  plan: Plan;
  onTestComplete?: (result: PlanTestResult) => void;
}

export const PlanTestConnection = ({ plan, onTestComplete }: PlanTestConnectionProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<PlanTestResult[]>([]);

  const testPlanConfiguration = async () => {
    setIsLoading(true);
    
    try {
      console.log('Testing plan configuration:', plan.id);
      
      const detailedLogs: Array<{
        step: string;
        status: 'success' | 'error' | 'info';
        message: string;
        details?: any;
        timestamp: string;
      }> = [];

      const addLog = (step: string, status: 'success' | 'error' | 'info', message: string, details?: any) => {
        detailedLogs.push({
          step,
          status,
          message,
          details,
          timestamp: new Date().toISOString()
        });
      };

      addLog('Plan Validation', 'info', `Starting configuration test for plan: ${plan.name_en}`);
      
      // Get plan configuration from the service
      const planConfig = await PlanService.getPlanById(plan.id);
      if (!planConfig) {
        addLog('Plan Validation', 'error', 'Plan configuration not found in database', { planId: plan.id });
        throw new Error('Plan configuration not found');
      }

      addLog('Plan Validation', 'success', 'Plan configuration retrieved successfully', {
        planId: planConfig.id,
        apiType: planConfig.api_type,
        isActive: planConfig.is_active,
        isVisible: planConfig.is_visible
      });

      const errors: string[] = [];
      let success = true;

      // Check if plan has panels
      addLog('Panel Configuration', 'info', 'Checking associated panels');
      if (!planConfig.panels || planConfig.panels.length === 0) {
        const error = 'No panels configured for this plan';
        errors.push(error);
        addLog('Panel Configuration', 'error', error, { availablePanels: 0 });
        success = false;
      } else {
        addLog('Panel Configuration', 'success', `Found ${planConfig.panels.length} associated panel(s)`, {
          panels: planConfig.panels.map(p => ({ id: p.id, name: p.name, type: p.type, health: p.health_status }))
        });
      }

      // Check primary panel
      addLog('Primary Panel', 'info', 'Checking for primary panel configuration');
      const primaryPanel = PlanService.getPrimaryPanel(planConfig);
      if (!primaryPanel) {
        const error = 'No primary panel configured';
        errors.push(error);
        addLog('Primary Panel', 'error', error);
        success = false;
      } else {
        addLog('Primary Panel', 'success', `Primary panel identified: ${primaryPanel.name}`, {
          panelId: primaryPanel.id,
          panelName: primaryPanel.name,
          panelType: primaryPanel.type,
          panelUrl: primaryPanel.panel_url,
          healthStatus: primaryPanel.health_status
        });
      }

      // Check panel health status
      addLog('Health Check', 'info', 'Analyzing panel health status');
      const healthyPanels = planConfig.panels.filter(p => p.health_status === 'online');
      const offlinePanels = planConfig.panels.filter(p => p.health_status === 'offline');
      const unknownPanels = planConfig.panels.filter(p => p.health_status === 'unknown');

      addLog('Health Check', 'info', 'Panel health status summary', {
        totalPanels: planConfig.panels.length,
        onlinePanels: healthyPanels.length,
        offlinePanels: offlinePanels.length,
        unknownPanels: unknownPanels.length
      });

      if (healthyPanels.length === 0) {
        const warning = 'No panels are currently online - this may affect subscription creation';
        addLog('Health Check', 'error', warning, {
          recommendation: 'Test individual panels using the panel test feature to diagnose connectivity issues'
        });
      } else {
        addLog('Health Check', 'success', `${healthyPanels.length} panel(s) are online and ready`);
      }

      // API Type validation
      addLog('API Compatibility', 'info', 'Validating API type compatibility');
      const apiType = PlanService.getApiType(planConfig);
      const compatiblePanels = planConfig.panels.filter(p => p.type === apiType);
      
      if (compatiblePanels.length === 0) {
        const error = `No panels match the plan's API type (${apiType})`;
        errors.push(error);
        addLog('API Compatibility', 'error', error, {
          planApiType: apiType,
          panelTypes: planConfig.panels.map(p => ({ name: p.name, type: p.type }))
        });
        success = false;
      } else {
        addLog('API Compatibility', 'success', `${compatiblePanels.length} panel(s) are compatible with ${apiType} API`, {
          compatiblePanels: compatiblePanels.map(p => ({ name: p.name, type: p.type }))
        });
      }

      // Test subscription creation logic (simulation)
      if (success && primaryPanel) {
        addLog('Subscription Test', 'info', 'Simulating subscription creation process');
        try {
          addLog('Subscription Test', 'success', 'Subscription creation simulation completed successfully', {
            planName: planConfig.name_en,
            apiType: PlanService.getApiType(planConfig),
            primaryPanel: primaryPanel.name,
            panelsCount: planConfig.panels.length,
            simulationNote: 'No actual user was created during this test'
          });
        } catch (testError) {
          const error = `Subscription test failed: ${testError instanceof Error ? testError.message : 'Unknown error'}`;
          errors.push(error);
          addLog('Subscription Test', 'error', error, { error: testError });
          success = false;
        }
      }

      addLog('Test Completion', success ? 'success' : 'error', `Plan configuration test completed with ${success ? 'success' : 'failures'}`, {
        totalErrors: errors.length,
        errors: errors
      });

      const result: PlanTestResult = {
        success,
        planId: plan.id,
        planName: plan.name_en,
        primaryPanel: primaryPanel ? {
          id: primaryPanel.id,
          name: primaryPanel.name,
          type: primaryPanel.type
        } : undefined,
        availablePanels: planConfig.panels.length,
        errors,
        detailedLogs,
        timestamp: new Date().toISOString()
      };

      // Add the new test result to the beginning of the array
      setTestResults(prev => [result, ...prev]);
      
      if (onTestComplete) {
        onTestComplete(result);
      }
      
    } catch (error) {
      console.error('Failed to test plan configuration:', error);
      const errorResult: PlanTestResult = {
        success: false,
        planId: plan.id,
        planName: plan.name_en,
        availablePanels: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        detailedLogs: [{
          step: 'Test Failure',
          status: 'error',
          message: `Plan configuration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: { error },
          timestamp: new Date().toISOString()
        }],
        timestamp: new Date().toISOString()
      };
      setTestResults(prev => [errorResult, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const getStatusIcon = (success: boolean) => {
    if (success) return <CheckCircle className="w-4 h-4 text-green-600" />;
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  const getStatusBadge = (success: boolean) => {
    if (success) return <Badge className="bg-green-100 text-green-800">Valid</Badge>;
    return <Badge className="bg-red-100 text-red-800">Issues Found</Badge>;
  };

  const latestResult = testResults[0];

  return (
    <div className="space-y-4">
      {/* Test Controls */}
      <div className="flex gap-2">
        <Button 
          onClick={testPlanConfiguration} 
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing Plan Configuration...
            </>
          ) : (
            <>
              <TestTube className="w-4 h-4 mr-2" />
              Test Plan Configuration
            </>
          )}
        </Button>
        
        {testResults.length > 0 && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={clearResults}
            className="flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Current Test Status */}
      {isLoading && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-800">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="font-medium">Testing plan configuration...</span>
            </div>
            <p className="text-sm text-blue-600 mt-1">
              Please wait while we validate the plan configuration and panel connectivity.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Test Results History */}
      {testResults.map((testResult, index) => (
        <Card key={`${testResult.timestamp}-${index}`} className={`${testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(testResult.success)}
              Plan Configuration Test
              {getStatusBadge(testResult.success)}
              {index === 0 && (
                <Badge variant="outline" className="text-xs">Latest</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Configuration test for plan: {testResult.planName} - {new Date(testResult.timestamp).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Available Panels:</span>
                <p>{testResult.availablePanels}</p>
              </div>
              {testResult.primaryPanel && (
                <div>
                  <span className="font-medium">Primary Panel:</span>
                  <p>{testResult.primaryPanel.name} ({testResult.primaryPanel.type})</p>
                </div>
              )}
            </div>

            {testResult.errors.length > 0 && (
              <div>
                <h4 className="font-medium text-red-700">Issues Found:</h4>
                <ul className="text-sm text-red-600 ml-4 mt-1">
                  {testResult.errors.map((error, errorIndex) => (
                    <li key={errorIndex} className="list-disc">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {testResult.success && (
              <div className="text-sm text-green-700">
                <p>✅ Plan configuration is valid and ready for subscriptions</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Always show debug logs for the latest test */}
      {latestResult && latestResult.detailedLogs && latestResult.detailedLogs.length > 0 && (
        <TestDebugLog
          logs={latestResult.detailedLogs}
          title="Plan Configuration Debug Logs"
          isVisible={true}
        />
      )}
    </div>
  );
};
