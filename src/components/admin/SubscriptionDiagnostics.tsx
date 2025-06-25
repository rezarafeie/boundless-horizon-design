import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Zap, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionDiagnosticsProps {
  subscriptionId: string;
}

export const SubscriptionDiagnostics = ({ subscriptionId }: SubscriptionDiagnosticsProps) => {
  const [isFixing, setIsFixing] = useState(false);
  const { toast } = useToast();

  const { data: diagnostics, isLoading, refetch } = useQuery({
    queryKey: ['subscription-diagnostics', subscriptionId],
    queryFn: async () => {
      console.log('🔍 DIAGNOSTICS: Starting comprehensive subscription analysis for:', subscriptionId);
      
      // Get subscription details
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (subError || !subscription) {
        throw new Error(`Failed to fetch subscription: ${subError?.message}`);
      }

      console.log('🔍 DIAGNOSTICS: Subscription data:', subscription);

      // Check if plan exists and has proper configuration
      let planInfo = null;
      let planError = null;
      
      if (subscription.plan_id) {
        const { data: plan, error: pError } = await supabase
          .from('subscription_plans')
          .select(`
            *,
            panel_servers!assigned_panel_id(
              id,
              name,
              type,
              panel_url,
              is_active,
              health_status,
              enabled_protocols,
              default_inbounds
            )
          `)
          .eq('id', subscription.plan_id)
          .single();

        if (pError) {
          planError = `Plan not found: ${pError.message}`;
          console.error('❌ DIAGNOSTICS: Plan lookup failed:', pError);
        } else {
          planInfo = plan;
          console.log('🔍 DIAGNOSTICS: Plan info:', plan);
        }
      }

      // Get all available panels as fallback options
      const { data: availablePanels } = await supabase
        .from('panel_servers')
        .select('*')
        .eq('is_active', true)
        .order('health_status', { ascending: false }); // Prioritize online panels

      // Check for existing user creation logs
      const { data: creationLogs } = await supabase
        .from('user_creation_logs')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .order('created_at', { ascending: false });

      const diagnosticResult = {
        subscription,
        planInfo,
        planError,
        availablePanels: availablePanels || [],
        creationLogs: creationLogs || [],
        issues: [] as string[],
        recommendations: [] as string[]
      };

      // Analyze issues
      if (!subscription.plan_id) {
        diagnosticResult.issues.push('No plan_id assigned to subscription');
        diagnosticResult.recommendations.push('Assign a valid plan_id to the subscription');
      } else if (planError) {
        diagnosticResult.issues.push(planError);
        diagnosticResult.recommendations.push('Update plan_id to reference an existing plan');
      } else if (!planInfo?.panel_servers) {
        diagnosticResult.issues.push('Plan exists but has no assigned panel');
        diagnosticResult.recommendations.push('Assign an active panel to the plan');
      } else if (!planInfo.panel_servers.is_active) {
        diagnosticResult.issues.push('Assigned panel is inactive');
        diagnosticResult.recommendations.push('Activate the assigned panel or reassign to an active panel');
      } else if (planInfo.panel_servers.health_status === 'offline') {
        diagnosticResult.issues.push('Assigned panel is offline');
        diagnosticResult.recommendations.push('Check panel connectivity or use a different panel');
      }

      if (!subscription.marzban_user_created && subscription.status === 'active') {
        diagnosticResult.issues.push('Subscription is active but VPN user not created');
        diagnosticResult.recommendations.push('Retry VPN user creation');
      }

      console.log('🔍 DIAGNOSTICS: Analysis complete:', diagnosticResult);
      return diagnosticResult;
    },
    enabled: !!subscriptionId,
  });

  const fixSubscription = async () => {
    if (!diagnostics) return;
    
    setIsFixing(true);
    
    try {
      console.log('🔧 DIAGNOSTICS: Starting subscription fix process');
      
      // Step 1: Fix plan assignment if needed
      let targetPlanId = diagnostics.subscription.plan_id;
      
      if (!targetPlanId || diagnostics.planError) {
        // Find a suitable plan based on subscription characteristics
        const dataLimit = diagnostics.subscription.data_limit_gb;
        const planType = dataLimit <= 15 ? 'lite' : 'plus';
        
        const { data: suitablePlans } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('plan_id', planType)
          .eq('is_active', true)
          .limit(1);
        
        if (suitablePlans && suitablePlans.length > 0) {
          targetPlanId = suitablePlans[0].id;
          
          await supabase
            .from('subscriptions')
            .update({ plan_id: targetPlanId })
            .eq('id', subscriptionId);
          
          console.log('🔧 DIAGNOSTICS: Updated plan_id to:', targetPlanId);
        }
      }
      
      // Step 2: Get the correct panel for VPN creation
      const { data: targetPlan } = await supabase
        .from('subscription_plans')
        .select(`
          *,
          panel_servers!assigned_panel_id(
            id,
            name,
            type,
            panel_url,
            username,
            password,
            is_active,
            health_status
          )
        `)
        .eq('id', targetPlanId)
        .single();

      let panelToUse = targetPlan?.panel_servers;
      
      // If assigned panel is not available, use fallback
      if (!panelToUse?.is_active || panelToUse?.health_status === 'offline') {
        const fallbackPanel = diagnostics.availablePanels.find(p => 
          p.is_active && p.health_status === 'online'
        );
        
        if (fallbackPanel) {
          panelToUse = fallbackPanel;
          console.log('🔧 DIAGNOSTICS: Using fallback panel:', fallbackPanel.name);
        }
      }
      
      if (!panelToUse) {
        throw new Error('No suitable panel available for VPN creation');
      }
      
      // Step 3: Create VPN user using the marzban-create-user function with proper panel ID
      const requestData = {
        username: diagnostics.subscription.username,
        dataLimitGB: diagnostics.subscription.data_limit_gb,
        durationDays: diagnostics.subscription.duration_days,
        notes: `Fixed subscription - Original plan: ${diagnostics.subscription.plan_id}`,
        panelId: panelToUse.id, // Use the actual panel ID, not plan ID
        subscriptionId: diagnostics.subscription.id
      };
      
      console.log('🔧 DIAGNOSTICS: Creating VPN user with data:', requestData);
      
      const { data: result, error } = await supabase.functions.invoke('marzban-create-user', {
        body: requestData
      });
      
      if (error) throw error;
      
      if (result?.success) {
        // Update subscription with VPN details
        const updateData: any = {
          marzban_user_created: true,
          updated_at: new Date().toISOString()
        };
        
        if (result.data?.subscription_url) {
          updateData.subscription_url = result.data.subscription_url;
        }
        
        if (!diagnostics.subscription.expire_at && diagnostics.subscription.duration_days) {
          updateData.expire_at = new Date(Date.now() + (diagnostics.subscription.duration_days * 24 * 60 * 60 * 1000)).toISOString();
        }
        
        // Update notes
        const existingNotes = diagnostics.subscription.notes || '';
        updateData.notes = `${existingNotes} - Fixed and VPN created ${new Date().toLocaleDateString()}`;
        
        await supabase
          .from('subscriptions')
          .update(updateData)
          .eq('id', subscriptionId);
        
        toast({
          title: 'Subscription Fixed',
          description: 'VPN user has been created successfully!',
        });
        
        await refetch();
      } else {
        throw new Error(result?.error || 'VPN creation failed');
      }
      
    } catch (error) {
      console.error('❌ DIAGNOSTICS: Fix failed:', error);
      toast({
        title: 'Fix Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsFixing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Running diagnostics...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!diagnostics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-red-600">Failed to run diagnostics</div>
        </CardContent>
      </Card>
    );
  }

  const hasIssues = diagnostics.issues.length > 0;
  const canFix = hasIssues && diagnostics.availablePanels.length > 0;

  return (
    <Card className={hasIssues ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {hasIssues ? (
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-600" />
          )}
          Subscription Diagnostics
        </CardTitle>
        <CardDescription>
          Comprehensive analysis of subscription configuration and VPN status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plan Information */}
        <div className="space-y-2">
          <h4 className="font-medium">Plan Configuration</h4>
          {diagnostics.planInfo ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Plan:</span> {diagnostics.planInfo.name_en}
              </div>
              <div>
                <span className="font-medium">Plan ID:</span> {diagnostics.planInfo.plan_id}
              </div>
              {diagnostics.planInfo.panel_servers && (
                <>
                  <div>
                    <span className="font-medium">Assigned Panel:</span> {diagnostics.planInfo.panel_servers.name}
                  </div>
                  <div>
                    <span className="font-medium">Panel Status:</span>
                    <Badge variant={diagnostics.planInfo.panel_servers.health_status === 'online' ? 'default' : 'destructive'} className="ml-1">
                      {diagnostics.planInfo.panel_servers.health_status}
                    </Badge>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-red-600 text-sm">
              {diagnostics.planError || 'No plan configured'}
            </div>
          )}
        </div>

        {/* Issues */}
        {diagnostics.issues.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-orange-800">Issues Found</h4>
            <ul className="space-y-1">
              {diagnostics.issues.map((issue, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-orange-700">
                  <XCircle className="w-4 h-4" />
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {diagnostics.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-blue-800">Recommendations</h4>
            <ul className="space-y-1">
              {diagnostics.recommendations.map((rec, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-blue-700">
                  <ArrowRight className="w-4 h-4" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Available Panels */}
        {diagnostics.availablePanels.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Available Panels ({diagnostics.availablePanels.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {diagnostics.availablePanels.slice(0, 4).map((panel) => (
                <div key={panel.id} className="flex items-center gap-2 text-sm p-2 bg-white rounded border">
                  <Badge variant={panel.health_status === 'online' ? 'default' : 'secondary'}>
                    {panel.health_status}
                  </Badge>
                  <span>{panel.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fix Button */}
        {canFix && (
          <div className="pt-4 border-t">
            <Button 
              onClick={fixSubscription} 
              disabled={isFixing}
              className="w-full"
            >
              {isFixing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Fixing Subscription...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Fix Subscription & Create VPN
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
