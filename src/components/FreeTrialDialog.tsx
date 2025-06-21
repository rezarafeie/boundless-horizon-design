
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Gift } from 'lucide-react';
import FreeTrialResult from './FreeTrialResult';

interface FreeTrialDialogProps {
  children: React.ReactNode;
}

const FreeTrialDialog = ({ children }: FreeTrialDialogProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    mobile: '',
    reason: ''
  });
  const [result, setResult] = useState<any>(null);

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

    setIsLoading(true);

    try {
      console.log('=== FREE TRIAL: Starting free trial creation ===');
      
      // Generate unique username for free trial
      const username = `trial_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      // Always use Lite plan for free trials (hardcoded to Marzban)
      const { data: litePlan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('plan_id', 'lite')
        .eq('is_active', true)
        .eq('is_visible', true)
        .single();

      if (planError || !litePlan) {
        console.error('FREE TRIAL: Failed to get Lite plan:', planError);
        throw new Error('Lite plan not available for free trial');
      }

      console.log('FREE TRIAL: Using Lite plan for free trial:', {
        id: litePlan.plan_id,
        name: litePlan.name_en,
        api_type: litePlan.api_type
      });

      // Verify it's Marzban API type
      if (litePlan.api_type !== 'marzban') {
        console.error('FREE TRIAL: Lite plan is not configured for Marzban');
        throw new Error('Lite plan must use Marzban API for free trials');
      }

      // Create subscription record first
      const subscriptionData = {
        mobile: formData.mobile,
        data_limit_gb: 2, // 2GB for free trial
        duration_days: 7, // 7 days for free trial
        price_toman: 0, // Free trial
        status: 'pending',
        username: username,
        notes: `Free trial - Lite plan - Reason: ${formData.reason || 'N/A'}`,
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

      // Create VPN user using Marzban edge function (hardcoded for free trials)
      console.log('FREE TRIAL: Creating VPN user using Marzban API');
      
      const vpnUserRequest = {
        username: username,
        dataLimitGB: 2,
        durationDays: 7,
        notes: `Free trial - Mobile: ${formData.mobile}, Reason: ${formData.reason || 'N/A'}`
      };
      
      console.log('FREE TRIAL: Marzban request payload:', vpnUserRequest);
      
      const { data: vpnResponse, error: vpnError } = await supabase.functions.invoke('marzban-create-user', {
        body: vpnUserRequest
      });
      
      if (vpnError) {
        console.error('FREE TRIAL: Marzban VPN creation failed:', vpnError);
        throw new Error(`Marzban service error: ${vpnError.message}`);
      }

      console.log('FREE TRIAL: VPN response from Marzban:', vpnResponse);

      if (!vpnResponse?.success) {
        console.error('FREE TRIAL: VPN user creation failed:', vpnResponse?.error);
        throw new Error(`Failed to create VPN user: ${vpnResponse?.error || 'Unknown error'}`);
      }

      console.log('FREE TRIAL: VPN user created successfully:', vpnResponse.data);

      // Update subscription with VPN details
      const updateData = {
        subscription_url: vpnResponse.data.subscription_url,
        status: 'active',
        marzban_user_created: true,
        expire_at: vpnResponse.data.expire ? new Date(vpnResponse.data.expire * 1000).toISOString() : null
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
        username: vpnResponse.data.username,
        subscription_url: vpnResponse.data.subscription_url,
        planName: language === 'fa' ? litePlan.name_fa : litePlan.name_en,
        apiType: 'marzban',
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
    setFormData({ mobile: '', reason: '' });
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
                  '🎁 اشتراک رایگان: 2 گیگابایت حجم برای 7 روز (پلن لایت)' : 
                  '🎁 Free Trial: 2GB data for 7 days (Lite Plan)'
                }
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
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
