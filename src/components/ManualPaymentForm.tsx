import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Copy, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ManualPaymentFormProps {
  amount: number;
  onPaymentConfirm: (data: { receiptFile?: File; confirmed: boolean }) => void;
  isSubmitting: boolean;
}

const ManualPaymentForm = ({ amount, onPaymentConfirm, isSubmitting }: ManualPaymentFormProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [confirmed, setConfirmed] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const debugLog = (type: 'info' | 'error' | 'success' | 'warning', message: string, data?: any) => {
    if (window.debugPayment) {
      window.debugPayment('manual', type, message, data);
    }
  };

  // Poll for payment approval
  useEffect(() => {
    if (!subscriptionId || !isPolling) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data: subscription, error } = await supabase
          .from('subscriptions')
          .select('admin_decision, status, subscription_url')
          .eq('id', subscriptionId)
          .single();

        if (error) {
          console.error('Polling error:', error);
          return;
        }

        if (subscription.admin_decision === 'approved' && subscription.status === 'active') {
          debugLog('success', 'Manual payment approved by admin', subscription);
          setIsPolling(false);
          
          toast({
            title: language === 'fa' ? 'پرداخت تأیید شد' : 'Payment Approved',
            description: language === 'fa' ? 
              'پرداخت شما تأیید شد. در حال انتقال...' : 
              'Your payment has been approved. Redirecting...',
          });

          // Redirect to delivery page with subscription data
          setTimeout(() => {
            window.location.href = `/delivery?subscriptionData=${encodeURIComponent(JSON.stringify({
              username: subscription.username,
              subscription_url: subscription.subscription_url,
              expire: Date.now() + (30 * 24 * 60 * 60 * 1000), // Default 30 days
              data_limit: 50 * 1073741824, // Default 50GB
              status: 'active'
            }))}`;
          }, 2000);
        } else if (subscription.admin_decision === 'rejected') {
          debugLog('error', 'Manual payment rejected by admin', subscription);
          setIsPolling(false);
          
          toast({
            title: language === 'fa' ? 'پرداخت رد شد' : 'Payment Rejected',
            description: language === 'fa' ? 
              'پرداخت شما رد شد. لطفا با پشتیبانی تماس بگیرید.' : 
              'Your payment was rejected. Please contact support.',
            variant: 'destructive'
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [subscriptionId, isPolling, language, toast]);

  const bankInfo = {
    bankName: language === 'fa' ? 'بانک ملت' : 'Bank Mellat',
    cardNumber: '6104-3378-8765-4321',
    accountHolder: language === 'fa' ? 'شرکت شبکه بدون مرز' : 'Boundless Network Company',
    amount: amount.toLocaleString()
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: language === 'fa' ? 'کپی شد' : 'Copied',
      description: language === 'fa' ? 'شماره کارت کپی شد' : 'Card number copied',
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        debugLog('error', 'File size too large', { size: file.size });
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: language === 'fa' ? 'حجم فایل نباید بیشتر از ۵ مگابایت باشد' : 'File size should not exceed 5MB',
          variant: 'destructive'
        });
        return;
      }
      debugLog('success', 'Receipt file selected', { name: file.name, size: file.size });
      setReceiptFile(file);
    }
  };

  const uploadReceiptToStorage = async (file: File, subscriptionId: string): Promise<string | null> => {
    try {
      setIsUploading(true);
      debugLog('info', 'Starting receipt upload', { fileName: file.name, subscriptionId });
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${subscriptionId}/receipt_${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('manual-payment-receipts')
        .upload(fileName, file);

      if (error) {
        debugLog('error', 'Storage upload failed', error);
        console.error('Storage upload error:', error);
        throw error;
      }

      debugLog('success', 'Receipt uploaded successfully', { fileName, path: data.path });

      const { data: { publicUrl } } = supabase.storage
        .from('manual-payment-receipts')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Failed to upload receipt:', error);
      debugLog('error', 'Receipt upload failed', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در آپلود تصویر' : 'Failed to upload image',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const sendEmailNotification = async (subscriptionId: string, receiptUrl?: string) => {
    try {
      setIsSendingEmail(true);
      debugLog('info', 'Sending email notification', { subscriptionId, receiptUrl });
      
      const { data, error } = await supabase.functions.invoke('send-manual-payment-email', {
        body: {
          subscriptionId,
          receiptImageUrl: receiptUrl
        }
      });

      if (error) {
        debugLog('error', 'Email sending failed', error);
        console.error('Email sending error:', error);
        throw error;
      }

      if (!data.success) {
        debugLog('error', 'Email function returned error', data);
        throw new Error(data.error || 'Failed to send email');
      }

      debugLog('success', 'Email sent successfully', data);
      
      return true;
    } catch (error) {
      console.error('Failed to send email notification:', error);
      debugLog('error', 'Email notification failed', error);
      
      // Still show success to user but log the email issue
      toast({
        title: language === 'fa' ? 'توجه' : 'Notice',
        description: language === 'fa' ? 
          'سفارش ثبت شد اما ایمیل به ادمین ارسال نشد. لطفا با پشتیبانی تماس بگیرید.' : 
          'Order saved but email to admin failed. Please contact support.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsSendingEmail(false);
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

    debugLog('info', 'Manual payment submission started', { 
      hasReceipt: !!receiptFile,
      confirmed 
    });

    // Pass the post-creation callback with the payment data
    onPaymentConfirm({
      receiptFile: receiptFile || undefined,
      confirmed,
      // Store callback functions for later use
      postCreationCallback: async (subId: string) => {
        setSubscriptionId(subId);
        let receiptUrl = null;
        
        // Upload receipt if provided
        if (receiptFile) {
          receiptUrl = await uploadReceiptToStorage(receiptFile, subId);
          if (!receiptUrl) {
            return; // Upload failed, stop here
          }
        }
        
        // Send email notification to admin
        await sendEmailNotification(subId, receiptUrl);
        
        // Show success message with specific Persian text
        toast({
          title: language === 'fa' ? 'سفارش دریافت شد' : 'Order Received',
          description: language === 'fa' ? 
            'سفارش شما دریافت شد. پس از تایید رسید پرداخت لینک اتصال برای شما ساخته خواهد شد. لطفا منتظر بمانید.' : 
            'Your order has been received. After payment receipt approval, the connection link will be created for you. Please wait.',
        });
        
        // Start polling for admin approval
        setIsPolling(true);
      }
    } as any);
  };

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
            {language === 'fa' ? 'آپلود رسید (اختیاری)' : 'Upload Receipt (Optional)'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="receipt" className="cursor-pointer">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                  {isUploading ? (
                    <Loader className="w-8 h-8 mx-auto mb-2 text-muted-foreground animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {receiptFile ? receiptFile.name : (
                      language === 'fa' ? 
                        'کلیک کنید تا تصویر رسید را انتخاب کنید' : 
                        'Click to select receipt image'
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'fa' ? 'حداکثر ۵ مگابایت' : 'Max 5MB'}
                  </p>
                </div>
              </Label>
              <Input
                id="receipt"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
            </div>

            {receiptFile && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                {language === 'fa' ? 'فایل انتخاب شد:' : 'File selected:'} {receiptFile.name}
              </div>
            )}
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
                  'با تیک زدن این گزینه، تأیید می‌کنم که مبلغ را واریز کرده‌ام' : 
                  'By checking this option, I confirm that I have transferred the amount'
                }
              </p>
            </div>
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={!confirmed || isSubmitting || isUploading || isSendingEmail}
            className="w-full mt-4"
            size="lg"
          >
            {isSubmitting || isUploading || isSendingEmail ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                {isSendingEmail ? (
                  language === 'fa' ? 'ارسال به ادمین...' : 'Sending to Admin...'
                ) : isUploading ? (
                  language === 'fa' ? 'آپلود رسید...' : 'Uploading Receipt...'
                ) : (
                  language === 'fa' ? 'در حال پردازش...' : 'Processing...'
                )}
              </>
            ) : (
              language === 'fa' ? 'تأیید پرداخت' : 'Confirm Payment'
            )}
          </Button>

          {isPolling && (
            <p className="text-xs text-blue-600 text-center mt-2">
              {language === 'fa' ? 
                'در انتظار تأیید ادمین... (هر ۵ ثانیه بررسی می‌شود)' : 
                'Waiting for admin approval... (checking every 5 seconds)'
              }
            </p>
          )}

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
