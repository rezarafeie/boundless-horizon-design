
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, CreditCard, Clock } from 'lucide-react';

const ZarinpalDebug = () => {
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
    <Card className="w-full mb-6 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
          <Settings className="w-5 h-5" />
          {language === 'fa' ? 'تنظیمات دیباگ زرین‌پال' : 'Zarinpal Debug Settings'}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
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
                  {debugInfo.merchantId}
                </p>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  {language === 'fa' ? 'وضعیت' : 'Status'}:
                </span>
                <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                  {debugInfo.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 dark:bg-gray-800/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {language === 'fa' ? 'تراکنش‌های اخیر' : 'Recent Transactions'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {debugInfo.recentTransactions.slice(0, 2).map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center p-1 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                    <div>
                      <p className="font-mono">{tx.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{tx.amount.toLocaleString()}</p>
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
        <Card className="bg-white/50 dark:bg-gray-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {language === 'fa' ? 'لاگ‌های تابع' : 'Edge Function Logs'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-2 rounded font-mono text-xs overflow-x-auto">
              <div className="space-y-1">
                <div>[2025-06-16 21:31:58] Merchant authentication successful</div>
                <div>[2025-06-16 21:31:58] Payment verification completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export default ZarinpalDebug;
