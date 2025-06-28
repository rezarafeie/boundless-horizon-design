
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarzbanApiTester } from './MarzbanApiTester';
import { MarzneshinApiTester } from './MarzneshinApiTester';

interface Panel {
  id: string;
  name: string;
  type: 'marzban' | 'marzneshin';
  panel_url: string;
  username: string;
  password: string;
}

interface ApiTesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPanel?: Panel | null;
}

export const ApiTesterModal = ({ isOpen, onClose, selectedPanel }: ApiTesterModalProps) => {
  const [activeTab, setActiveTab] = useState<'marzban' | 'marzneshin'>(selectedPanel?.type || 'marzban');

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'marzban' | 'marzneshin');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>API Endpoint Tester</DialogTitle>
          <DialogDescription>
            Test Marzban and Marzneshin panel API endpoints to diagnose connectivity and functionality issues
            {selectedPanel && (
              <span className="block mt-1 text-blue-600">
                Pre-configured with: {selectedPanel.name} ({selectedPanel.type})
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="marzban">Marzban API</TabsTrigger>
            <TabsTrigger value="marzneshin">Marzneshin API</TabsTrigger>
          </TabsList>
          
          <TabsContent value="marzban" className="space-y-4">
            <MarzbanApiTester
              initialUrl={selectedPanel?.type === 'marzban' ? selectedPanel.panel_url : ''}
              initialUsername={selectedPanel?.type === 'marzban' ? selectedPanel.username : ''}
              initialPassword={selectedPanel?.type === 'marzban' ? selectedPanel.password : ''}
            />
          </TabsContent>
          
          <TabsContent value="marzneshin" className="space-y-4">
            <MarzneshinApiTester />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
