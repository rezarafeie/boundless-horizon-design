
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle, XCircle, Loader, ChevronDown, TestTube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

const MarzbanConnectionTest = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const runConnectionTest = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      console.log('Starting Marzban connection test...');
      
      const { data, error } = await supabase.functions.invoke('test-marzban-connection');
      
      if (error) {
        console.error('Test function error:', error);
        throw new Error(error.message || 'Failed to run connection test');
      }
      
      console.log('Test result:', data);
      setTestResult(data);
      
      if (data.success) {
        toast({
          title: language === 'fa' ? 'موفق' : 'Success',
          description: language === 'fa' ? 
            'اتصال به پنل مرزبان با موفقیت برقرار شد' : 
            'Marzban panel connection successful'
        });
      } else {
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: language === 'fa' ? 
            'خطا در اتصال به پنل مرزبان' : 
            'Marzban panel connection failed',
          variant: 'destructive'
        });
      }
      
    } catch (error) {
      console.error('Connection test error:', error);
      
      const errorResult: TestResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
        details: {
          errorType: 'ClientError',
          timestamp: new Date().toISOString()
        }
      };
      
      setTestResult(errorResult);
      
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'خطا در اجرای تست اتصال' : 
          'Failed to run connection test',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          {language === 'fa' ? 'تست اتصال مرزبان' : 'Marzban Connection Test'}
        </CardTitle>
        <CardDescription>
          {language === 'fa' ? 
            'بررسی اتصال و تنظیمات پنل مرزبان' : 
            'Test Marzban panel connection and configuration'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runConnectionTest} 
          disabled={isLoading}
          className="w-full"
          variant="outline"
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              {language === 'fa' ? 'در حال تست...' : 'Testing...'}
            </>
          ) : (
            <>
              <TestTube className="w-4 h-4 mr-2" />
              {language === 'fa' ? 'شروع تست اتصال' : 'Run Connection Test'}
            </>
          )}
        </Button>

        {testResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {testResult.success ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500" />
              )}
              <div className="flex-1">
                <Badge variant={testResult.success ? 'default' : 'destructive'}>
                  {testResult.success ? 
                    (language === 'fa' ? 'موفق' : 'Success') : 
                    (language === 'fa' ? 'ناموفق' : 'Failed')
                  }
                </Badge>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {testResult.message}
            </p>

            {testResult.details && (
              <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    {language === 'fa' ? 'جزئیات تکمیلی' : 'View Details'}
                    <ChevronDown className={`w-4 h-4 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-3 p-3 bg-muted rounded-lg">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(testResult.details, null, 2)}
                    </pre>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MarzbanConnectionTest;
