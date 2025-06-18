
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Building2, Coins } from 'lucide-react';
import ZarinpalTestButton from '@/components/ZarinpalTestButton';

export type PaymentMethod = 'zarinpal' | 'manual' | 'nowpayments' | 'stripe';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  amount: number;
}

const PaymentMethodSelector = ({ selectedMethod, onMethodChange, amount }: PaymentMethodSelectorProps) => {
  const { language } = useLanguage();

  const paymentMethods = [
    {
      id: 'zarinpal' as PaymentMethod,
      nameEn: 'Zarinpal',
      nameFa: 'زرین‌پال',
      descriptionEn: 'Pay with Iranian cards',
      descriptionFa: 'پرداخت با کارت‌های ایرانی',
      icon: CreditCard,
      currency: 'IRR',
      logo: '💳',
      disabled: true
    },
    {
      id: 'manual' as PaymentMethod,
      nameEn: 'Manual Bank Transfer',
      nameFa: 'کارت به کارت',
      descriptionEn: 'Manual card-to-card transfer',
      descriptionFa: 'انتقال دستی کارت به کارت',
      icon: Building2,
      currency: 'IRR',
      logo: '🏦',
      disabled: false
    },
    {
      id: 'nowpayments' as PaymentMethod,
      nameEn: 'Crypto Payment',
      nameFa: 'پرداخت کریپتو',
      descriptionEn: 'Pay with USDT/BTC/ETH',
      descriptionFa: 'پرداخت با ارز دیجیتال',
      icon: Coins,
      currency: 'USD',
      logo: '₿',
      disabled: false
    },
    {
      id: 'stripe' as PaymentMethod,
      nameEn: 'Card Payment',
      nameFa: 'پرداخت کارتی',
      descriptionEn: 'Visa/Mastercard (USD)',
      descriptionFa: 'ویزا/مسترکارت (دلار)',
      icon: CreditCard,
      currency: 'USD',
      logo: '💎',
      disabled: false
    }
  ];

  const formatAmount = (method: PaymentMethod) => {
    if (method === 'nowpayments' || method === 'stripe') {
      const usdAmount = Math.ceil(amount / 60000); // Convert Toman to USD (approximate rate)
      return `$${usdAmount}`;
    }
    return `${amount.toLocaleString()} ${language === 'fa' ? 'تومان' : 'Toman'}`;
  };

  // Auto-select manual payment if zarinpal was selected but is now disabled
  React.useEffect(() => {
    if (selectedMethod === 'zarinpal') {
      onMethodChange('manual');
    }
  }, [selectedMethod, onMethodChange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {language === 'fa' ? 'روش پرداخت' : 'Payment Method'}
        </h3>
        <ZarinpalTestButton />
      </div>
      
      <RadioGroup value={selectedMethod} onValueChange={onMethodChange}>
        <div className="grid gap-3">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const isDisabled = method.disabled;
            
            return (
              <div key={method.id}>
                <Label
                  htmlFor={method.id}
                  className={`cursor-pointer ${isDisabled ? 'cursor-not-allowed' : ''}`}
                >
                  <Card className={`transition-all duration-200 ${
                    isDisabled 
                      ? 'opacity-50 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' 
                      : 'hover:shadow-md'
                  } ${
                    selectedMethod === method.id && !isDisabled
                      ? 'ring-2 ring-primary border-primary' 
                      : 'border-border'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <RadioGroupItem 
                          value={method.id} 
                          id={method.id} 
                          disabled={isDisabled}
                          className={isDisabled ? 'opacity-50' : ''}
                        />
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`text-2xl ${isDisabled ? 'grayscale' : ''}`}>
                            {method.logo}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${isDisabled ? 'text-gray-400' : ''}`}>
                                {language === 'fa' ? method.nameFa : method.nameEn}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {method.currency}
                              </Badge>
                              {isDisabled && (
                                <Badge variant="destructive" className="text-xs">
                                  {language === 'fa' ? 'غیرفعال' : 'Disabled'}
                                </Badge>
                              )}
                            </div>
                            <p className={`text-sm ${isDisabled ? 'text-gray-400' : 'text-muted-foreground'}`}>
                              {language === 'fa' ? method.descriptionFa : method.descriptionEn}
                              {isDisabled && (
                                <span className="block text-xs mt-1">
                                  {language === 'fa' 
                                    ? 'موقتاً غیرفعال - لطفاً روش دیگری انتخاب کنید' 
                                    : 'Temporarily disabled - please choose another method'
                                  }
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`font-bold ${isDisabled ? 'text-gray-400' : 'text-primary'}`}>
                              {formatAmount(method.id)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Label>
              </div>
            );
          })}
        </div>
      </RadioGroup>
    </div>
  );
};

export default PaymentMethodSelector;
