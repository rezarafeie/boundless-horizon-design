import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Database, Sparkles, Trash2, Search } from 'lucide-react';
import { 
  getDatabaseTables, 
  getParameterSuggestions, 
  generateSampleData,
  type DatabaseTable,
  type ParameterSuggestion 
} from '@/utils/webhookDatabaseDetection';

interface WebhookParameterBuilderProps {
  webhookConfigId: string;
  payloadConfig: WebhookPayloadConfig[];
  onParameterAdded: () => void;
  onParameterToggled: (paramId: string, enabled: boolean) => void;
  onParameterDeleted: (paramId: string) => void;
}

interface WebhookPayloadConfig {
  id: string;
  parameter_name: string;
  parameter_type: string;
  parameter_source: string | null;
  custom_value: string | null;
  is_enabled: boolean;
}

export const WebhookParameterBuilder = ({ 
  webhookConfigId, 
  payloadConfig = [], 
  onParameterAdded, 
  onParameterToggled, 
  onParameterDeleted 
}: WebhookParameterBuilderProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('suggestions');
  
  // Database detection state
  const [databaseTables, setDatabaseTables] = useState<DatabaseTable[]>([]);
  const [suggestions, setSuggestions] = useState<ParameterSuggestion[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Parameter form state
  const [parameterName, setParameterName] = useState('');
  const [parameterType, setParameterType] = useState<'system' | 'custom'>('system');
  const [parameterSource, setParameterSource] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDatabaseInfo();
    }
  }, [isOpen]);

  const loadDatabaseInfo = async () => {
    try {
      const tables = await getDatabaseTables();
      setDatabaseTables(tables || []);
      
      const paramSuggestions = getParameterSuggestions();
      setSuggestions(paramSuggestions || []);
    } catch (error) {
      console.error('Error loading database info:', error);
      toast({
        title: 'Warning',
        description: 'Failed to load database information. Using defaults.',
        variant: 'destructive'
      });
      setDatabaseTables([]);
      setSuggestions([]);
    }
  };

  const handleSuggestionAdd = async (suggestion: ParameterSuggestion) => {
    await addParameter(
      suggestion.parameter_name,
      'system',
      suggestion.parameter_source,
      ''
    );
  };

  const handleTableColumnAdd = async () => {
    if (!selectedTable || !selectedColumn) {
      toast({
        title: 'Error',
        description: 'Please select both table and column',
        variant: 'destructive'
      });
      return;
    }

    const table = databaseTables.find(t => t.table_name === selectedTable);
    const column = table?.columns.find(c => c.column_name === selectedColumn);
    
    if (!column) {
      toast({
        title: 'Error',
        description: 'Selected column not found',
        variant: 'destructive'
      });
      return;
    }

    const paramName = `${selectedTable}.${selectedColumn}`;
    await addParameter(paramName, 'system', selectedColumn, '');
  };

  const handleCustomAdd = async () => {
    if (!parameterName.trim()) {
      toast({
        title: 'Error',
        description: 'Parameter name is required',
        variant: 'destructive'
      });
      return;
    }

    await addParameter(
      parameterName,
      parameterType,
      parameterSource.trim() || null,
      customValue.trim() || null
    );
  };

  const addParameter = async (
    name: string, 
    type: 'system' | 'custom', 
    source: string | null, 
    value: string | null
  ) => {
    if (payloadConfig.some(p => p.parameter_name === name)) {
      toast({
        title: 'Error',
        description: 'Parameter with this name already exists',
        variant: 'destructive'
      });
      return;
    }

    setAdding(true);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const serviceClient = createClient(
        'https://feamvyruipxtafzhptkh.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlYW12eXJ1aXB4dGFmemhwdGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwODE0MzIsImV4cCI6MjA2NTY1NzQzMn0.OcYM5_AGC6CGNgzM_TwrjpcB1PYBiHmUbeuYe9LQJQg'
      );

      const { error } = await serviceClient
        .from('webhook_payload_config')
        .insert({
          webhook_config_id: webhookConfigId,
          parameter_name: name,
          parameter_type: type,
          parameter_source: source,
          custom_value: value,
          is_enabled: true
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Parameter "${name}" added successfully`
      });

      // Reset form
      setParameterName('');
      setParameterSource('');
      setCustomValue('');
      setSelectedTable('');
      setSelectedColumn('');
      
      onParameterAdded();
      setIsOpen(false);
    } catch (error) {
      console.error('Error adding parameter:', error);
      toast({
        title: 'Error',
        description: `Failed to add parameter: ${error?.message || 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setAdding(false);
    }
  };

  const filteredSuggestions = (suggestions || []).filter(s => 
    s.parameter_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.table_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const existingParamNames = (payloadConfig || []).map(p => p.parameter_name);

  return (
    <div className="space-y-4">
      {/* Current Parameters */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="font-medium">Current Parameters ({payloadConfig.length})</h4>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Parameter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Webhook Parameter</DialogTitle>
                <DialogDescription>
                  Add parameters from database tables or create custom parameters
                </DialogDescription>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="suggestions" className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Smart Suggestions
                  </TabsTrigger>
                  <TabsTrigger value="database" className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Database Explorer
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Custom Parameter
                  </TabsTrigger>
                </TabsList>

                {/* Smart Suggestions Tab */}
                <TabsContent value="suggestions" className="space-y-4">
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search suggestions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    <div className="grid gap-3 max-h-96 overflow-y-auto">
                      {filteredSuggestions.map((suggestion, index) => {
                        const exists = existingParamNames.includes(suggestion.parameter_name);
                        return (
                          <Card key={index} className={`p-3 ${exists ? 'opacity-50' : 'hover:bg-muted/50'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">{suggestion.parameter_name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {suggestion.table_name}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {suggestion.data_type}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Sample: <code className="bg-muted px-1 rounded">
                                    {JSON.stringify(generateSampleData(suggestion.parameter_source, suggestion.data_type))}
                                  </code>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleSuggestionAdd(suggestion)}
                                disabled={exists || adding}
                                variant={exists ? "ghost" : "default"}
                              >
                                {exists ? 'Added' : 'Add'}
                              </Button>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>

                {/* Database Explorer Tab */}
                <TabsContent value="database" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Database Table</Label>
                      <Select value={selectedTable} onValueChange={setSelectedTable}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select table..." />
                        </SelectTrigger>
                        <SelectContent>
                          {databaseTables.map(table => (
                            <SelectItem key={table.table_name} value={table.table_name}>
                              {table.table_name} ({table.columns.length} columns)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Column</Label>
                      <Select 
                        value={selectedColumn} 
                        onValueChange={setSelectedColumn}
                        disabled={!selectedTable}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select column..." />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedTable && databaseTables
                            .find(t => t.table_name === selectedTable)
                            ?.columns.map(column => (
                              <SelectItem key={column.column_name} value={column.column_name}>
                                <div className="flex items-center gap-2">
                                  <span>{column.column_name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {column.data_type}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedTable && selectedColumn && (
                    <Card className="p-3 bg-muted/50">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Preview:</p>
                        <div className="text-xs">
                          <strong>Parameter:</strong> {selectedTable}.{selectedColumn}
                        </div>
                        <div className="text-xs">
                          <strong>Sample Value:</strong> 
                          <code className="ml-2 bg-background px-2 py-1 rounded">
                            {JSON.stringify(generateSampleData(selectedColumn, 
                              databaseTables.find(t => t.table_name === selectedTable)
                                ?.columns.find(c => c.column_name === selectedColumn)?.data_type || 'text'
                            ))}
                          </code>
                        </div>
                      </div>
                    </Card>
                  )}

                  <Button
                    onClick={handleTableColumnAdd}
                    disabled={!selectedTable || !selectedColumn || adding}
                    className="w-full"
                  >
                    Add Table Parameter
                  </Button>
                </TabsContent>

                {/* Custom Parameter Tab */}
                <TabsContent value="custom" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Parameter Name</Label>
                      <Input
                        value={parameterName}
                        onChange={(e) => setParameterName(e.target.value)}
                        placeholder="custom_field_name"
                      />
                    </div>
                    
                    <div>
                      <Label>Parameter Type</Label>
                      <Select value={parameterType} onValueChange={(value: 'system' | 'custom') => setParameterType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system">System (from database)</SelectItem>
                          <SelectItem value="custom">Custom (fixed value)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Source Field {parameterType === 'system' ? '(required)' : '(optional)'}</Label>
                      <Input
                        value={parameterSource}
                        onChange={(e) => setParameterSource(e.target.value)}
                        placeholder="subscription_id"
                        disabled={parameterType === 'custom' && customValue.trim() !== ''}
                      />
                    </div>
                    
                    <div>
                      <Label>Custom Value {parameterType === 'custom' ? '(required)' : '(optional)'}</Label>
                      <Input
                        value={customValue}
                        onChange={(e) => setCustomValue(e.target.value)}
                        placeholder="Fixed value"
                        disabled={parameterType === 'system' && parameterSource.trim() !== ''}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleCustomAdd}
                    disabled={adding || !parameterName.trim()}
                    className="w-full"
                  >
                    Add Custom Parameter
                  </Button>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        {/* Parameter List */}
        <div className="space-y-2">
          {payloadConfig.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">No parameters configured yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click "Add Parameter" to get started with smart suggestions
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {payloadConfig.map((param) => (
                <Card key={param.id} className={`p-3 ${param.is_enabled ? 'bg-background' : 'bg-muted/50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{param.parameter_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {param.parameter_type}
                        </Badge>
                        {!param.is_enabled && (
                          <Badge variant="secondary" className="text-xs">
                            Disabled
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {param.parameter_source && (
                          <span>Source: <code className="bg-muted px-1 rounded">{param.parameter_source}</code></span>
                        )}
                        {param.custom_value && (
                          <span>Value: <code className="bg-muted px-1 rounded">{param.custom_value}</code></span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={param.is_enabled}
                        onCheckedChange={(checked) => onParameterToggled(param.id, checked)}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onParameterDeleted(param.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};