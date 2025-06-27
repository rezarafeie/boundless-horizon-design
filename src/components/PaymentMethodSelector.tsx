
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Coins, Receipt, Banknote } from 'lucide-react';

export type PaymentMethod = 'manual' | 'stripe' | 'nowpayments' | 'zarinpal';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  amount: number;
}

const PaymentMethodSelector = ({ selectedMethod, onMethodChange, amount }: PaymentMethodSelectorProps) => {
  const { language } = useLanguage();

  const paymentMethods = [
    {
      id: 'manual' as PaymentMethod,
      name: language === 'fa' ? 'پرداخت دستی' : 'Manual Payment',
      description: language === 'fa' ? 'پرداخت از طریق کارت به کارت' : 'Payment via card to card transfer',
      icon: Receipt,
      available: true,
    },
    {
      id: 'zarinpal' as PaymentMethod,
      name: language === 'fa' ? 'زرین‌پال' : 'Zarinpal',
      description: language === 'fa' ? 'پرداخت امن با زرین‌پال' : 'Secure payment with Zarinpal',
      icon: Banknote,
      available: true,
    },
    {
      id: 'stripe' as PaymentMethod,
      name: language === 'fa' ? 'کارت اعتباری' : 'Credit Card',
      description: language === 'fa' ? 'پرداخت با کارت اعتباری' : 'Pay with credit card',
      icon: CreditCard,
      available: true,
    },
    {
      id: 'nowpayments' as PaymentMethod,
      name: language === 'fa' ? 'ارز دیجیتال' : 'Cryptocurrency',
      description: language === 'fa' ? 'پرداخت با ارز دیجیتال' : 'Pay with cryptocurrency',
      icon: Coins,
      available: true,
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        {language === 'fa' ? 'روش پرداخت را انتخاب کنید' : 'Choose Payment Method'}
      </h3>
      
      <div className="grid gap-4 md:grid-cols-2">
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;
          
          return (
            <Card 
              key={method.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
              } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => method.available && onMethodChange(method.id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Icon className="w-4 h-4" />
                  {method.name}
                  {isSelected && <span className="text-blue-500">✓</span>}
                </CardTitle>
                <CardDescription className="text-xs">
                  {method.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-2">
                <Button 
                  variant={isSelected ? "default" : "outline"} 
                  size="sm"
                  className="w-full"
                  disabled={!method.available}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (method.available) onMethodChange(method.id);
                  }}
                >
                  {isSelected ? 
                    (language === 'fa' ? 'انتخاب شده' : 'Selected') : 
                    (language === 'fa' ? 'انتخاب' : 'Select')
                  }
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <div className="text-sm text-muted-foreground text-center">
        {language === 'fa' ? 
          `مبلغ قابل پرداخت: ${amount.toLocaleString()} تومان` : 
          `Amount to pay: ${amount.toLocaleString()} Toman`
        }
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
