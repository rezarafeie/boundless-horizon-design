
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronUp, Clock, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TestLog {
  id: string;
  test_result: boolean;
  response_time_ms: number | null;
  error_message: string | null;
  test_details: any;
  created_at: string;
}

interface PanelTestHistoryProps {
  panelId: string;
  panelName: string;
  onRefresh?: () => void;
}

export const PanelTestHistory = ({ panelId, panelName, onRefresh }: PanelTestHistoryProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [testLogs, setTestLogs] = useState<TestLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTestLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('panel_test_logs')
        .select('*')
        .eq('panel_id', panelId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching test logs:', error);
        return;
      }

      setTestLogs(data || []);
    } catch (error) {
      console.error('Failed to fetch test logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTestLogs();
    }
  }, [isOpen, panelId]);

  const clearLogs = async () => {
    try {
      const { error } = await supabase
        .from('panel_test_logs')
        .delete()
        .eq('panel_id', panelId);

      if (error) {
        console.error('Error clearing logs:', error);
        return;
      }

      setTestLogs([]);
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    );
  };

  const formatResponseTime = (ms: number | null) => {
    if (ms === null) return 'N/A';
    return `${ms}ms`;
  };

  const getLastTestStatus = () => {
    if (testLogs.length === 0) return null;
    return testLogs[0].test_result ? 'success' : 'failed';
  };

  const lastTestStatus = getLastTestStatus();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Test History ({testLogs.length})</span>
            {lastTestStatus && (
              <Badge 
                variant={lastTestStatus === 'success' ? 'default' : 'destructive'}
                className="text-xs"
              >
                {lastTestStatus === 'success' ? '✅' : '❌'}
              </Badge>
            )}
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                Test History for {panelName}
              </CardTitle>
              {testLogs.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearLogs}
                  className="text-xs"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4 text-sm text-gray-500">
                Loading test history...
              </div>
            ) : testLogs.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500">
                No test history available
              </div>
            ) : (
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {testLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded-lg border text-sm ${
                        log.test_result 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.test_result)}
                          <span className="font-medium">
                            {log.test_result ? 'Success' : 'Failed'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-medium">Response Time:</span>
                          <span className="ml-1">{formatResponseTime(log.response_time_ms)}</span>
                        </div>
                        {log.error_message && (
                          <div className="col-span-2">
                            <span className="font-medium text-red-700">Error:</span>
                            <span className="ml-1 text-red-600">{log.error_message}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};
