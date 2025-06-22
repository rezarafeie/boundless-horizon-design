
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle, Clock, Server, Zap } from 'lucide-react';
import { format } from 'date-fns';

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

  const { data: logs, isLoading, error } = useQuery({
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

  if (isLoading) {
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
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Zap className="w-4 h-4" />
        No creation logs found
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
          {logs.some(log => !log.success) && (
            <AlertCircle className="w-4 h-4 ml-1 text-red-500" />
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
