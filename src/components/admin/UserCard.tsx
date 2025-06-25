
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Image, Package, Server } from 'lucide-react';
import { ManualPaymentActions } from './ManualPaymentActions';
import { UserActionButtons } from './UserActionButtons';
import { AdvancedUserSection } from './AdvancedUserSection';

interface UserCardProps {
  subscription: any;
  onRefresh: () => void;
}

export const UserCard = ({ subscription, onRefresh }: UserCardProps) => {
  const getStatusBadge = (status: string, adminDecision?: string) => {
    if (status === 'pending' && adminDecision === 'pending') {
      return <Badge className="bg-orange-100 text-orange-800">Awaiting Review</Badge>;
    }
    
    const statusConfig = {
      'pending': { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      'paid': { label: 'Paid', className: 'bg-blue-100 text-blue-800' },
      'active': { label: 'Active', className: 'bg-green-100 text-green-800' },
      'expired': { label: 'Expired', className: 'bg-red-100 text-red-800' },
      'cancelled': { label: 'Cancelled', className: 'bg-gray-100 text-gray-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const parseManualPaymentDetails = (notes: string) => {
    if (!notes || !notes.includes('Manual payment')) return null;
    
    const trackingMatch = notes.match(/Tracking:\s*([^,]+)/);
    const payerMatch = notes.match(/Payer:\s*([^,]+)/);
    const timeMatch = notes.match(/Time:\s*([^-]+)/);
    
    return {
      trackingNumber: trackingMatch ? trackingMatch[1].trim() : null,
      payerName: payerMatch ? payerMatch[1].trim() : null,
      paymentTime: timeMatch ? timeMatch[1].trim() : null
    };
  };

  const needsDiagnostics = (subscription: any) => {
    return (
      subscription.status === 'active' && 
      subscription.admin_decision === 'approved' && 
      !subscription.marzban_user_created
    ) || (
      subscription.notes && 
      subscription.notes.includes('VPN creation failed')
    );
  };

  const manualPaymentDetails = parseManualPaymentDetails(subscription.notes || '');
  const showDiagnostics = needsDiagnostics(subscription);

  return (
    <Card 
      key={subscription.id} 
      className={`${subscription.status === 'pending' && subscription.admin_decision === 'pending' ? 'border-orange-200 bg-orange-50' : ''} overflow-hidden`}
    >
      <CardHeader className="pb-4">
        <div className="flex flex-col space-y-3">
          {/* Main user info - always visible */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                <span className="truncate">{subscription.username}</span>
                {getStatusBadge(subscription.status, subscription.admin_decision)}
              </CardTitle>
              <CardDescription className="mt-1">
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="truncate">📱 {subscription.mobile}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="whitespace-nowrap">📅 {new Date(subscription.created_at).toLocaleDateString()}</span>
                </div>
              </CardDescription>
            </div>
            
            <div className="text-left sm:text-right flex-shrink-0">
              <p className="text-lg font-bold">{subscription.price_toman.toLocaleString()} Toman</p>
              <p className="text-sm text-gray-500">{subscription.data_limit_gb}GB • {subscription.duration_days} days</p>
            </div>
          </div>

          {/* Plan and Panel Info - mobile friendly */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              <Package className="w-3 h-3 mr-1" />
              <span className="truncate max-w-[120px]">{(subscription as any).plan_name}</span>
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Server className="w-3 h-3 mr-1" />
              <span className="truncate max-w-[100px]">{(subscription as any).panel_name}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Core subscription info - simplified for mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="font-medium text-muted-foreground">Subscription:</span>
            <p className="truncate text-blue-600">
              {subscription.subscription_url ? 
                <a href={subscription.subscription_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  View Config
                </a> 
                : 'Not generated'
              }
            </p>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Status:</span>
            <p className="truncate">{subscription.notes?.slice(0, 50) || 'None'}{subscription.notes?.length > 50 ? '...' : ''}</p>
          </div>
        </div>

        {/* Manual Payment Details - mobile optimized */}
        {manualPaymentDetails && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">💳</span>
              </div>
              <span className="font-medium text-blue-800 dark:text-blue-200 text-sm">Manual Payment</span>
            </div>
            <div className="grid grid-cols-1 gap-2 text-xs">
              {manualPaymentDetails.trackingNumber && (
                <div>
                  <span className="font-medium text-muted-foreground">Tracking:</span>
                  <p className="font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded mt-1 break-all text-xs">
                    {manualPaymentDetails.trackingNumber}
                  </p>
                </div>
              )}
              {manualPaymentDetails.payerName && (
                <div>
                  <span className="font-medium text-muted-foreground">Payer:</span>
                  <p className="bg-white dark:bg-gray-800 px-2 py-1 rounded mt-1 break-words text-xs">
                    {manualPaymentDetails.payerName}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Receipt Image */}
        {subscription.receipt_image_url && (
          <div className="flex items-center gap-2 text-sm">
            <Image className="w-4 h-4" />
            <a 
              href={subscription.receipt_image_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline truncate"
            >
              View Payment Receipt
            </a>
          </div>
        )}

        {/* Action Buttons - mobile optimized */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="w-full sm:w-auto">
              <UserActionButtons 
                subscription={subscription} 
                onUpdate={onRefresh}
              />
            </div>
            <div className="w-full sm:w-auto flex justify-end">
              <ManualPaymentActions
                subscriptionId={subscription.id}
                status={subscription.status}
                adminDecision={subscription.admin_decision}
                username={subscription.username}
                amount={subscription.price_toman}
                onStatusUpdate={onRefresh}
              />
            </div>
          </div>

          {/* Advanced Section - Collapsible */}
          <AdvancedUserSection 
            subscription={subscription} 
            showDiagnostics={showDiagnostics}
          />
        </div>
      </CardContent>
    </Card>
  );
};
