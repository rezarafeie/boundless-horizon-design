
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';

export interface DebugLog {
  id: string;
  timestamp: string;
  type: 'api' | 'error' | 'info' | 'success';
  title: string;
  details: any;
  duration?: number;
}

interface DebugLoggerProps {
  logs: DebugLog[];
  onClear: () => void;
}

export const DebugLogger = ({ logs, onClear }: DebugLoggerProps) => {
  const [expanded, setExpanded] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const toggleExpanded = (logId: string) => {
    setExpanded(prev => 
      prev.includes(logId) 
        ? prev.filter(id => id !== logId)
        : [...prev, logId]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'api': return 'blue';
      case 'error': return 'destructive';
      case 'success': return 'default';
      case 'info': return 'secondary';
      default: return 'secondary';
    }
  };

  if (!showDebug) {
    return (
      <div className="mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowDebug(true)}
        >
          Show Debug Logs ({logs.length})
        </Button>
      </div>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Debug Logs ({logs.length})</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClear}>
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowDebug(false)}
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="border rounded-lg p-3">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleExpanded(log.id)}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={getTypeColor(log.type) as any}>
                      {log.type}
                    </Badge>
                    <span className="text-sm font-medium">{log.title}</span>
                    {log.duration && (
                      <span className="text-xs text-muted-foreground">
                        ({log.duration}ms)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {log.timestamp}
                    </span>
                    {expanded.includes(log.id) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
                
                {expanded.includes(log.id) && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex justify-end mb-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(JSON.stringify(log.details, null, 2))}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
            
            {logs.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No debug logs yet
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
