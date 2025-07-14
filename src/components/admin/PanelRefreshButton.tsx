import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Panel {
  id: string;
  name: string;
  panel_url: string;
  username: string;
  password: string;
  type: 'marzban' | 'marzneshin';
}

interface RefreshLog {
  id: string;
  refresh_result: boolean;
  configs_fetched: number | null;
  error_message: string | null;
  created_at: string;
}

interface PanelRefreshButtonProps {
  panel: Panel;
  onRefreshComplete: () => void;
}

export const PanelRefreshButton = ({ panel, onRefreshComplete }: PanelRefreshButtonProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [refreshLogs, setRefreshLogs] = useState<RefreshLog[]>([]);

  const fetchRefreshLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('panel_refresh_logs')
        .select('*')
        .eq('panel_id', panel.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching refresh logs:', error);
        return;
      }

      setRefreshLogs(data || []);
    } catch (error) {
      console.error('Failed to fetch refresh logs:', error);
    }
  };

  const refreshPanelConfig = async () => {
    setIsRefreshing(true);
    
    try {
      console.log(`🔄 Starting panel refresh for: ${panel.name} (${panel.type})`);
      
      // Use edge function to refresh panel config (avoids CORS issues)
      const { data, error } = await supabase.functions.invoke('refresh-panel-config', {
        body: { panelId: panel.id }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(error.message || 'Failed to refresh panel configuration');
      }

      if (!data.success) {
        console.error('❌ Panel refresh failed:', data.error);
        throw new Error(data.error || 'Panel refresh failed');
      }

      console.log(`✅ Panel refresh completed successfully for ${panel.name}`);
      console.log('📋 Config data:', data.configData);
      
      toast.success(`Panel configuration refreshed successfully. Fetched ${data.configsFetched} config items.`);
      
      // Refresh the logs display
      await fetchRefreshLogs();
      
      // Call the completion callback if provided
      if (onRefreshComplete) {
        onRefreshComplete();
      }

    } catch (error) {
      console.error('❌ Panel refresh failed:', error);
      toast.error(`Failed to refresh panel config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleLogs = async () => {
    if (!showLogs) {
      await fetchRefreshLogs();
    }
    setShowLogs(!showLogs);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          onClick={refreshPanelConfig}
          disabled={isRefreshing}
          size="sm"
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Panel Settings'}
        </Button>
        
        <Button
          onClick={toggleLogs}
          size="sm"
          variant="ghost"
          className="flex items-center gap-2"
        >
          {showLogs ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showLogs ? 'Hide' : 'Show'} Logs
        </Button>
      </div>

      {showLogs && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Refresh History</CardTitle>
            <CardDescription>
              Recent panel refresh attempts for {panel.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {refreshLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No refresh history available</p>
            ) : (
              <div className="space-y-2">
                {refreshLogs.map((log) => (
                  <div key={log.id} className="flex justify-between items-center p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant={log.refresh_result ? "default" : "destructive"}>
                        {log.refresh_result ? 'Success' : 'Failed'}
                      </Badge>
                      <span className="text-sm">
                        {log.refresh_result ? `${log.configs_fetched} configs` : log.error_message}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};