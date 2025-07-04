
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, CheckCircle, AlertCircle, Loader, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WebhookService } from '@/utils/webhookUtils';

interface ManualPaymentFormProps {
  amount: number;
  mobile: string;
  subscriptionId: string;
  onPaymentStart: () => void;
  isSubmitting: boolean;
}

const ManualPaymentForm = ({ amount, mobile, subscriptionId, onPaymentStart, isSubmitting }: ManualPaymentFormProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const debugLog = (type: 'info' | 'error' | 'success' | 'warning', message: string, data?: any) => {
    console.log(`[MANUAL-PAYMENT] ${type.toUpperCase()}: ${message}`, data || '');
    if (window.debugPayment) {
      window.debugPayment('manual', type, message, data);
    }
  };

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

  const uploadReceipt = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      
      // Validate file
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('File size too large (max 10MB)');
      }

      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const filePath = `${subscriptionId}_${timestamp}.${fileExt}`;

      console.log('MANUAL_PAYMENT: Starting upload:', { 
        fileName: file.name, 
        filePath, 
        fileSize: file.size,
        subscriptionId 
      });

      const { data, error } = await supabase.storage
        .from('manual-payment-receipts')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('MANUAL_PAYMENT: Storage upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL (now that bucket is public)
      const { data: urlData } = supabase.storage
        .from('manual-payment-receipts')
        .getPublicUrl(filePath);

      console.log('MANUAL_PAYMENT: Upload successful:', {
        filePath: data.path,
        publicUrl: urlData.publicUrl
      });
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('MANUAL_PAYMENT: Upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: language === 'fa' ? 'خطا در بارگذاری' : 'Upload Error',
        description: language === 'fa' ? 
          `خطا در بارگذاری رسید: ${errorMessage}` : 
          `Failed to upload receipt: ${errorMessage}`,
        variant: 'destructive'
      });
      return null;
    } finally {
      setUploading(false);
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

    if (!receiptFile) {
      debugLog('warning', 'Receipt file missing');
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'لطفاً رسید پرداخت را بارگذاری کنید' : 
          'Please upload payment receipt',
        variant: 'destructive'
      });
      return;
    }

    debugLog('info', 'Manual payment submission started', { 
      receiptFile: receiptFile.name,
      confirmed,
      subscriptionId,
      mobile
    });

    onPaymentStart();

    // Upload receipt file
    const receiptUrl = await uploadReceipt(receiptFile);
    if (!receiptUrl) {
      return; // Upload failed, error already shown
    }

    // Update subscription with receipt URL and admin decision
    try {
      console.log('MANUAL_PAYMENT: Updating subscription in database:', {
        subscriptionId,
        receiptUrl,
        status: 'pending',
        admin_decision: 'pending'
      });

      const { data: updateData, error: updateError } = await supabase
        .from('subscriptions')
        .update({ 
          receipt_image_url: receiptUrl,
          status: 'pending',
          admin_decision: 'pending'
        })
        .eq('id', subscriptionId)
        .select();

      if (updateError) {
        console.error('MANUAL_PAYMENT: Database update error:', {
          error: updateError,
          code: updateError.code,
          message: updateError.message,
          details: updateError.details
        });
        
        toast({
          title: language === 'fa' ? 'خطا در پایگاه داده' : 'Database Error',
          description: language === 'fa' ? 
            `خطا در ثبت اطلاعات پرداخت: ${updateError.message}` : 
            `Failed to record payment: ${updateError.message}`,
          variant: 'destructive'
        });
        return;
      }

      console.log('MANUAL_PAYMENT: Database update successful:', updateData);

      // Send webhook notification with complete subscription data
      try {
        // Fetch complete subscription data from database
        const { data: fullSubscription, error: fetchError } = await supabase
          .from('subscriptions')
          .select(`
            *,
            subscription_plans!inner(
              name_en,
              plan_id,
              assigned_panel_id,
              panel_servers!inner(
                name,
                type,
                panel_url,
                country_en
              )
            )
          `)
          .eq('id', subscriptionId)
          .single();

        if (fetchError || !fullSubscription) {
          console.error('MANUAL_PAYMENT: Failed to fetch complete subscription data:', fetchError);
        }

        const webhookPayload = {
          type: 'new_subscription' as const,
          webhook_type: 'paymentpending' as const,
          subscription_id: subscriptionId,
          username: fullSubscription?.username || `user_${mobile}`,
          mobile: mobile,
          email: fullSubscription?.email || null,
          amount: amount,
          payment_method: 'manual',
          receipt_url: receiptUrl,
          approve_link: `https://bnets.co/admin/approve-order/${subscriptionId}`,
          reject_link: `https://bnets.co/admin/reject-order/${subscriptionId}`,
          // Complete subscription data
          subscription_url: fullSubscription?.subscription_url || null,
          plan_name: fullSubscription?.subscription_plans?.name_en || 'Unknown Plan',
          plan_id: fullSubscription?.subscription_plans?.plan_id || 'unknown',
          panel_name: fullSubscription?.subscription_plans?.panel_servers?.name || 'Unknown Panel',
          panel_type: fullSubscription?.subscription_plans?.panel_servers?.type || 'unknown',
          panel_url: fullSubscription?.subscription_plans?.panel_servers?.panel_url || null,
          panel_country: fullSubscription?.subscription_plans?.panel_servers?.country_en || 'Unknown',
          data_limit_gb: fullSubscription?.data_limit_gb || 0,
          duration_days: fullSubscription?.duration_days || 0,
          expire_at: fullSubscription?.expire_at || null,
          protocol: fullSubscription?.protocol || null,
          status: fullSubscription?.status || 'pending',
          created_at: fullSubscription?.created_at || new Date().toISOString()
        };

        console.log('MANUAL_PAYMENT: Sending webhook notification directly');
        
        const { data: webhookData, error: webhookError } = await supabase.functions.invoke('send-webhook-notification', {
          body: webhookPayload
        });
        
        if (webhookError || !webhookData?.success) {
          console.error('MANUAL_PAYMENT: Webhook notification failed:', webhookError);
          // Don't fail the payment for webhook issues, but show warning
          toast({
            title: language === 'fa' ? 'هشدار' : 'Warning',
            description: language === 'fa' ? 
              'پرداخت ثبت شد اما اطلاع‌رسانی به ادمین ممکن است با تأخیر باشد' : 
              'Payment recorded but admin notification may be delayed',
          });
        } else {
          console.log('MANUAL_PAYMENT: Webhook notification sent successfully:', webhookData);
        }
      } catch (webhookError) {
        console.error('MANUAL_PAYMENT: Webhook notification error:', webhookError);
        // Continue with success message even if webhook fails
      }

      toast({
        title: language === 'fa' ? 'پرداخت ثبت شد' : 'Payment Recorded',
        description: language === 'fa' ? 
          'رسید پرداخت شما بارگذاری شد و به ادمین ارسال خواهد شد' : 
          'Your payment receipt has been uploaded and sent to admin',
      });

      // Redirect to delivery page with subscription ID
      setTimeout(() => {
        navigate(`/delivery?id=${subscriptionId}`);
      }, 2000);

    } catch (error) {
      console.error('MANUAL_PAYMENT: Error processing payment:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در پردازش پرداخت' : 'Error processing payment',
        variant: 'destructive'
      });
    }
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
            {language === 'fa' ? 'بارگذاری رسید پرداخت' : 'Upload Payment Receipt'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="receipt-upload" className="text-sm font-medium">
                {language === 'fa' ? 'رسید پرداخت *' : 'Payment Receipt *'}
              </Label>
              <p className="text-sm text-muted-foreground mt-1 mb-3">
                {language === 'fa' ? 
                  'لطفاً تصویر رسید کارت‌به‌کارت خود را بارگذاری کنید.' : 
                  'Please upload your card-to-card payment receipt image.'
                }
              </p>
              
              <div className="relative">
                <Input
                  id="receipt-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setReceiptFile(file);
                    }
                  }}
                  className="hidden"
                  required
                />
                <div 
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => document.getElementById('receipt-upload')?.click()}
                >
                  {receiptFile ? (
                    <div className="space-y-2">
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
                      <p className="font-medium text-green-800 dark:text-green-400">
                        {receiptFile.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {language === 'fa' ? 'فایل انتخاب شده' : 'File selected'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                      <p className="font-medium">
                        {language === 'fa' ? 
                          'برای انتخاب فایل کلیک کنید' : 
                          'Click to select file'
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {language === 'fa' ? 
                          'فرمت‌های پشتیبانی شده: JPG, PNG, GIF' : 
                          'Supported formats: JPG, PNG, GIF'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
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
            disabled={!confirmed || !receiptFile || isSubmitting || uploading}
            className="w-full mt-4"
            size="lg"
          >
            {isSubmitting || uploading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                {uploading ? 
                  (language === 'fa' ? 'در حال بارگذاری...' : 'Uploading...') :
                  (language === 'fa' ? 'در حال پردازش...' : 'Processing...')
                }
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
