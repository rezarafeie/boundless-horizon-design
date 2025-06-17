
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Bug, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface DebugLog {
  id: string;
  timestamp: Date;
  method: 'stripe' | 'nowpayments' | 'manual' | 'zarinpal';
  type: 'info' | 'error' | 'success' | 'warning';
  message: string;
  data?: any;
}

interface PaymentDebugPanelProps {
  isVisible: boolean;
  onToggleVisibility: () => void;
}

const PaymentDebugPanel = ({ isVisible, onToggleVisibility }: PaymentDebugPanelProps) => {
  const { language } = useLanguage();
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Function to add debug logs
  const addLog = (method: DebugLog['method'], type: DebugLog['type'], message: string, data?: any) => {
    const newLog: DebugLog = {
      id: Date.now().toString(),
      timestamp: new Date(),
      method,
      type,
      message,
      data
    };
    setLogs(prev => [newLog, ...prev.slice(0, 49)]); // Keep last 50 logs
  };

  // Expose addLog globally for other components to use
  useEffect(() => {
    (window as any).debugPayment = addLog;
    return () => {
      delete (window as any).debugPayment;
    };
  }, []);

  const getIcon = (type: DebugLog['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'info': return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  const getBadgeVariant = (method: DebugLog['method']) => {
    switch (method) {
      case 'stripe': return 'default';
      case 'nowpayments': return 'secondary';
      case 'manual': return 'outline';
      case 'zarinpal': return 'destructive';
    }
  };

  const clearLogs = () => setLogs([]);

  if (!isVisible) {
    return (
      <Button
        onClick={onToggleVisibility}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50"
      >
        <Bug className="w-4 h-4 mr-2" />
        {language === 'fa' ? 'دیباگ پرداخت' : 'Payment Debug'}
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96">
      <Card className="border-2 border-primary">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Bug className="w-4 h-4" />
                  {language === 'fa' ? 'دیباگ پرداخت' : 'Payment Debug'}
                  <Badge variant="outline">{logs.length}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={onToggleVisibility}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    ×
                  </Button>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="max-h-80 overflow-y-auto space-y-2 p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground">
                  {language === 'fa' ? 'آخرین لاگ‌ها' : 'Recent Logs'}
                </span>
                <Button onClick={clearLogs} variant="ghost" size="sm" className="h-6 text-xs">
                  {language === 'fa' ? 'پاک کردن' : 'Clear'}
                </Button>
              </div>
              
              {logs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {language === 'fa' ? 'هنوز لاگی ثبت نشده' : 'No logs yet'}
                </p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="text-xs border rounded p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {getIcon(log.type)}
                        <Badge variant={getBadgeVariant(log.method)} className="text-xs px-1 py-0">
                          {log.method}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-foreground">{log.message}</p>
                    {log.data && (
                      <details className="text-muted-foreground">
                        <summary className="cursor-pointer">Data</summary>
                        <pre className="mt-1 text-xs overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};

export default PaymentDebugPanel;
