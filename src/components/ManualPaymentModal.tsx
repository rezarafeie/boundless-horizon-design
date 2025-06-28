
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { SubscriptionStatusMonitor } from './SubscriptionStatusMonitor';

interface ManualPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionId: string;
  subscriptionData?: any;
}

const ManualPaymentModal = ({ 
  isOpen, 
  onClose, 
  subscriptionId, 
  subscriptionData 
}: ManualPaymentModalProps) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [currentStatus, setCurrentStatus] = useState(subscriptionData?.status || 'pending');

  const handleStatusChange = (newStatus: string, data?: any) => {
    console.log('Manual payment status changed:', { newStatus, data });
    setCurrentStatus(newStatus);
    
    if (newStatus === 'active' || newStatus === 'paid') {
      // Auto-navigate to delivery page when approved
      setTimeout(() => {
        navigate(`/delivery?id=${subscriptionId}`);
        onClose();
      }, 2000);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'waiting_approval':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'active':
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap = {
      pending: language === 'fa' ? 'در انتظار بررسی' : 'Pending Review',
      waiting_approval: language === 'fa' ? 'در انتظار تایید' : 'Waiting Approval',
      active: language === 'fa' ? 'تایید شد' : 'Approved',
      paid: language === 'fa' ? 'پرداخت شد' : 'Payment Confirmed',
      rejected: language === 'fa' ? 'رد شد' : 'Rejected'
    };
    
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'waiting_approval':
        return 'bg-orange-500';
      case 'active':
      case 'paid':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const goToDelivery = () => {
    navigate(`/delivery?id=${subscriptionId}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {language === 'fa' ? 'وضعیت پرداخت دستی' : 'Manual Payment Status'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status Display */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              {getStatusIcon(currentStatus)}
              <Badge className={`${getStatusBadgeColor(currentStatus)} text-white`}>
                {getStatusText(currentStatus)}
              </Badge>
            </div>
            
            {/* Status Messages */}
            {currentStatus === 'pending' && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <p className="text-yellow-800 dark:text-yellow-200">
                  {language === 'fa' ? 
                    'اطلاعات پرداخت شما ثبت شد. لطفاً منتظر بررسی توسط ادمین باشید.' : 
                    'Your payment information has been recorded. Please wait for admin review.'
                  }
                </p>
              </div>
            )}
            
            {currentStatus === 'waiting_approval' && (
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                <p className="text-orange-800 dark:text-orange-200">
                  {language === 'fa' ? 
                    'پرداخت شما در حال بررسی است. به محض تایید، اشتراک فعال خواهد شد.' : 
                    'Your payment is under review. Once approved, your subscription will be activated.'
                  }
                </p>
              </div>
            )}
            
            {(currentStatus === 'active' || currentStatus === 'paid') && (
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="text-green-800 dark:text-green-200 font-semibold">
                    {language === 'fa' ? 'پرداخت تایید شد!' : 'Payment Approved!'}
                  </span>
                </div>
                <p className="text-green-700 dark:text-green-300">
                  {language === 'fa' ? 
                    'اشتراک شما فعال شد. در حال انتقال به صفحه جزئیات...' : 
                    'Your subscription is now active. Redirecting to details page...'
                  }
                </p>
              </div>
            )}
          </div>
          
          {/* Subscription Status Monitor */}
          <SubscriptionStatusMonitor
            subscriptionId={subscriptionId}
            onStatusChange={handleStatusChange}
            autoRefresh={true}
          />
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            {(currentStatus === 'active' || currentStatus === 'paid') ? (
              <Button onClick={goToDelivery} className="flex-1">
                {language === 'fa' ? 'مشاهده جزئیات' : 'View Details'}
              </Button>
            ) : (
              <>
                <Button onClick={goToDelivery} variant="outline" className="flex-1">
                  {language === 'fa' ? 'مشاهده وضعیت' : 'Check Status'}
                </Button>
                <Button onClick={onClose} variant="secondary" className="flex-1">
                  {language === 'fa' ? 'بستن' : 'Close'}
                </Button>
              </>
            )}
          </div>
          
          {/* Subscription Info */}
          {subscriptionData && (
            <div className="bg-muted p-3 rounded-lg text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">{language === 'fa' ? 'شناسه:' : 'ID:'}</span>
                  <p className="font-mono text-xs">{subscriptionId.slice(0, 8)}...</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{language === 'fa' ? 'نام کاربری:' : 'Username:'}</span>
                  <p className="font-medium">{subscriptionData.username}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualPaymentModal;
