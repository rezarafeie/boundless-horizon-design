
import { useState } from 'react';
import { ChevronDown, ChevronRight, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCreationLogs } from './UserCreationLogs';
import { SubscriptionDiagnostics } from './SubscriptionDiagnostics';

interface AdvancedUserSectionProps {
  subscription: any;
  showDiagnostics: boolean;
}

export const AdvancedUserSection = ({ subscription, showDiagnostics }: AdvancedUserSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-2 text-sm text-muted-foreground hover:text-foreground">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <Settings className="w-4 h-4" />
          Advanced (Diagnostics & Debug)
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="space-y-4 mt-4">
        {/* Subscription Diagnostics */}
        {showDiagnostics && (
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-yellow-800 dark:text-yellow-200">
                Subscription Diagnostics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SubscriptionDiagnostics subscriptionId={subscription.id} />
            </CardContent>
          </Card>
        )}

        {/* User Creation Logs */}
        <Card className="border-gray-200 bg-gray-50 dark:bg-gray-900/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-800 dark:text-gray-200">
              Creation Logs & Debug Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UserCreationLogs subscriptionId={subscription.id} />
          </CardContent>
        </Card>

        {/* Debug Information */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-800 dark:text-blue-200">
              Debug Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="grid grid-cols-1 gap-2">
              <div>
                <span className="font-medium">Subscription ID:</span>
                <p className="font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded mt-1 break-all">
                  {subscription.id}
                </p>
              </div>
              <div>
                <span className="font-medium">Created:</span>
                <p className="bg-white dark:bg-gray-800 px-2 py-1 rounded mt-1">
                  {new Date(subscription.created_at).toLocaleString()}
                </p>
              </div>
              {subscription.expire_at && (
                <div>
                  <span className="font-medium">Expires:</span>
                  <p className="bg-white dark:bg-gray-800 px-2 py-1 rounded mt-1">
                    {new Date(subscription.expire_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};
