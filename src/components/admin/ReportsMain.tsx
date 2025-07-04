
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

export const ReportsMain = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSearch = () => {
    // Trigger search across all systems
    console.log('Searching for:', searchQuery);
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Reports Dashboard</h1>
        <Button onClick={handleRefresh} size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh All
        </Button>
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
              placeholder="Search by username, chat_id, or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Global Summary */}
      <GlobalSummary refreshTrigger={refreshTrigger} />

      {/* Main Tabs */}
      <Tabs defaultValue="panels" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="panels">Active Panels</TabsTrigger>
          <TabsTrigger value="database">Database Stats</TabsTrigger>
          <TabsTrigger value="telegram">Telegram Bot</TabsTrigger>
          <TabsTrigger value="search">Search Results</TabsTrigger>
        </TabsList>

        <TabsContent value="panels" className="space-y-4">
          <ActivePanelsReport refreshTrigger={refreshTrigger} />
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <DatabaseStatsReport refreshTrigger={refreshTrigger} />
        </TabsContent>

        <TabsContent value="telegram" className="space-y-4">
          <TelegramBotReport refreshTrigger={refreshTrigger} />
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <UserSearchReport searchQuery={searchQuery} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
