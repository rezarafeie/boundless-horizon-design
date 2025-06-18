
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  createZarinpalContract, 
  getUserContracts, 
  cancelZarinpalContract,
  getZarinpalSignature 
} from '@/utils/zarinpalContractUtils';

interface ZarinpalContractManagerProps {
  mobile: string;
  onContractReady?: (authority: string, signature: string) => void;
}

const ZarinpalContractManager = ({ mobile, onContractReady }: ZarinpalContractManagerProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    maxDailyCount: 10,
    maxMonthlyCount: 100,
    maxAmount: 1000000, // 10,000 Toman in Rial
    durationDays: 365
  });

  useEffect(() => {
    loadUserContracts();
  }, [mobile]);

  useEffect(() => {
    // Check URL parameters for contract callback
    const urlParams = new URLSearchParams(window.location.search);
    const paymanAuthority = urlParams.get('payman_authority');
    const status = urlParams.get('status');

    if (paymanAuthority && status === 'OK') {
      handleContractSigned(paymanAuthority);
    } else if (paymanAuthority && status === 'NOK') {
      toast({
        title: language === 'fa' ? 'لغو قرارداد' : 'Contract Cancelled',
        description: language === 'fa' ? 'قرارداد پرداخت مستقیم لغو شد' : 'Direct payment contract was cancelled',
        variant: 'destructive'
      });
    }
  }, []);

  const loadUserContracts = async () => {
    setLoading(true);
    try {
      const { data, error } = await getUserContracts(mobile);
      if (error) {
        console.error('Error loading contracts:', error);
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: language === 'fa' ? 'خطا در بارگذاری قراردادها' : 'Failed to load contracts',
          variant: 'destructive'
        });
      } else {
        setContracts(data || []);
      }
    } catch (error) {
      console.error('Error in loadUserContracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContractSigned = async (paymanAuthority: string) => {
    try {
      const result = await getZarinpalSignature(paymanAuthority);
      if (result.success && result.signature) {
        toast({
          title: language === 'fa' ? 'قرارداد فعال شد' : 'Contract Activated',
          description: language === 'fa' ? 'قرارداد پرداخت مستقیم با موفقیت فعال شد' : 'Direct payment contract activated successfully'
        });
        
        // Notify parent component
        if (onContractReady) {
          onContractReady(paymanAuthority, result.signature);
        }
        
        // Reload contracts
        loadUserContracts();
      } else {
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: result.error || (language === 'fa' ? 'خطا در دریافت امضا' : 'Failed to get signature'),
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error handling contract signature:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در پردازش قرارداد' : 'Failed to process contract',
        variant: 'destructive'
      });
    }
  };

  const createContract = async () => {
    setCreating(true);
    try {
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + formData.durationDays);
      
      const result = await createZarinpalContract({
        mobile,
        expire_at: expireDate.toISOString().slice(0, 19).replace('T', ' '),
        max_daily_count: formData.maxDailyCount,
        max_monthly_count: formData.maxMonthlyCount,
        max_amount: formData.maxAmount,
        callback_url: `${window.location.origin}/subscription?contract_callback=true`
      });

      if (result.success && result.payman_authority) {
        toast({
          title: language === 'fa' ? 'قرارداد ایجاد شد' : 'Contract Created',
          description: language === 'fa' ? 'در حال انتقال به صفحه بانک...' : 'Redirecting to bank page...'
        });

        // Redirect to bank selection page
        const bankCode = 'SABCIR'; // Default to Saman bank, should be user selectable
        window.location.href = `https://www.zarinpal.com/pg/StartPayman/${result.payman_authority}/${bankCode}`;
      } else {
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: result.error || (language === 'fa' ? 'خطا در ایجاد قرارداد' : 'Failed to create contract'),
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error creating contract:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در ایجاد قرارداد' : 'Failed to create contract',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const cancelContract = async (contractId: string, signature: string) => {
    try {
      const result = await cancelZarinpalContract(signature);
      if (result.success) {
        toast({
          title: language === 'fa' ? 'قرارداد لغو شد' : 'Contract Cancelled',
          description: language === 'fa' ? 'قرارداد با موفقیت لغو شد' : 'Contract cancelled successfully'
        });
        loadUserContracts();
      } else {
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: result.error || (language === 'fa' ? 'خطا در لغو قرارداد' : 'Failed to cancel contract'),
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error cancelling contract:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در لغو قرارداد' : 'Failed to cancel contract',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { 
        label: language === 'fa' ? 'در انتظار' : 'Pending', 
        variant: 'secondary' as const 
      },
      active: { 
        label: language === 'fa' ? 'فعال' : 'Active', 
        variant: 'default' as const 
      },
      cancelled: { 
        label: language === 'fa' ? 'لغو شده' : 'Cancelled', 
        variant: 'destructive' as const 
      },
      expired: { 
        label: language === 'fa' ? 'منقضی' : 'Expired', 
        variant: 'outline' as const 
      }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Active Contracts */}
      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'fa' ? 'قراردادهای پرداخت مستقیم' : 'Direct Payment Contracts'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground">
              {language === 'fa' ? 'در حال بارگذاری...' : 'Loading...'}
            </p>
          ) : contracts.length === 0 ? (
            <p className="text-center text-muted-foreground">
              {language === 'fa' ? 'هیچ قراردادی یافت نشد' : 'No contracts found'}
            </p>
          ) : (
            <div className="space-y-4">
              {contracts.map((contract) => (
                <div key={contract.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(contract.status)}
                      <span className="text-sm text-muted-foreground">
                        {contract.payman_authority}
                      </span>
                    </div>
                    {contract.status === 'active' && contract.signature && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelContract(contract.id, contract.signature)}
                        className="text-destructive hover:text-destructive"
                      >
                        {language === 'fa' ? 'لغو' : 'Cancel'}
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">
                        {language === 'fa' ? 'حداکثر روزانه:' : 'Max Daily:'}
                      </span>
                      <span className="ml-2">{contract.max_daily_count}</span>
                    </div>
                    <div>
                      <span className="font-medium">
                        {language === 'fa' ? 'حداکثر ماهانه:' : 'Max Monthly:'}
                      </span>
                      <span className="ml-2">{contract.max_monthly_count}</span>
                    </div>
                    <div>
                      <span className="font-medium">
                        {language === 'fa' ? 'حداکثر مبلغ:' : 'Max Amount:'}
                      </span>
                      <span className="ml-2">{(contract.max_amount / 10).toLocaleString()} {language === 'fa' ? 'تومان' : 'Toman'}</span>
                    </div>
                    <div>
                      <span className="font-medium">
                        {language === 'fa' ? 'انقضا:' : 'Expires:'}
                      </span>
                      <span className="ml-2">{new Date(contract.expire_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {contract.status === 'active' && onContractReady && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => onContractReady(contract.payman_authority, contract.signature)}
                    >
                      {language === 'fa' ? 'استفاده از این قرارداد' : 'Use This Contract'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create New Contract */}
      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'fa' ? 'ایجاد قرارداد جدید' : 'Create New Contract'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxDailyCount">
                {language === 'fa' ? 'حداکثر تراکنش روزانه' : 'Max Daily Transactions'}
              </Label>
              <Input
                id="maxDailyCount"
                type="number"
                value={formData.maxDailyCount}
                onChange={(e) => setFormData(prev => ({ ...prev, maxDailyCount: parseInt(e.target.value) || 0 }))}
                min="1"
                max="100"
              />
            </div>
            <div>
              <Label htmlFor="maxMonthlyCount">
                {language === 'fa' ? 'حداکثر تراکنش ماهانه' : 'Max Monthly Transactions'}
              </Label>
              <Input
                id="maxMonthlyCount"
                type="number"
                value={formData.maxMonthlyCount}
                onChange={(e) => setFormData(prev => ({ ...prev, maxMonthlyCount: parseInt(e.target.value) || 0 }))}
                min="1"
                max="1000"
              />
            </div>
            <div>
              <Label htmlFor="maxAmount">
                {language === 'fa' ? 'حداکثر مبلغ (تومان)' : 'Max Amount (Toman)'}
              </Label>
              <Input
                id="maxAmount"
                type="number"
                value={formData.maxAmount / 10}
                onChange={(e) => setFormData(prev => ({ ...prev, maxAmount: (parseInt(e.target.value) || 0) * 10 }))}
                min="1000"
                max="10000000"
              />
            </div>
            <div>
              <Label htmlFor="durationDays">
                {language === 'fa' ? 'مدت قرارداد (روز)' : 'Contract Duration (Days)'}
              </Label>
              <Input
                id="durationDays"
                type="number"
                value={formData.durationDays}
                onChange={(e) => setFormData(prev => ({ ...prev, durationDays: parseInt(e.target.value) || 30 }))}
                min="30"
                max="365"
              />
            </div>
          </div>
          
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">
              {language === 'fa' ? 'نکات مهم:' : 'Important Notes:'}
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• {language === 'fa' ? 'حداقل مدت قرارداد ۳۰ روز است' : 'Minimum contract duration is 30 days'}</li>
              <li>• {language === 'fa' ? 'پس از ایجاد قرارداد، به صفحه بانک منتقل می‌شوید' : 'After creating contract, you will be redirected to bank page'}</li>
              <li>• {language === 'fa' ? 'قرارداد پس از امضا فعال می‌شود' : 'Contract becomes active after signing'}</li>
            </ul>
          </div>

          <Button
            onClick={createContract}
            disabled={creating}
            className="w-full"
            size="lg"
          >
            {creating ? (
              language === 'fa' ? 'در حال ایجاد...' : 'Creating...'
            ) : (
              language === 'fa' ? 'ایجاد قرارداد پرداخت مستقیم' : 'Create Direct Payment Contract'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ZarinpalContractManager;
