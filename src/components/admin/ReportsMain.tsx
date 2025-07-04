
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { GlobalSummary } from './reports/GlobalSummary';
import { ActivePanelsReport } from './reports/ActivePanelsReport';
import { DatabaseStatsReport } from './reports/DatabaseStatsReport';
import { TelegramBotReport } from './reports/TelegramBotReport';
import { DateRangeSelector, DateRange } from './DateRangeSelector';

export const ReportsMain = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Initialize with last 7 days
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: new Date(),
    preset: '7d'
  });

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Comprehensive system monitoring and analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeSelector 
            dateRange={dateRange} 
            onDateRangeChange={setDateRange} 
          />
          <Button onClick={handleRefresh} size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Global Summary */}
      <GlobalSummary refreshTrigger={refreshTrigger} dateRange={dateRange} />

      {/* Main Tabs */}
      <Tabs defaultValue="panels" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-3 min-w-full gap-1">
            <TabsTrigger value="panels" className="text-xs sm:text-sm px-2 sm:px-4">
              <span className="hidden sm:inline">Active Panels</span>
              <span className="sm:hidden">Panels</span>
            </TabsTrigger>
            <TabsTrigger value="database" className="text-xs sm:text-sm px-2 sm:px-4">
              <span className="hidden sm:inline">Database Stats</span>
              <span className="sm:hidden">Database</span>
            </TabsTrigger>
            <TabsTrigger value="telegram" className="text-xs sm:text-sm px-2 sm:px-4">
              <span className="hidden sm:inline">Telegram Bot</span>
              <span className="sm:hidden">Telegram</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="panels" className="space-y-4">
          <ActivePanelsReport refreshTrigger={refreshTrigger} dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <DatabaseStatsReport refreshTrigger={refreshTrigger} dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="telegram" className="space-y-4">
          <TelegramBotReport refreshTrigger={refreshTrigger} dateRange={dateRange} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
