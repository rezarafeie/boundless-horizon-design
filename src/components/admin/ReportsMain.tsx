
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw } from 'lucide-react';
import { GlobalSummary } from './reports/GlobalSummary';
import { ActivePanelsReport } from './reports/ActivePanelsReport';
import { DatabaseStatsReport } from './reports/DatabaseStatsReport';
import { TelegramBotReport } from './reports/TelegramBotReport';
import { UserSearchReport } from './reports/UserSearchReport';
import { DateRangeSelector, DateRange } from './DateRangeSelector';

export const ReportsMain = () => {
  const [searchQuery, setSearchQuery] = useState('');
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

  const handleSearch = () => {
    // Search is handled automatically by UserSearchReport component
    console.log('Searching for:', searchQuery);
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

      {/* Global Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Universal User Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Search by username, chat_id, mobile, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} className="w-full sm:w-auto">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Searches across database, all panels, and Telegram bot
          </p>
        </CardContent>
      </Card>

      {/* Global Summary */}
      <GlobalSummary refreshTrigger={refreshTrigger} dateRange={dateRange} />

      {/* Main Tabs - Improved Mobile Layout */}
      <Tabs defaultValue="panels" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 min-w-full gap-1">
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
            <TabsTrigger value="search" className="text-xs sm:text-sm px-2 sm:px-4">
              <span className="hidden sm:inline">Search Results</span>
              <span className="sm:hidden">Search</span>
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

        <TabsContent value="search" className="space-y-4">
          <UserSearchReport searchQuery={searchQuery} dateRange={dateRange} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
