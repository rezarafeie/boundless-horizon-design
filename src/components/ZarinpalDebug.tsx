
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, CreditCard, Clock, RefreshCw, AlertTriangle } from 'lucide-react';

interface EdgeFunctionLog {
  timestamp: number;
  level: string;
  event_message: string;
  event_type: string;
  function_id: string;
}

interface ParsedTransaction {
  id: string;
  type: 'contract' | 'verify' | 'checkout';
  status: 'success' | 'error' | 'pending';
  timestamp: string;
  message: string;
  details?: any;
}

const ZarinpalDebug = () => {
  const { language } = useLanguage();
  const [logs, setLogs] = useState<EdgeFunctionLog[]>([]);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [error, setError] = useState<string>('');

  const merchantId = '79f8bbce-cc51-4816-8452-f722b23efdf9';

  const parseLogs = (rawLogs: EdgeFunctionLog[]): ParsedTransaction[] => {
    const parsed: ParsedTransaction[] = [];
    
    rawLogs.forEach((log, index) => {
      if (log.event_message.includes('Zarinpal')) {
        let status: 'success' | 'error' | 'pending' = 'pending';
        let type: 'contract' | 'verify' | 'checkout' = 'contract';
        
        if (log.event_message.includes('error') || log.event_message.includes('Merchant have not access')) {
          status = 'error';
        } else if (log.event_message.includes('response')) {
          status = 'success';
        }
        
        if (log.event_message.includes('verify')) {
          type = 'verify';
        } else if (log.event_message.includes('checkout')) {
          type = 'checkout';
        }
        
        parsed.push({
          id: `ZP${index.toString().padStart(3, '0')}`,
          type,
          status,
          timestamp: new Date(log.timestamp / 1000).toLocaleString(),
          message: log.event_message,
          details: log
        });
      }
    });
    
    return parsed.slice(0, 5); // Show last 5 transactions
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // In a real implementation, you would fetch from Supabase edge function logs
      // For now, we'll simulate with the logs we can see from the edge-function-logs
      const mockLogs: EdgeFunctionLog[] = [
        {
          timestamp: Date.now() * 1000,
          level: 'log',
          event_message: 'Zarinpal raw response: {"data":{},"errors":{"message":"Merchant have not access.","code":-80,"validations":[]}}',
          event_type: 'Log',
          function_id: 'da4f5ad1-b517-4567-8dfe-85a645caee0d'
        },
        {
          timestamp: (Date.now() - 30000) * 1000,
          level: 'log', 
          event_message: 'Contract request received: {"merchant_id":"79f8bbce-cc51-4816-8452-f722b23efdf9","mobile":"09120784457"}',
          event_type: 'Log',
          function_id: 'da4f5ad1-b517-4567-8dfe-85a645caee0d'
        }
      ];
      
      setLogs(mockLogs);
      setTransactions(parseLogs(mockLogs));
      setLastUpdate(new Date().toLocaleString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 text-xs">Success</Badge>;
      case 'error':
        return <Badge variant="destructive" className="text-xs">Error</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Pending</Badge>;
    }
  };

  const getMerchantStatus = () => {
    const hasErrors = transactions.some(t => t.status === 'error' && t.message.includes('Merchant have not access'));
    return hasErrors ? 'Error' : 'Active';
  };

  return (
    <Card className="w-full mb-6 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
            <Settings className="w-5 h-5" />
            {language === 'fa' ? 'تنظیمات دیباگ زرین‌پال' : 'Zarinpal Debug Settings'}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchLogs}
            disabled={isLoading}
            className="text-orange-600 hover:text-orange-700"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {lastUpdate && (
          <p className="text-xs text-orange-600 dark:text-orange-300">
            {language === 'fa' ? 'آخرین بروزرسانی:' : 'Last updated:'} {lastUpdate}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
          </div>
        )}

        {/* Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white/50 dark:bg-gray-800/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                {language === 'fa' ? 'تنظیمات' : 'Configuration'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  {language === 'fa' ? 'شناسه تاجر' : 'Merchant ID'}:
                </span>
                <p className="font-mono bg-gray-100 dark:bg-gray-800 p-1 rounded mt-1 break-all">
                  {merchantId}
                </p>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  {language === 'fa' ? 'وضعیت' : 'Status'}:
                </span>
                <Badge 
                  variant={getMerchantStatus() === 'Active' ? 'default' : 'destructive'} 
                  className="text-xs"
                >
                  {getMerchantStatus()}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 dark:bg-gray-800/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {language === 'fa' ? 'تراکنش‌های اخیر' : 'Recent API Calls'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {transactions.length > 0 ? (
                  transactions.slice(0, 3).map((tx) => (
                    <div key={tx.id} className="flex justify-between items-center p-1 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                      <div>
                        <p className="font-mono">{tx.id}</p>
                        <p className="text-gray-500 capitalize">{tx.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{tx.timestamp.split(' ')[1]}</p>
                        {getStatusBadge(tx.status)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 text-center py-2">
                    {language === 'fa' ? 'هیچ تراکنشی یافت نشد' : 'No transactions found'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edge Function Logs */}
        <Card className="bg-white/50 dark:bg-gray-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {language === 'fa' ? 'لاگ‌های زنده API' : 'Live API Logs'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-2 rounded font-mono text-xs overflow-x-auto max-h-32 overflow-y-auto">
              {logs.length > 0 ? (
                <div className="space-y-1">
                  {logs.slice(0, 5).map((log, index) => (
                    <div key={index} className="break-all">
                      [{new Date(log.timestamp / 1000).toLocaleTimeString()}] {log.event_message.substring(0, 100)}
                      {log.event_message.length > 100 && '...'}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2">
                  {language === 'fa' ? 'در انتظار لاگ‌ها...' : 'Waiting for logs...'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export default ZarinpalDebug;
