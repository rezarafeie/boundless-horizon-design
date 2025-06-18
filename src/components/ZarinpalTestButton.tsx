
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

const ZarinpalTestButton = () => {
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();

  const testZarinpalConnection = async () => {
    setTesting(true);
    
    try {
      console.log('Testing Zarinpal connection...');
      
      const { data, error } = await supabase.functions.invoke('zarinpal-test');
      
      if (error) {
        console.error('Test function error:', error);
        toast({
          title: language === 'fa' ? 'خطا در تست' : 'Test Failed',
          description: language === 'fa' ? 
            'خطا در اجرای تست اتصال' : 
            'Failed to run connection test',
          variant: 'destructive'
        });
        return;
      }

      if (data?.success) {
        toast({
          title: language === 'fa' ? 'تست موفق' : 'Test Successful',
          description: language === 'fa' ? 
            `اتصال به زرین‌پال موفق - زمان پاسخ: ${data.details?.responseTime}ms` : 
            `Zarinpal connection successful - Response time: ${data.details?.responseTime}ms`,
        });
        console.log('✅ Zarinpal test successful:', data);
      } else {
        toast({
          title: language === 'fa' ? 'تست ناموفق' : 'Test Failed',
          description: data?.error || (language === 'fa' ? 'تست اتصال ناموفق' : 'Connection test failed'),
          variant: 'destructive'
        });
        console.log('❌ Zarinpal test failed:', data);
      }

    } catch (error) {
      console.error('Test error:', error);
      toast({
        title: language === 'fa' ? 'خطا در تست' : 'Test Error',
        description: language === 'fa' ? 
          'خطا در انجام تست اتصال' : 
          'Error performing connection test',
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Button
      onClick={testZarinpalConnection}
      disabled={testing}
      variant="outline"
      size="sm"
      className="text-xs"
    >
      {testing ? (
        language === 'fa' ? 'در حال تست...' : 'Testing...'
      ) : (
        language === 'fa' ? 'تست اتصال زرین‌پال' : 'Test Zarinpal'
      )}
    </Button>
  );
};

export default ZarinpalTestButton;
