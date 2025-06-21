
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface PanelProtocolSelectorProps {
  selectedProtocols: string[];
  onProtocolsChange: (protocols: string[]) => void;
  disabled?: boolean;
}

const AVAILABLE_PROTOCOLS = [
  { id: 'vless', name: 'VLESS' },
  { id: 'vmess', name: 'VMess' },
  { id: 'trojan', name: 'Trojan' },
  { id: 'shadowsocks', name: 'Shadowsocks' }
];

export const PanelProtocolSelector = ({ 
  selectedProtocols, 
  onProtocolsChange, 
  disabled = false 
}: PanelProtocolSelectorProps) => {
  const toggleProtocol = (protocolId: string) => {
    if (disabled) return;
    
    const newProtocols = selectedProtocols.includes(protocolId)
      ? selectedProtocols.filter(p => p !== protocolId)
      : [...selectedProtocols, protocolId];
    
    onProtocolsChange(newProtocols);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Enabled Protocols</Label>
      <div className="grid grid-cols-2 gap-3">
        {AVAILABLE_PROTOCOLS.map((protocol) => (
          <div key={protocol.id} className="flex items-center space-x-2">
            <Checkbox
              id={protocol.id}
              checked={selectedProtocols.includes(protocol.id)}
              onCheckedChange={() => toggleProtocol(protocol.id)}
              disabled={disabled}
            />
            <Label htmlFor={protocol.id} className="text-sm">
              {protocol.name}
            </Label>
          </div>
        ))}
      </div>
      
      {selectedProtocols.length === 0 && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <p className="text-sm text-red-800 dark:text-red-200">
            ⚠️ At least one proxy protocol must be enabled.
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-1">
        {selectedProtocols.map((protocol) => (
          <Badge key={protocol} variant="secondary" className="text-xs">
            {AVAILABLE_PROTOCOLS.find(p => p.id === protocol)?.name || protocol}
          </Badge>
        ))}
      </div>
    </div>
  );
};
