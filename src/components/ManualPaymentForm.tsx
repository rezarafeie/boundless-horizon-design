
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ManualPaymentFormProps {
  amount: number;
  onPaymentConfirm: (data: { 
    trackingNumber: string; 
    paymentTime: string; 
    payerName: string; 
    confirmed: boolean; 
    postCreationCallback?: (subscriptionId: string) => Promise<void> 
  }) => void;
  isSubmitting: boolean;
}

const ManualPaymentForm = ({ amount, onPaymentConfirm, isSubmitting }: ManualPaymentFormProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [confirmed, setConfirmed] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [paymentTime, setPaymentTime] = useState('');
  const [payerName, setPayerName] = useState('');
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isWaitingForApproval, setIsWaitingForApproval] = useState(false);

  const debugLog = (type: 'info' | 'error' | 'success' | 'warning', message: string, data?: any) => {
    console.log(`[MANUAL-PAYMENT] ${type.toUpperCase()}: ${message}`, data || '');
    if (window.debugPayment) {
      window.debugPayment('manual', type, message, data);
    }
  };

  // Poll for payment approval
  useEffect(() => {
    if (!subscriptionId || !isPolling) return;

    const pollInterval = setInterval(async () => {
      try {
        debugLog('info', 'Polling for admin decision', { subscriptionId });
        
        const { data: subscription, error } = await supabase
          .from('subscriptions')
          .select('id, username, admin_decision, status, subscription_url, data_limit_gb, duration_days')
          .eq('id', subscriptionId)
          .single();

        if (error) {
          debugLog('error', 'Polling error', error);
          console.error('Polling error:', error);
          return;
        }

        debugLog('info', 'Polling result', { 
          admin_decision: subscription.admin_decision, 
          status: subscription.status 
        });

        if (subscription.admin_decision === 'approved' && subscription.status === 'active') {
          debugLog('success', 'Manual payment approved by admin', subscription);
          setIsPolling(false);
          setIsWaitingForApproval(false);
          
          toast({
            title: language === 'fa' ? 'پرداخت تأیید شد' : 'Payment Approved',
            description: language === 'fa' ? 
              'پرداخت شما تأیید شد. در حال انتقال...' : 
              'Your payment has been approved. Redirecting...',
          });

          // Redirect to delivery page with subscription data
          setTimeout(() => {
            const deliveryUrl = `/delivery?subscriptionData=${encodeURIComponent(JSON.stringify({
              username: subscription.username,
              subscription_url: subscription.subscription_url,
              expire: Date.now() + (subscription.duration_days * 24 * 60 * 60 * 1000),
              data_limit: subscription.data_limit_gb * 1073741824,
              status: 'active'
            }))}`;
            debugLog('info', 'Redirecting to delivery page', { url: deliveryUrl });
            window.location.href = deliveryUrl;
          }, 2000);
        } else if (subscription.admin_decision === 'rejected') {
          debugLog('error', 'Manual payment rejected by admin', subscription);
          setIsPolling(false);
          setIsWaitingForApproval(false);
          
          toast({
            title: language === 'fa' ? 'پرداخت رد شد' : 'Payment Rejected',
            description: language === 'fa' ? 
              'پرداخت شما رد شد. لطفا با پشتیبانی تماس بگیرید.' : 
              'Your payment was rejected. Please contact support.',
            variant: 'destructive'
          });
        }
      } catch (error) {
        debugLog('error', 'Polling exception', error);
        console.error('Polling error:', error);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [subscriptionId, isPolling, language, toast]);

  const bankInfo = {
    bankName: language === 'fa' ? 'بلوبانک ( سامان )' : 'Bluebank (Saman)',
    cardNumber: '6219-8619-9131-3783',
    accountHolder: language === 'fa' ? 'مهران ذبحی' : 'Mehran Zabhi',
    amount: amount.toLocaleString()
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: language === 'fa' ? 'کپی شد' : 'Copied',
      description: language === 'fa' ? 'شماره کارت کپی شد' : 'Card number copied',
    });
  };

  const sendNotificationToAdmin = async (subscriptionId: string) => {
    try {
      setIsSendingNotification(true);
      debugLog('info', 'Sending notification to admin', { 
        subscriptionId, 
        trackingNumber, 
        paymentTime, 
        payerName 
      });
      
      const { data, error } = await supabase.functions.invoke('send-manual-payment-email', {
        body: {
          subscriptionId,
          trackingNumber,
          paymentTime,
          payerName
        }
      });

      debugLog('info', 'Admin notification response', { data, error });

      if (error) {
        debugLog('error', 'Admin notification failed', error);
        console.error('Notification sending error:', error);
        throw error;
      }

      if (!data.success) {
        debugLog('error', 'Admin notification function returned error', data);
        throw new Error(data.error || 'Failed to send notification');
      }

      debugLog('success', 'Admin notification sent successfully', data);
      
      return true;
    } catch (error) {
      console.error('Failed to send admin notification:', error);
      debugLog('error', 'Admin notification failed', error);
      
      toast({
        title: language === 'fa' ? 'توجه' : 'Notice',
        description: language === 'fa' ? 
          'سفارش ثبت شد اما اطلاع‌رسانی به ادمین ناموفق بود. لطفا با پشتیبانی تماس بگیرید.' : 
          'Order saved but admin notification failed. Please contact support.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsSendingNotification(false);
    }
  };

  const handleSubmit = async () => {
    if (!confirmed) {
      debugLog('warning', 'Payment not confirmed by user');
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'لطفاً تأیید پرداخت را انتخاب کنید' : 'Please confirm payment',
        variant: 'destructive'
      });
      return;
    }

    if (!trackingNumber || !paymentTime || !payerName) {
      debugLog('warning', 'Required fields missing');
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'لطفاً تمام فیلدهای الزامی را پر کنید' : 
          'Please fill all required fields',
        variant: 'destructive'
      });
      return;
    }

    debugLog('info', 'Manual payment submission started', { 
      trackingNumber,
      paymentTime,
      payerName,
      confirmed 
    });

    onPaymentConfirm({
      trackingNumber,
      paymentTime,
      payerName,
      confirmed,
      postCreationCallback: async (subId: string) => {
        setSubscriptionId(subId);
        
        const notificationSent = await sendNotificationToAdmin(subId);
        
        setIsWaitingForApproval(true);
        setIsPolling(true);
      }
    });
  };

  if (isWaitingForApproval) {
    return (
      <div className="space-y-6">
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader className="w-12 h-12 animate-spin mx-auto text-blue-600" />
              <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-200">
                {language === 'fa' ? 'در انتظار تأیید ادمین' : 'Waiting for Admin Approval'}
              </h2>
              <p className="text-blue-700 dark:text-blue-300">
                {language === 'fa' ? 
                  'سفارش شما دریافت شد. پس از تایید اطلاعات پرداخت لینک اتصال برای شما ساخته خواهد شد. لطفا منتظر بمانید.' : 
                  'Your order has been received. After payment information approval, the connection link will be created for you. Please wait.'
                }
              </p>
              <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg text-sm">
                <div className="grid grid-cols-1 gap-2 text-right">
                  <div>
                    <span className="text-muted-foreground">
                      {language === 'fa' ? 'شماره پیگیری:' : 'Tracking Number:'}
                    </span>
                    <span className="font-medium mr-2">{trackingNumber}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {language === 'fa' ? 'نام پرداخت کننده:' : 'Payer Name:'}
                    </span>
                    <span className="font-medium mr-2">{payerName}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-blue-600">
                {language === 'fa' ? 
                  'وضعیت پرداخت هر ۵ ثانیه بررسی می‌شود...' : 
                  'Checking payment status every 5 seconds...'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-800 dark:text-blue-200 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {language === 'fa' ? 'اطلاعات پرداخت کارت به کارت' : 'Manual Transfer Payment Info'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">
                {language === 'fa' ? 'نام بانک' : 'Bank Name'}
              </Label>
              <p className="font-medium">{bankInfo.bankName}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">
                {language === 'fa' ? 'صاحب حساب' : 'Account Holder'}
              </Label>
              <p className="font-medium">{bankInfo.accountHolder}</p>
            </div>
          </div>
          
          <div>
            <Label className="text-sm text-muted-foreground">
              {language === 'fa' ? 'شماره کارت' : 'Card Number'}
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="bg-muted px-3 py-2 rounded font-mono text-lg flex-1">
                {bankInfo.cardNumber}
              </code>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => copyToClipboard(bankInfo.cardNumber.replace(/-/g, ''))}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground">
              {language === 'fa' ? 'مبلغ قابل پرداخت' : 'Amount to Pay'}
            </Label>
            <div className="text-2xl font-bold text-primary mt-1">
              {bankInfo.amount} {language === 'fa' ? 'تومان' : 'Toman'}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'fa' ? 'اطلاعات پرداخت' : 'Payment Details'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tracking-number" className="text-sm font-medium">
                {language === 'fa' ? 'شماره پیگیری *' : 'Tracking Number *'}
              </Label>
              <Input
                id="tracking-number"
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder={language === 'fa' ? 'شماره پیگیری تراکنش را وارد کنید' : 'Enter transaction tracking number'}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="payment-time" className="text-sm font-medium">
                {language === 'fa' ? 'زمان دقیق پرداخت *' : 'Exact Payment Time *'}
              </Label>
              <Input
                id="payment-time"
                type="datetime-local"
                value={paymentTime}
                onChange={(e) => setPaymentTime(e.target.value)}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="payer-name" className="text-sm font-medium">
                {language === 'fa' ? 'نام پرداخت کننده *' : 'Payer Name *'}
              </Label>
              <Input
                id="payer-name"
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder={language === 'fa' ? 'نام کامل پرداخت کننده را وارد کنید' : 'Enter full name of payer'}
                className="mt-1"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3 space-x-reverse">
            <Checkbox
              id="payment-confirm"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="payment-confirm" className="cursor-pointer font-medium">
                {language === 'fa' ? 
                  'پرداخت انجام داده‌ام' : 
                  'I have completed the payment'
                }
              </Label>
              <p className="text-sm text-muted-foreground">
                {language === 'fa' ? 
                  'با تیک زدن این گزینه، تأیید می‌کنم که مبلغ را واریز کرده‌ام و اطلاعات فوق صحیح است' : 
                  'By checking this option, I confirm that I have transferred the amount and the above information is correct'
                }
              </p>
            </div>
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={!confirmed || !trackingNumber || !paymentTime || !payerName || isSubmitting || isSendingNotification}
            className="w-full mt-4"
            size="lg"
          >
            {isSubmitting || isSendingNotification ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                {isSendingNotification ? (
                  language === 'fa' ? 'ارسال به ادمین...' : 'Sending to Admin...'
                ) : (
                  language === 'fa' ? 'در حال پردازش...' : 'Processing...'
                )}
              </>
            ) : (
              language === 'fa' ? 'تأیید پرداخت' : 'Confirm Payment'
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-2">
            {language === 'fa' ? 
              'سفارش شما به ادمین ارسال خواهد شد و پس از تأیید فعال می‌شود' : 
              'Your order will be sent to admin and activated after approval'
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManualPaymentForm;
