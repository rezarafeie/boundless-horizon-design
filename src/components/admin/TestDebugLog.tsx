
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Info, AlertCircle, Clock } from 'lucide-react';

interface DetailedLog {
  step: string;
  status: 'success' | 'error' | 'info';
  message: string;
  details?: any;
  timestamp: string;
}

interface TestDebugLogProps {
  logs: DetailedLog[];
  title: string;
  isVisible: boolean;
}

export const TestDebugLog = ({ logs, title, isVisible }: TestDebugLogProps) => {
  if (!isVisible || !logs || logs.length === 0) {
    return null;
  }

  const getLogIcon = (status: 'success' | 'error' | 'info') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getLogBadge = (status: 'success' | 'error' | 'info') => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 text-xs">SUCCESS</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 text-xs">ERROR</Badge>;
      case 'info':
        return <Badge className="bg-blue-100 text-blue-800 text-xs">INFO</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const formatDetails = (details: any) => {
    if (!details) return null;
    if (typeof details === 'string') return details;
    return JSON.stringify(details, null, 2);
  };

  return (
    <Card className="mt-4 border-2 border-dashed border-gray-300 bg-gray-50 dark:bg-gray-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertCircle className="w-5 h-5 text-orange-500" />
          {title}
          <Badge variant="outline" className="text-xs">
            {logs.length} entries
          </Badge>
        </CardTitle>
        <CardDescription>
          Detailed execution logs and debugging information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80 w-full rounded-md border p-4 bg-white dark:bg-gray-800">
          <div className="space-y-3">
            {logs.map((log, index) => (
              <div key={index}>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="flex-shrink-0 mt-0.5">
                    {getLogIcon(log.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{log.step}</span>
                        {getLogBadge(log.status)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </div>
                    
                    <p className={`text-sm mb-2 ${
                      log.status === 'error' 
                        ? 'text-red-700 dark:text-red-300' 
                        : log.status === 'success' 
                          ? 'text-green-700 dark:text-green-300' 
                          : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {log.message}
                    </p>
                    
                    {log.details && (
                      <div className="mt-2">
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Debug Details:
                        </div>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded border overflow-x-auto whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                          {formatDetails(log.details)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
                {index < logs.length - 1 && <Separator className="my-2" />}
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
            <Info className="w-4 h-4" />
            <span className="font-medium">Debug Information:</span>
          </div>
          <ul className="text-xs text-blue-700 dark:text-blue-300 mt-1 ml-6 space-y-1">
            <li>• Check HTTP status codes and response bodies for API errors</li>
            <li>• Verify panel URLs are accessible and endpoints are correct</li>
            <li>• Ensure credentials are valid and have proper permissions</li>
            <li>• Look for protocol compatibility issues (VMess, VLESS, etc.)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
