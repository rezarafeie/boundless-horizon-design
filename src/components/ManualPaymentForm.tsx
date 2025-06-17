
import { useState } from 'react';
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
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: language === 'fa' ? 'حجم فایل نباید بیشتر از ۵ مگابایت باشد' : 'File size should not exceed 5MB',
          variant: 'destructive'
        });
        return;
      }
      setReceiptFile(file);
    }
  };

  const uploadReceiptToStorage = async (file: File, subscriptionId: string): Promise<string | null> => {
    try {
      setIsUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${subscriptionId}/receipt_${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('manual-payment-receipts')
        .upload(fileName, file);

      if (error) {
        console.error('Storage upload error:', error);
        throw error;
      }

      // Get public URL (even though bucket is private, we can get signed URL later if needed)
      const { data: { publicUrl } } = supabase.storage
        .from('manual-payment-receipts')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Failed to upload receipt:', error);
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
      
      const { data, error } = await supabase.functions.invoke('send-manual-payment-email', {
        body: {
          subscriptionId,
          receiptImageUrl: receiptUrl
        }
      });

      if (error) {
        console.error('Email sending error:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to send email');
      }

      toast({
        title: language === 'fa' ? 'ارسال شد' : 'Sent Successfully',
        description: language === 'fa' ? 
          'اطلاعات پرداخت به ادمین ارسال شد' : 
          'Payment information sent to admin',
      });

      return true;
    } catch (error) {
      console.error('Failed to send email notification:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'خطا در ارسال ایمیل به ادمین' : 
          'Failed to send email to admin',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSubmit = async () => {
    if (!confirmed) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'لطفاً تأیید پرداخت را انتخاب کنید' : 'Please confirm payment',
        variant: 'destructive'
      });
      return;
    }

    // Pass the post-creation callback with the payment data
    onPaymentConfirm({
      receiptFile: receiptFile || undefined,
      confirmed,
      // Store callback functions for later use
      postCreationCallback: async (subscriptionId: string) => {
        let receiptUrl = null;
        
        // Upload receipt if provided
        if (receiptFile) {
          receiptUrl = await uploadReceiptToStorage(receiptFile, subscriptionId);
          if (!receiptUrl) {
            return; // Upload failed, stop here
          }
        }
        
        // Send email notification to admin
        await sendEmailNotification(subscriptionId, receiptUrl);
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
