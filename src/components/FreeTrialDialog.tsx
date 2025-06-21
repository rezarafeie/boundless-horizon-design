
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, Zap, AlertTriangle } from 'lucide-react';
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
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [formData, setFormData] = useState({
    username: '',
    mobile: ''
  });

  // Load available plans with STRICT panel requirements
  React.useEffect(() => {
    if (isOpen) {
      loadAvailablePlans();
    }
  }, [isOpen]);

  const loadAvailablePlans = async () => {
    try {
      console.log('FREE_TRIAL: Loading plans with STRICT panel assignment requirements...');
      
      const { data: plans, error } = await supabase
        .from('subscription_plans')
        .select(`
          *,
          panel_servers!assigned_panel_id(
            id,
            name,
            type,
            is_active,
            health_status,
            panel_url
          )
        `)
        .eq('is_active', true)
        .eq('is_visible', true)
        .not('assigned_panel_id', 'is', null); // STRICT: Only plans with assigned panels

      console.log('FREE_TRIAL: STRICT query result:', { 
        error: error?.message, 
        plansCount: plans?.length || 0,
        plans: plans?.map(p => ({
          id: p.id,
          plan_id: p.plan_id,
          name: p.name_en,
          hasAssignedPanel: !!p.panel_servers,
          panelName: p.panel_servers?.name,
          panelHealth: p.panel_servers?.health_status
        }))
      });

      if (error) {
        console.error('FREE_TRIAL: Database error loading plans with STRICT requirements:', error);
        setDebugInfo({ error: error.message, step: 'query_plans' });
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: `Database error: ${error.message}`,
          variant: 'destructive',
        });
        return;
      }

      // STRICT FILTERING: Only plans with active assigned panels
      const validPlans = (plans || []).filter(plan => {
        const hasActivePanel = plan.panel_servers && plan.panel_servers.is_active;
        if (!hasActivePanel) {
          console.warn('FREE_TRIAL: STRICT FILTER - Excluding plan without active panel:', {
            planId: plan.plan_id,
            planName: plan.name_en,
            hasPanel: !!plan.panel_servers,
            panelActive: plan.panel_servers?.is_active
          });
        }
        return hasActivePanel;
      });

      console.log('FREE_TRIAL: STRICT filtering results:', {
        totalPlans: plans?.length || 0,
        validPlans: validPlans.length,
        validPlanDetails: validPlans.map(p => ({
          id: p.id,
          plan_id: p.plan_id,
          name: p.name_en,
          panelName: p.panel_servers.name,
          panelType: p.panel_servers.type,
          panelHealth: p.panel_servers.health_status
        }))
      });

      setAvailablePlans(validPlans);
      setDebugInfo({ 
        totalPlans: validPlans.length,
        step: 'strict_plans_loaded'
      });
      
      // Auto-select first valid plan
      if (validPlans.length > 0) {
        setSelectedPlan(validPlans[0].id);
        console.log('FREE_TRIAL: Auto-selected STRICT plan:', { 
          uuid: validPlans[0].id, 
          plan_id: validPlans[0].plan_id,
          name: validPlans[0].name_en,
          assignedPanel: validPlans[0].panel_servers.name
        });
      } else {
        console.warn('FREE_TRIAL: STRICT VALIDATION - No valid plans found');
        toast({
          title: language === 'fa' ? 'هشدار' : 'Warning',
          description: language === 'fa' ? 
            'هیچ پلن فعالی با پنل اختصاصی یافت نشد' : 
            'No active plans with assigned panels found',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('FREE_TRIAL: Failed to load plans with STRICT requirements:', error);
      setDebugInfo({ error: error.message, step: 'exception' });
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'خطا در بارگذاری پلن‌ها' : 
          'Failed to load plans',
        variant: 'destructive',
      });
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

    if (availablePlans.length === 0) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'هیچ پلن فعالی با پنل اختصاصی یافت نشد' : 
          'No active plans with assigned panels available',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('FREE_TRIAL: Starting STRICT plan-to-panel free trial creation');
      console.log('FREE_TRIAL: Selected plan UUID for STRICT binding:', selectedPlan);
      
      // Generate unique username
      const timestamp = Date.now();
      const uniqueUsername = `${formData.username}_trial_${timestamp}`;
      
      // Use STRICT plan-to-panel binding
      const result = await PanelUserCreationService.createFreeTrial(
        uniqueUsername,
        selectedPlan, // UUID with STRICT panel assignment
        1, // 1 GB for free trial
        1  // 1 day for free trial
      );

      console.log('FREE_TRIAL: STRICT creation result:', result);

      if (result.success && result.data) {
        console.log('FREE_TRIAL: STRICT SUCCESS - calling onSuccess callback');
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
          panel_type: result.data.panel_type,
          panel_id: result.data.panel_id
        });
        
        onClose();
        
        // Reset form
        setFormData({ username: '', mobile: '' });
        setSelectedPlan('');
      } else {
        console.error('FREE_TRIAL: STRICT creation failed:', result.error);
        toast({
          title: language === 'fa' ? 'خطا' : 'Error',
          description: result.error || (language === 'fa' ? 
            'خطا در ایجاد تست رایگان' : 
            'Failed to create free trial'),
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('FREE_TRIAL: Unexpected error in STRICT mode:', error);
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
                    <div className="flex items-center gap-2">
                      <span>{language === 'fa' ? plan.name_fa : plan.name_en}</span>
                      <span className="text-xs text-gray-500">
                        → {plan.panel_servers.name}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${
                        plan.panel_servers.health_status === 'online' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availablePlans.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-red-600 mt-1">
                <AlertTriangle className="w-4 h-4" />
                <span>
                  {language === 'fa' ? 'هیچ پلن فعالی با پنل اختصاصی یافت نشد' : 'No active plans with assigned panels found'}
                </span>
              </div>
            )}
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

          {/* Debug info for development */}
          {debugInfo && process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-100 p-2 rounded text-xs">
              <strong>Debug:</strong> {JSON.stringify(debugInfo, null, 2)}
            </div>
          )}
          
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
