import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Server, MessageSquare, Calendar, CreditCard, User, Mail, Phone } from 'lucide-react';

interface SubscriptionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: any;
}

export const SubscriptionDetailsModal = ({ isOpen, onClose, subscription }: SubscriptionDetailsModalProps) => {
  if (!subscription) return null;

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'database':
        return <Database className="w-4 h-4 text-blue-600" />;
      case 'panel':
        return <Server className="w-4 h-4 text-green-600" />;
      case 'telegram':
        return <MessageSquare className="w-4 h-4 text-purple-600" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getSourceIcon(subscription.source)}
            Subscription Details - {subscription.username || subscription.mobile || 'Unknown User'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Source */}
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center gap-1">
              {getSourceIcon(subscription.source)}
              {subscription.source.toUpperCase()}
            </Badge>
            {subscription.status && (
              <Badge className={getStatusColor(subscription.status)}>
                {subscription.status.toUpperCase()}
              </Badge>
            )}
            {subscription.panel_name && (
              <Badge variant="secondary">
                Panel: {subscription.panel_name}
              </Badge>
            )}
          </div>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subscription.username && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Username:</span>
                  <span className="text-sm">{subscription.username}</span>
                </div>
              )}
              {subscription.mobile && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Mobile:</span>
                  <span className="text-sm">{subscription.mobile}</span>
                </div>
              )}
              {subscription.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Email:</span>
                  <span className="text-sm">{subscription.email}</span>
                </div>
              )}
              {subscription.details.chat_id && (
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Chat ID:</span>
                  <span className="text-sm">{subscription.details.chat_id}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subscription Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Subscription Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subscription.details.price_toman && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Price:</span>
                  <p className="text-lg font-semibold">{subscription.details.price_toman.toLocaleString()} تومان</p>
                </div>
              )}
              {subscription.details.data_limit_gb && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Data Limit:</span>
                  <p className="text-lg font-semibold">{subscription.details.data_limit_gb} GB</p>
                </div>
              )}
              {subscription.details.duration_days && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Duration:</span>
                  <p className="text-lg font-semibold">{subscription.details.duration_days} days</p>
                </div>
              )}
              {subscription.details.data_used && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Data Used:</span>
                  <p className="text-lg font-semibold">{subscription.details.data_used}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Important Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subscription.created_at && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Created:</span>
                  <p className="text-sm">{new Date(subscription.created_at).toLocaleString()}</p>
                </div>
              )}
              {subscription.details.expire_at && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Expires:</span>
                  <p className="text-sm">{new Date(subscription.details.expire_at).toLocaleString()}</p>
                </div>
              )}
              {subscription.details.expire_date && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Expires:</span>
                  <p className="text-sm">{new Date(subscription.details.expire_date).toLocaleString()}</p>
                </div>
              )}
              {subscription.details.last_seen && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Last Seen:</span>
                  <p className="text-sm">{new Date(subscription.details.last_seen).toLocaleString()}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Details */}
          {Object.keys(subscription.details).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {Object.entries(subscription.details).map(([key, value]) => {
                    if (!value || ['price_toman', 'data_limit_gb', 'duration_days', 'expire_at', 'expire_date', 'last_seen', 'chat_id', 'data_used'].includes(key)) {
                      return null;
                    }
                    return (
                      <div key={key} className="flex justify-between">
                        <span className="font-medium text-muted-foreground">{key.replace(/_/g, ' ')}:</span>
                        <span>{String(value)}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};