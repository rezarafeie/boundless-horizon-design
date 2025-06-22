
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle, Clock, Server, Zap, RefreshCw, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface UserCreationLog {
  id: string;
  subscription_id: string;
  panel_id: string | null;
  edge_function_name: string;
  request_data: any;
  response_data: any;
  success: boolean;
  error_message: string | null;
  panel_url: string | null;
  panel_name: string | null;
  created_at: string;
}

interface UserCreationLogsProps {
  subscriptionId: string;
}

export const UserCreationLogs = ({ subscriptionId }: UserCreationLogsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();

  const { data: logs, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['user-creation-logs', subscriptionId],
    queryFn: async () => {
      console.log('Fetching user creation logs for subscription:', subscriptionId);
      
      const { data, error } = await supabase
        .from('user_creation_logs')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user creation logs:', error);
        throw error;
      }

      console.log('User creation logs:', data);
      return data as UserCreationLog[];
    },
    enabled: !!subscriptionId,
  });

  const handleRefreshLogs = async () => {
    console.log('Refreshing user creation logs...');
    await refetch();
  };

  const retryVpnCreation = async () => {
    setIsRetrying(true);
    
    try {
      console.log('Retrying VPN creation for subscription:',subscriptionId);
      
      // Get subscription details first
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (subError || !subscription) {
        throw new Error('Failed to fetch subscription details');
      }

      // Get plan information to determine the correct API and panel
      let panelInfo = null;
      let apiType = 'marzban'; // Default
      
      try {
        // Get plan details with panel mapping
        const { data: planData, error: planError } = await supabase
          .from('subscription_plans')
          .select(`
            *,
            plan_panel_mappings!inner(
              panel_id,
              is_primary,
              panel_servers!inner(
                id,
                name,
                type,
                panel_url,
                username,
                password,
                is_active,
                health_status
              )
            )
          `)
          .eq('plan_id', subscription.plan_id || 'lite')
          .eq('plan_panel_mappings.is_primary', true)
          .single();

        if (!planError && planData?.plan_panel_mappings?.[0]) {
          const mapping = planData.plan_panel_mappings[0];
          panelInfo = mapping.panel_servers;
          apiType = planData.api_type || 'marzban';
        } else {
          console.warn('No panel mapping found, using fallback');
          // Fallback to any active panel
          const { data: fallbackPanel } = await supabase
            .from('panel_servers')
            .select('*')
            .eq('type', 'marzban')
            .eq('is_active', true)
            .eq('health_status', 'online')
            .limit(1)
            .single();
          
          if (fallbackPanel) {
            panelInfo = fallbackPanel;
          }
        }
      } catch (error) {
        console.error('Error getting panel info:', error);
      }

      if (!panelInfo) {
        throw new Error('No active panel available for VPN creation');
      }

      // Prepare request data
      const requestData = {
        username: subscription.username,
        dataLimitGB: subscription.data_limit_gb,
        durationDays: subscription.duration_days,
        notes: `Retry VPN creation - ${subscription.notes || ''}`,
        panelId: panelInfo.id,
        subscriptionId: subscription.id
      };

      console.log(`Retrying VPN creation via ${apiType} API...`);

      let result;
      let functionName;
      
      if (apiType === 'marzban') {
        functionName = 'marzban-create-user';
        const { data, error } = await supabase.functions.invoke('marzban-create-user', {
          body: requestData
        });
        
        if (error) throw error;
        result = data;
      } else {
        functionName = 'marzneshin-create-user';
        const { data, error } = await supabase.functions.invoke('marzneshin-create-user', {
          body: requestData
        });
        
        if (error) throw error;
        result = data;
      }

      // Log the retry attempt
      await supabase.from('user_creation_logs').insert({
        subscription_id: subscriptionId,
        edge_function_name: `${functionName}-retry`,
        request_data: requestData,
        response_data: result || {},
        success: result?.success || false,
        error_message: result?.error || null,
        panel_id: panelInfo.id,
        panel_name: panelInfo.name,
        panel_url: panelInfo.panel_url
      });

      if (result?.success) {
        // Update subscription with VPN details
        const updateData: any = {
          marzban_user_created: true,
          updated_at: new Date().toISOString()
        };

        if (result.data?.subscription_url) {
          updateData.subscription_url = result.data.subscription_url;
        }

        if (!subscription.expire_at && subscription.duration_days) {
          updateData.expire_at = new Date(Date.now() + (subscription.duration_days * 24 * 60 * 60 * 1000)).toISOString();
        }

        // Update notes
        const existingNotes = subscription.notes || '';
        updateData.notes = `${existingNotes} - VPN created via retry on ${new Date().toLocaleDateString()}`;

        await supabase
          .from('subscriptions')
          .update(updateData)
          .eq('id', subscriptionId);

        toast({
          title: 'VPN Creation Successful',
          description: 'VPN user has been created successfully via retry',
        });
      } else {
        throw new Error(result?.error || 'VPN creation failed');
      }

      // Refresh logs to show the new attempt
      await refetch();
      
    } catch (error) {
      console.error('Error during VPN creation retry:', error);
      
      toast({
        title: 'Retry Failed',
        description: `VPN creation retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
      
      // Still refresh logs to show the failed attempt
      await refetch();
    } finally {
      setIsRetrying(false);
    }
  };

  if (isLoading && !isFetching) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        Loading creation logs...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <AlertCircle className="w-4 h-4" />
        Error loading creation logs
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefreshLogs}
          disabled={isFetching}
          className="ml-2"
        >
          {isFetching ? (
            <Clock className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
        </Button>
      </div>
    );
  }

  const hasFailedAttempts = logs && logs.some(log => !log.success);
  const hasSuccessfulAttempts = logs && logs.some(log => log.success);

  if (!logs || logs.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Zap className="w-4 h-4" />
        No creation logs found
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefreshLogs}
          disabled={isFetching}
          className="ml-2"
        >
          {isFetching ? (
            <Clock className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          Refresh
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={retryVpnCreation}
          disabled={isRetrying}
          className="ml-1 text-blue-600 hover:text-blue-800"
        >
          {isRetrying ? (
            <Clock className="w-3 h-3 animate-spin" />
          ) : (
            <RotateCcw className="w-3 h-3" />
          )}
          Try Create VPN
        </Button>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto p-2">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Zap className="w-4 h-4 ml-1" />
          <span className="ml-2">User Creation Logs ({logs.length})</span>
          {hasFailedAttempts && (
            <AlertCircle className="w-4 h-4 ml-1 text-red-500" />
          )}
          {hasSuccessfulAttempts && (
            <CheckCircle className="w-4 h-4 ml-1 text-green-500" />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleRefreshLogs();
            }}
            disabled={isFetching}
            className="ml-2"
          >
            {isFetching ? (
              <Clock className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
          </Button>
          {hasFailedAttempts && !hasSuccessfulAttempts && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                retryVpnCreation();
              }}
              disabled={isRetrying}
              className="ml-1 text-blue-600 hover:text-blue-800"
            >
              {isRetrying ? (
                <Clock className="w-3 h-3 animate-spin" />
              ) : (
                <RotateCcw className="w-3 h-3" />
              )}
              Retry
            </Button>
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-3 space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className={`${log.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {log.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    {log.edge_function_name}
                    <Badge variant={log.success ? "default" : "destructive"} className="text-xs">
                      {log.success ? 'Success' : 'Failed'}
                    </Badge>
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                  </span>
                </div>
                {log.panel_name && (
                  <CardDescription className="flex items-center gap-1 text-xs">
                    <Server className="w-3 h-3" />
                    {log.panel_name} ({log.panel_url})
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                {log.error_message && (
                  <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded-lg mb-3">
                    <p className="text-sm text-red-800 dark:text-red-200 font-medium">Error:</p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">{log.error_message}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Request Data:</p>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-auto max-h-32">
                      {JSON.stringify(log.request_data, null, 2)}
                    </pre>
                  </div>
                  
                  {log.response_data && (
                    <div>
                      <p className="font-medium text-muted-foreground mb-1">Response Data:</p>
                      <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-auto max-h-32">
                        {JSON.stringify(log.response_data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
