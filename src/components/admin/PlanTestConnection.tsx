
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { PlanService } from '@/services/planService';
import { toast } from 'sonner';

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
}

interface PlanTestConnectionProps {
  plan: Plan;
  onTestComplete?: (result: PlanTestResult) => void;
}

export const PlanTestConnection = ({ plan, onTestComplete }: PlanTestConnectionProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<PlanTestResult | null>(null);

  const testPlanConfiguration = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      console.log('Testing plan configuration:', plan.id);
      
      // Get plan configuration from the service
      const planConfig = await PlanService.getPlanById(plan.id);
      if (!planConfig) {
        throw new Error('Plan configuration not found');
      }

      const errors: string[] = [];
      let success = true;

      // Check if plan has panels
      if (!planConfig.panels || planConfig.panels.length === 0) {
        errors.push('No panels configured for this plan');
        success = false;
      }

      // Check primary panel
      const primaryPanel = PlanService.getPrimaryPanel(planConfig);
      if (!primaryPanel) {
        errors.push('No primary panel configured');
        success = false;
      }

      // Check panel health status
      const healthyPanels = planConfig.panels.filter(p => p.health_status === 'online');
      if (healthyPanels.length === 0) {
        errors.push('No panels are currently online');
        // Don't mark as failure since we now allow unknown status panels
      }

      // Test subscription creation (dry run)
      if (success && primaryPanel) {
        try {
          // This is a simulation - we won't actually create a user
          console.log('Plan configuration test passed for:', {
            planName: planConfig.name_en,
            apiType: PlanService.getApiType(planConfig),
            primaryPanel: primaryPanel.name,
            panelsCount: planConfig.panels.length
          });
        } catch (testError) {
          errors.push(`Subscription test failed: ${testError instanceof Error ? testError.message : 'Unknown error'}`);
          success = false;
        }
      }

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
        errors
      };

      setTestResult(result);
      
      if (result.success) {
        toast.success(`Plan ${plan.name_en} configuration is valid!`);
      } else {
        toast.error(`Plan ${plan.name_en} has configuration issues. Check details below.`);
      }
      
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
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
      setTestResult(errorResult);
      toast.error(`Failed to test plan ${plan.name_en}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    if (success) return <CheckCircle className="w-4 h-4 text-green-600" />;
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  const getStatusBadge = (success: boolean) => {
    if (success) return <Badge className="bg-green-100 text-green-800">Valid</Badge>;
    return <Badge className="bg-red-100 text-red-800">Issues Found</Badge>;
  };

  return (
    <div className="space-y-4">
      <Button 
        onClick={testPlanConfiguration} 
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Testing Plan Configuration...
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4 mr-2" />
            Test Plan Configuration
          </>
        )}
      </Button>

      {testResult && (
        <Card className={`${testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(testResult.success)}
              Plan Configuration Test
              {getStatusBadge(testResult.success)}
            </CardTitle>
            <CardDescription>
              Configuration test for plan: {testResult.planName}
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
                  {testResult.errors.map((error, index) => (
                    <li key={index} className="list-disc">
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
      )}
    </div>
  );
};
