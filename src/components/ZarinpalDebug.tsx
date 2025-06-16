
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Settings, CreditCard, Clock } from 'lucide-react';

interface ZarinpalDebugProps {
  onClose: () => void;
}

const ZarinpalDebug = ({ onClose }: ZarinpalDebugProps) => {
  const { language } = useLanguage();

  const debugInfo = {
    merchantId: '79f8bbce-cc51-4816-8452-f722b23efdf9',
    status: 'Active',
    lastUpdate: new Date().toLocaleString(),
    environment: 'Production',
    recentTransactions: [
      { id: 'TX001', amount: 320000, status: 'Success', date: '2025-06-16 21:30:00' },
      { id: 'TX002', amount: 160000, status: 'Pending', date: '2025-06-16 21:25:00' },
      { id: 'TX003', amount: 80000, status: 'Failed', date: '2025-06-16 21:20:00' }
    ]
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {language === 'fa' ? 'تنظیمات دیباگ زرین‌پال' : 'Zarinpal Debug Settings'}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  {language === 'fa' ? 'تنظیمات' : 'Configuration'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {language === 'fa' ? 'شناسه تاجر' : 'Merchant ID'}:
                  </span>
                  <p className="font-mono text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1">
                    {debugInfo.merchantId}
                  </p>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {language === 'fa' ? 'وضعیت' : 'Status'}:
                  </span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {debugInfo.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {language === 'fa' ? 'محیط' : 'Environment'}:
                  </span>
                  <span className="text-sm">{debugInfo.environment}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {language === 'fa' ? 'تراکنش‌های اخیر' : 'Recent Transactions'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {debugInfo.recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <div>
                        <p className="font-mono text-xs">{tx.id}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{tx.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{tx.amount.toLocaleString()} تومان</p>
                        <Badge 
                          variant={tx.status === 'Success' ? 'default' : tx.status === 'Pending' ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Edge Function Logs */}
          <Card>
            <CardHeader>
              <CardTitle>
                {language === 'fa' ? 'لاگ‌های تابع' : 'Edge Function Logs'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded font-mono text-xs overflow-x-auto">
                <div className="space-y-1">
                  <div>[2025-06-16 21:31:58] Merchant authentication successful</div>
                  <div>[2025-06-16 21:31:58] Contract request received</div>
                  <div>[2025-06-16 21:31:58] Payment verification completed</div>
                  <div>[2025-06-16 21:31:58] User subscription created successfully</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default ZarinpalDebug;
