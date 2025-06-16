
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DiscountCode } from '@/types/subscription';

interface DiscountFieldProps {
  onDiscountApply: (discount: DiscountCode | null) => void;
  appliedDiscount: DiscountCode | null;
}

const DiscountField = ({ onDiscountApply, appliedDiscount }: DiscountFieldProps) => {
  const { language } = useLanguage();
  const [discountCode, setDiscountCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  // Available discount codes
  const availableDiscounts: DiscountCode[] = [
    {
      code: 'bnetsrez',
      type: 'percentage',
      value: 100,
      description: language === 'fa' ? 'تخفیف ۱۰۰ درصدی' : '100% Discount'
    }
  ];

  const validateDiscount = () => {
    setIsValidating(true);
    setError('');

    const foundDiscount = availableDiscounts.find(
      d => d.code.toLowerCase() === discountCode.toLowerCase()
    );

    setTimeout(() => {
      if (foundDiscount) {
        onDiscountApply(foundDiscount);
        setError('');
      } else {
        setError(language === 'fa' ? 'کد تخفیف نامعتبر است' : 'Invalid discount code');
        onDiscountApply(null);
      }
      setIsValidating(false);
    }, 500);
  };

  const removeDiscount = () => {
    setDiscountCode('');
    setError('');
    onDiscountApply(null);
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="discount">
        {language === 'fa' ? 'کد تخفیف (اختیاری)' : 'Discount Code (Optional)'}
      </Label>
      
      {appliedDiscount ? (
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-green-800 dark:text-green-200 font-medium">
                {appliedDiscount.code}
              </span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {appliedDiscount.value}% {language === 'fa' ? 'تخفیف' : 'OFF'}
              </Badge>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeDiscount}
              className="text-green-600 hover:text-green-800"
            >
              {language === 'fa' ? 'حذف' : 'Remove'}
            </Button>
          </div>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            {appliedDiscount.description}
          </p>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            id="discount"
            type="text"
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value)}
            placeholder={language === 'fa' ? 'کد تخفیف را وارد کنید' : 'Enter discount code'}
            className={error ? 'border-red-500' : ''}
          />
          <Button
            type="button"
            variant="outline"
            onClick={validateDiscount}
            disabled={!discountCode.trim() || isValidating}
          >
            {isValidating ? (
              language === 'fa' ? 'بررسی...' : 'Checking...'
            ) : (
              language === 'fa' ? 'اعمال' : 'Apply'
            )}
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
};

export default DiscountField;
