import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, Zap } from 'lucide-react';
import { PanelUserCreationService } from '@/services/panelUserCreationService';
import { supabase } from '@/integrations/supabase/client';

interface FreeTrialDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

const FreeTrialDialog: React.FC<FreeTrialDialogProps> = ({ isOpen, onClose, onSuccess }) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    username: '',
    mobile: ''
  });

  // Load available plans when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      loadAvailablePlans();
    }
  }, [isOpen]);

  const loadAvailablePlans = async () => {
    try {
      const { data: plans, error } = await supabase
        .from('subscription_plans')
        .select(`
          *,
          plan_panel_mappings!inner(
            panel_id,
            is_primary,
            panel_servers!inner(
              id,
              name,
              type,
              is_active,
              health_status
            )
          )
        `)
        .eq('is_active', true)
        .eq('is_visible', true);

      if (error) {
        console.error('FREE_TRIAL: Error loading plans:', error);
        return;
      }

      console.log('FREE_TRIAL: Available plans loaded:', plans?.length || 0);
      setAvailablePlans(plans || []);
      
      // Auto-select first available plan
      if (plans && plans.length > 0) {
        setSelectedPlan(plans[0].id);
      }
    } catch (error) {
      console.error('FREE_TRIAL: Failed to load plans:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.mobile.trim() || !selectedPlan) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'لطفاً تمام فیلدها را پر کنید' : 
          'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('FREE_TRIAL: Starting free trial creation with centralized service');
      
      // Generate unique username
      const timestamp = Date.now();
      const uniqueUsername = `${formData.username}_trial_${timestamp}`;
      
      const result = await PanelUserCreationService.createFreeTrial(
        uniqueUsername,
        selectedPlan, // Use selected plan ID
        1, // 1 GB for free trial
        1  // 1 day for free trial
      );

      console.log('FREE_TRIAL: Creation result:', result);

      if (result.success && result.data) {
        toast({
          title: language === 'fa' ? 'موفقیت!' : 'Success!',
          description: language === 'fa' ? 
            'تست رایگان شما آماده است!' : 
            'Your free trial is ready!',
        });

        onSuccess({
          username: result.data.username,
          subscription_url: result.data.subscription_url,
          expire: result.data.expire,
          data_limit: result.data.data_limit,
          panel_name: result.data.panel_name,
          panel_type: result.data.panel_type
        });
        
        onClose();
        
        // Reset form
        setFormData({ username: '', mobile: '' });
        setSelectedPlan('');
      } else {
        console.error('FREE_TRIAL: Creation failed:', result.error);
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: result.error || (language === 'fa' ? 
            'خطا در ایجاد تست رایگان' : 
            'Failed to create free trial'),
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('FREE_TRIAL: Unexpected error:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: error.message || (language === 'fa' ? 
          'خطا در ایجاد تست رایگان' : 
          'Failed to create free trial'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-600">
            <Zap className="w-5 h-5" />
            {language === 'fa' ? 'تست رایگان' : 'Free Trial'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="plan">
              {language === 'fa' ? 'انتخاب پلن' : 'Select Plan'}
            </Label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'fa' ? 'انتخاب پلن' : 'Select Plan'} />
              </SelectTrigger>
              <SelectContent>
                {availablePlans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {language === 'fa' ? plan.name_fa : plan.name_en}
                    {plan.plan_panel_mappings && plan.plan_panel_mappings.length > 0 && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({plan.plan_panel_mappings[0].panel_servers.name})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="username">
              {language === 'fa' ? 'نام کاربری' : 'Username'}
            </Label>
            <Input
              id="username"
              type="text"
              placeholder={language === 'fa' ? 'نام کاربری خود را وارد کنید' : 'Enter your username'}
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              required
            />
          </div>
          
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

          <div className="bg-blue-50 p-3 rounded-lg text-sm">
            <p className="text-blue-800">
              {language === 'fa' ? 
                '🎉 تست رایگان: ۱ گیگابایت برای ۱ روز' : 
                '🎉 Free Trial: 1 GB for 1 day'
              }
            </p>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              {language === 'fa' ? 'انصراف' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || !selectedPlan || availablePlans.length === 0}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {language === 'fa' ? 'شروع تست' : 'Start Trial'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FreeTrialDialog;
