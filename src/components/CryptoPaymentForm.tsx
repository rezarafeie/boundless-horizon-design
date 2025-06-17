
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader, ExternalLink, Copy, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CryptoPaymentFormProps {
  amount: number;
  onPaymentSuccess: (paymentId: string) => void;
  isSubmitting: boolean;
}

interface CryptoInvoice {
  payment_id: string;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  invoice_url: string;
  payment_url: string;
}

const CryptoPaymentForm = ({ amount, onPaymentSuccess, isSubmitting }: CryptoPaymentFormProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<CryptoInvoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>('waiting');

  const usdAmount = Math.ceil(amount / 60000); // Convert Toman to USD

  const createPayment = async () => {
    setLoading(true);
    try {
      // This would call your NowPayments edge function
      const response = await fetch('/api/nowpayments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_amount: usdAmount,
          price_currency: 'usd',
          pay_currency: 'usdttrc20', // USDT TRC20
          order_id: `sub_${Date.now()}`,
          order_description: `VPN Subscription - $${usdAmount}`
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setInvoice(data.invoice);
        // Start polling for payment status
        pollPaymentStatus(data.invoice.payment_id);
      } else {
        throw new Error(data.error || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Crypto payment error:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در ایجاد پرداخت کریپتو' : 'Failed to create crypto payment',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = async (paymentId: string) => {
    const maxAttempts = 60; // 5 minutes of polling
    let attempts = 0;

    const poll = setInterval(async () => {
      attempts++;
      try {
        const response = await fetch(`/api/nowpayments/status/${paymentId}`);
        const data = await response.json();
        
        setPaymentStatus(data.payment_status);
        
        if (data.payment_status === 'finished') {
          clearInterval(poll);
          onPaymentSuccess(paymentId);
        } else if (data.payment_status === 'failed' || attempts >= maxAttempts) {
          clearInterval(poll);
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    }, 5000); // Check every 5 seconds
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: language === 'fa' ? 'کپی شد' : 'Copied',
      description: language === 'fa' ? 'آدرس کپی شد' : 'Address copied',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Badge variant="secondary">{language === 'fa' ? 'در انتظار' : 'Waiting'}</Badge>;
      case 'confirming':
        return <Badge variant="default">{language === 'fa' ? 'تأیید' : 'Confirming'}</Badge>;
      case 'finished':
        return <Badge variant="default" className="bg-green-500">{language === 'fa' ? 'تکمیل' : 'Completed'}</Badge>;
      case 'failed':
        return <Badge variant="destructive">{language === 'fa' ? 'ناموفق' : 'Failed'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!invoice) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ₿ {language === 'fa' ? 'پرداخت کریپتو' : 'Crypto Payment'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-2">
              ${usdAmount} USD
            </div>
            <p className="text-muted-foreground">
              {language === 'fa' ? 
                'پرداخت با ارزهای دیجیتال (USDT/BTC/ETH)' : 
                'Pay with cryptocurrencies (USDT/BTC/ETH)'
              }
            </p>
          </div>

          <Button 
            onClick={createPayment}
            disabled={loading || isSubmitting}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 mr-2 animate-spin" />
                {language === 'fa' ? 'ایجاد پرداخت...' : 'Creating Payment...'}
              </>
            ) : (
              language === 'fa' ? 'ایجاد پرداخت کریپتو' : 'Create Crypto Payment'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              ₿ {language === 'fa' ? 'پرداخت کریپتو' : 'Crypto Payment'}
            </span>
            {getStatusBadge(paymentStatus)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">
                {language === 'fa' ? 'مبلغ:' : 'Amount:'}
              </span>
              <p className="font-medium">{invoice.pay_amount} {invoice.pay_currency.toUpperCase()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">
                {language === 'fa' ? 'شبکه:' : 'Network:'}
              </span>
              <p className="font-medium">TRC20</p>
            </div>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground">
              {language === 'fa' ? 'آدرس پرداخت' : 'Payment Address'}
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="bg-muted px-3 py-2 rounded font-mono text-sm flex-1 break-all">
                {invoice.pay_address}
              </code>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => copyToClipboard(invoice.pay_address)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={() => window.open(invoice.payment_url, '_blank')}
              className="flex-1"
              variant="outline"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {language === 'fa' ? 'باز کردن کیف پول' : 'Open Wallet'}
            </Button>
            <Button 
              onClick={() => window.open(invoice.invoice_url, '_blank')}
              className="flex-1"
              variant="outline"
            >
              <QrCode className="w-4 h-4 mr-2" />
              {language === 'fa' ? 'QR کد' : 'QR Code'}
            </Button>
          </div>

          {paymentStatus === 'waiting' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
              <Loader className="w-6 h-6 mx-auto mb-2 animate-spin text-blue-600" />
              <p className="text-sm text-blue-600">
                {language === 'fa' ? 
                  'در انتظار تأیید پرداخت...' : 
                  'Waiting for payment confirmation...'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CryptoPaymentForm;
