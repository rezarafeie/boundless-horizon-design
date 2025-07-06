
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, Smartphone, Bitcoin, FileText } from 'lucide-react';

export type PaymentMethod = 'zarinpal' | 'stripe' | 'crypto' | 'manual';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  mobile?: string;
  amount?: number; // Amount in Toman
}

const paymentMethods = [
  {
    id: 'zarinpal' as PaymentMethod,
    titleEn: 'ZarinPal',
    titleFa: 'زرین‌پال',
    descriptionEn: 'Pay with Iranian bank cards • Fast automatic delivery',
    descriptionFa: 'پرداخت با کارت‌های بانکی ایرانی • تحویل فوری خودکار',
    icon: CreditCard,
    available: true
  },
  {
    id: 'stripe' as PaymentMethod,
    titleEn: 'Stripe',
    titleFa: 'استرایپ',
    descriptionEn: 'Pay with international credit cards • Instant service activation',
    descriptionFa: 'پرداخت با کارت‌های اعتباری بین‌المللی • فعال‌سازی فوری سرویس',
    icon: CreditCard,
    available: true
  },
  {
    id: 'crypto' as PaymentMethod,
    titleEn: 'Cryptocurrency',
    titleFa: 'ارز دیجیتال',
    descriptionEn: 'Pay with Bitcoin, Ethereum, etc. • Quick automated delivery',
    descriptionFa: 'پرداخت با بیت کوین، اتریوم و غیره • تحویل سریع خودکار',
    icon: Bitcoin,
    available: true
  },
  {
    id: 'manual' as PaymentMethod,
    titleEn: 'Bank Transfer',
    titleFa: 'کارت به کارت',
    descriptionEn: 'Bank transfer or cash deposit',
    descriptionFa: 'انتقال بانکی یا واریز نقدی',
    icon: FileText,
    available: true
  }
];

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onMethodChange,
  mobile,
  amount = 0
}) => {
  const { language } = useLanguage();
  
  // Convert Toman to USD (roughly 1 USD = 60,000 Toman)
  const usdAmount = amount / 60000;
  const isCryptoDisabled = usdAmount < 10;

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">
        {language === 'fa' ? 'روش پرداخت' : 'Payment Method'}
      </Label>
      
      <RadioGroup
        value={selectedMethod}
        onValueChange={onMethodChange}
        className="grid grid-cols-1 gap-4"
        dir={language === 'fa' ? 'rtl' : 'ltr'}
      >
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          const isZarinpalDisabled = method.id === 'zarinpal' && !mobile?.trim();
          const isCryptoMethodDisabled = method.id === 'crypto' && isCryptoDisabled;
          const isMethodDisabled = !method.available || isZarinpalDisabled || isCryptoMethodDisabled;
          
          return (
            <div key={method.id} className={`flex items-center gap-3 ${language === 'fa' ? 'flex-row-reverse' : ''}`}>
              <RadioGroupItem 
                value={method.id} 
                id={method.id}
                disabled={isMethodDisabled}
              />
              <Label
                htmlFor={method.id}
                className={`flex-1 flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedMethod === method.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-muted/50'
                } ${isMethodDisabled ? 'opacity-50 cursor-not-allowed' : ''} ${
                  language === 'fa' ? 'flex-row-reverse text-right' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
                <div className="flex-1">
                  <div className={`font-medium ${language === 'fa' ? 'text-right' : 'text-left'}`}>
                    {language === 'fa' ? method.titleFa : method.titleEn}
                  </div>
                  <div className={`text-sm text-muted-foreground ${language === 'fa' ? 'text-right' : 'text-left'}`}>
                    {isZarinpalDisabled ? (
                      <span className="text-orange-600">
                        {language === 'fa' ? 'شماره موبایل را وارد کنید تا بتوانید از زرین‌پال استفاده کنید' : 'Enter mobile number to use ZarinPal payment'}
                      </span>
                    ) : isCryptoMethodDisabled ? (
                      <span className="text-orange-600">
                        {language === 'fa' ? 'حداقل مبلغ برای پرداخت ارز دیجیتال ۱۰ دلار است' : 'Minimum $10 required for cryptocurrency payment'}
                      </span>
                    ) : (
                      language === 'fa' ? method.descriptionFa : method.descriptionEn
                    )}
                  </div>
                </div>
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
};

export default PaymentMethodSelector;
