
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Gift } from 'lucide-react';
import FreeTrialResult from './FreeTrialResult';
import { PlanService, PlanWithPanels } from '@/services/planService';

interface FreeTrialDialogProps {
  children: React.ReactNode;
}

const FreeTrialDialog = ({ children }: FreeTrialDialogProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<PlanWithPanels[]>([]);
  const [formData, setFormData] = useState({
    mobile: '',
    reason: '',
    selectedPlanId: ''
  });
  const [result, setResult] = useState<any>(null);

  // Load available plans when dialog opens
  useEffect(() => {
    if (open) {
      loadAvailablePlans();
    }
  }, [open]);

  const loadAvailablePlans = async () => {
    try {
      console.log('FREE TRIAL: Loading available plans from admin configuration');
      const plans = await PlanService.getAvailablePlans();
      console.log('FREE TRIAL: Available plans:', plans.length);
      setAvailablePlans(plans);
      
      if (plans.length === 0) {
        toast({
          title: language === 'fa' ? 'هیچ پلنی موجود نیست' : 'No Plans Available',
          description: language === 'fa' ? 
            'هیچ پلن فعالی در سیستم یافت نشد' : 
            'No active plans found in the system',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('FREE TRIAL: Failed to load plans:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'خطا در بارگذاری پلن‌های موجود' : 
          'Failed to load available plans',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.mobile) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'شماره موبایل الزامی است' : 'Mobile number is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.selectedPlanId) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'لطفاً یک پلن انتخاب کنید' : 'Please select a plan',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('=== FREE TRIAL: Starting free trial creation ===');
      
      // Get selected plan
      const selectedPlan = availablePlans.find(p => p.id === formData.selectedPlanId);
      if (!selectedPlan) {
        throw new Error('Selected plan not found');
      }

      console.log('FREE TRIAL: Using plan:', {
        name: selectedPlan.name_en,
        apiType: PlanService.getApiType(selectedPlan),
        panelsCount: selectedPlan.panels.length
      });

      // Generate unique username for free trial
      const username = `trial_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      // Create subscription record first
      const subscriptionData = {
        mobile: formData.mobile,
        data_limit_gb: 2, // 2GB for free trial
        duration_days: 7, // 7 days for free trial
        price_toman: 0, // Free trial
        status: 'pending',
        username: username,
        notes: `Free trial - ${selectedPlan.name_en} - Reason: ${formData.reason || 'N/A'}`,
        marzban_user_created: false
      };

      console.log('FREE TRIAL: Creating subscription record:', subscriptionData);

      const { data: subscription, error: saveError } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (saveError) {
        console.error('FREE TRIAL: Failed to save subscription:', saveError);
        throw new Error(`Failed to save free trial: ${saveError.message}`);
      }

      console.log('FREE TRIAL: Subscription saved:', subscription);

      // Create VPN user using the plan's configuration
      console.log('FREE TRIAL: Creating VPN user using plan configuration');
      
      const vpnUserData = await PlanService.createSubscription(selectedPlan.id, {
        username: username,
        mobile: formData.mobile,
        dataLimitGB: 2,
        durationDays: 7,
        notes: `Free trial - Mobile: ${formData.mobile}, Reason: ${formData.reason || 'N/A'}`
      });

      console.log('FREE TRIAL: VPN user created successfully:', vpnUserData);

      // Update subscription with VPN details
      const updateData = {
        subscription_url: vpnUserData.subscription_url,
        status: 'active',
        marzban_user_created: true,
        expire_at: vpnUserData.expire ? new Date(vpnUserData.expire * 1000).toISOString() : null
      };

      const { error: updateError } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('id', subscription.id);

      if (updateError) {
        console.error('FREE TRIAL: Failed to update subscription:', updateError);
        // Don't throw here as the user was created successfully
      }

      console.log('FREE TRIAL: ✅ Process completed successfully');

      // Set result for display
      const freeTrialResult = {
        username: vpnUserData.username,
        subscription_url: vpnUserData.subscription_url,
        planName: language === 'fa' ? selectedPlan.name_fa : selectedPlan.name_en,
        apiType: PlanService.getApiType(selectedPlan),
        dataLimit: 2,
        duration: 7
      };

      setResult(freeTrialResult);

      toast({
        title: language === 'fa' ? 'موفق!' : 'Success!',
        description: language === 'fa' ? 
          'اشتراک رایگان شما ایجاد شد!' : 
          'Your free trial has been created!',
      });

    } catch (error: any) {
      console.error('FREE TRIAL: ❌ Process failed:', error);
      
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: error.message || (language === 'fa' ? 
          'خطا در ایجاد اشتراک رایگان' : 
          'Failed to create free trial'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ mobile: '', reason: '', selectedPlanId: '' });
    setResult(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-green-600" />
            {language === 'fa' ? 'درخواست اشتراک رایگان' : 'Free Trial Request'}
          </DialogTitle>
        </DialogHeader>
        
        {result ? (
          <div className="space-y-4">
            <FreeTrialResult result={result} />
            <Button 
              onClick={resetForm}
              className="w-full"
            >
              {language === 'fa' ? 'بستن' : 'Close'}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="mobile">
                {language === 'fa' ? 'شماره موبایل' : 'Mobile Number'}
              </Label>
              <Input
                id="mobile"
                type="tel"
                placeholder={language === 'fa' ? '09123456789' : '09123456789'}
                value={formData.mobile}
                onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="plan">
                {language === 'fa' ? 'انتخاب پلن' : 'Select Plan'}
              </Label>
              <Select 
                value={formData.selectedPlanId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, selectedPlanId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'fa' ? 'پلن مورد نظر را انتخاب کنید' : 'Choose your plan'} />
                </SelectTrigger>
                <SelectContent>
                  {availablePlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {language === 'fa' ? plan.name_fa : plan.name_en}
                        </span>
                        <span className="text-sm text-gray-500">
                          {plan.panels.length} panel(s) • {PlanService.getApiType(plan)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="reason">
                {language === 'fa' ? 'دلیل درخواست (اختیاری)' : 'Reason for Request (Optional)'}
              </Label>
              <Textarea
                id="reason"
                placeholder={language === 'fa' ? 
                  'لطفاً دلیل نیاز به اشتراک رایگان را بنویسید...' : 
                  'Please explain why you need a free trial...'
                }
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {language === 'fa' ? 
                  '🎁 اشتراک رایگان: 2 گیگابایت حجم برای 7 روز' : 
                  '🎁 Free Trial: 2GB data for 7 days'
                }
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || availablePlans.length === 0}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {language === 'fa' ? 'درخواست اشتراک رایگان' : 'Request Free Trial'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FreeTrialDialog;
