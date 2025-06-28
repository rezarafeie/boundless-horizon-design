
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PersianDateTimePicker } from './PersianDateTimePicker';

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
  const [confirmed, setConfirmed] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [paymentTime, setPaymentTime] = useState('');
  const [payerName, setPayerName] = useState('');

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

  // Convert datetime-local to Persian date for display
  const formatPersianDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return '';
    
    try {
      const date = new Date(dateTimeString);
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        calendar: 'persian',
        numberingSystem: 'latn'
      };
      
      return new Intl.DateTimeFormat('fa-IR-u-ca-persian', options).format(date);
    } catch (error) {
      return dateTimeString;
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
      confirmed,
      subscriptionId,
      mobile
    });

    onPaymentStart();

    // Format the payment time for display
    const formattedPaymentTime = language === 'fa' ? 
      formatPersianDateTime(paymentTime) : 
      new Date(paymentTime).toLocaleString();

    // Here you would typically send the manual payment data to your backend
    // For now, we'll just call the onPaymentStart callback
    toast({
      title: language === 'fa' ? 'پرداخت ثبت شد' : 'Payment Recorded',
      description: language === 'fa' ? 
        'اطلاعات پرداخت شما ثبت شد و به ادمین ارسال خواهد شد' : 
        'Your payment information has been recorded and will be sent to admin',
    });
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

            <PersianDateTimePicker
              value={paymentTime}
              onChange={setPaymentTime}
              label={language === 'fa' ? 'زمان دقیق پرداخت' : 'Exact Payment Time'}
              placeholder={language === 'fa' ? 'زمان پرداخت را انتخاب کنید' : 'Select payment time'}
              required
            />

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
            disabled={!confirmed || !trackingNumber || !paymentTime || !payerName || isSubmitting}
            className="w-full mt-4"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                {language === 'fa' ? 'در حال پردازش...' : 'Processing...'}
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
