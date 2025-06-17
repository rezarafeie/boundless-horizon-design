
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DiscountCode } from '@/types/subscription';

interface DiscountFieldProps {
  onDiscountApply: (discount: DiscountCode | null) => void;
  appliedDiscount: DiscountCode | null;
}

interface DatabaseDiscountCode {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  description: string;
  is_active: boolean;
  expires_at: string | null;
  current_usage_count: number;
  total_usage_limit: number | null;
  usage_limit_per_user: number | null;
  applicable_plans: any;
}

const DiscountField = ({ onDiscountApply, appliedDiscount }: DiscountFieldProps) => {
  const { language } = useLanguage();
  const [discountCode, setDiscountCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  const { data: availableDiscounts, isLoading: discountsLoading } = useQuery({
    queryKey: ['discount-codes'],
    queryFn: async () => {
      console.log('=== DISCOUNTS: Fetching discount codes from database ===');
      
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('created_at', { ascending: false });
      
      console.log('DISCOUNTS: Database query result:', { data, error });
      
      if (error) {
        console.error('DISCOUNTS: Error fetching discount codes:', error);
        throw error;
      }
      
      // Convert to DiscountCode format
      return (data as DatabaseDiscountCode[]).map(dbDiscount => ({
        code: dbDiscount.code,
        percentage: dbDiscount.discount_type === 'percentage' ? dbDiscount.discount_value : 0,
        description: dbDiscount.description || (
          language === 'fa' ? 
            `تخفیف ${dbDiscount.discount_value}${dbDiscount.discount_type === 'percentage' ? ' درصدی' : ' تومانی'}` :
            `${dbDiscount.discount_value}${dbDiscount.discount_type === 'percentage' ? '% Discount' : ' Toman Discount'}`
        )
      })) as DiscountCode[];
    },
    retry: 1
  });

  const validateDiscount = async () => {
    setIsValidating(true);
    setError('');

    if (!availableDiscounts) {
      setError(language === 'fa' ? 'خطا در بارگذاری کدهای تخفیف' : 'Error loading discount codes');
      setIsValidating(false);
      return;
    }

    const foundDiscount = availableDiscounts.find(
      d => d.code.toLowerCase() === discountCode.toLowerCase()
    );

    // Check if discount is valid and not expired
    if (foundDiscount) {
      try {
        // Check usage limits and expiry in database
        const { data: dbDiscount, error } = await supabase
          .from('discount_codes')
          .select('*')
          .eq('code', foundDiscount.code)
          .eq('is_active', true)
          .single();

        if (error || !dbDiscount) {
          setError(language === 'fa' ? 'کد تخفیف نامعتبر است' : 'Invalid discount code');
          onDiscountApply(null);
          setIsValidating(false);
          return;
        }

        // Check expiry
        if (dbDiscount.expires_at && new Date(dbDiscount.expires_at) < new Date()) {
          setError(language === 'fa' ? 'کد تخفیف منقضی شده است' : 'Discount code has expired');
          onDiscountApply(null);
          setIsValidating(false);
          return;
        }

        // Check total usage limit
        if (dbDiscount.total_usage_limit && dbDiscount.current_usage_count >= dbDiscount.total_usage_limit) {
          setError(language === 'fa' ? 'کد تخفیف استفاده شده است' : 'Discount code has been used up');
          onDiscountApply(null);
          setIsValidating(false);
          return;
        }

        // Valid discount
        onDiscountApply(foundDiscount);
        setError('');
      } catch (err) {
        console.error('Error validating discount:', err);
        setError(language === 'fa' ? 'خطا در اعتبارسنجی کد تخفیف' : 'Error validating discount code');
        onDiscountApply(null);
      }
    } else {
      setError(language === 'fa' ? 'کد تخفیف نامعتبر است' : 'Invalid discount code');
      onDiscountApply(null);
    }

    setIsValidating(false);
  };

  const removeDiscount = () => {
    setDiscountCode('');
    setError('');
    onDiscountApply(null);
  };

  if (discountsLoading) {
    return (
      <div className="space-y-3">
        <Label htmlFor="discount">
          {language === 'fa' ? 'کد تخفیف (اختیاری)' : 'Discount Code (Optional)'}
        </Label>
        <div className="flex items-center gap-2 p-3 rounded-lg border">
          <Loader className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {language === 'fa' ? 'در حال بارگذاری کدهای تخفیف...' : 'Loading discount codes...'}
          </span>
        </div>
      </div>
    );
  }

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
                {appliedDiscount.percentage}% {language === 'fa' ? 'تخفیف' : 'OFF'}
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
            disabled={!discountCode.trim() || isValidating || discountsLoading}
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
