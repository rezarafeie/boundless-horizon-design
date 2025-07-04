
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
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1); // Step 1: Email/Phone, Step 2: Username/Plan
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    username: '',
    mobile: ''
  });

  // Load available plans when moving to step 2
  const resetDialog = () => {
    setCurrentStep(1);
    setFormData({ email: '', phone: '', username: '', mobile: '' });
    setSelectedPlan('');
    setAvailablePlans([]);
    setDebugInfo(null);
  };

  // Reset when dialog closes
  React.useEffect(() => {
    if (!isOpen) {
      resetDialog();
    }
  }, [isOpen]);

  const loadAvailablePlans = async () => {
    setIsLoadingPlans(true);
    try {
      console.log('FREE_TRIAL: Loading plans with STRICT panel assignment requirements...');
      
      const { data: plans, error } = await supabase
        .from('subscription_plans')
        .select(`
          *,
          panel_servers!inner(
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
        .not('assigned_panel_id', 'is', null)

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
    } finally {
      setIsLoadingPlans(false);
    }
  };

  // Handle step 1 submission (email/phone)
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(\+98|0)?9\d{9}$/;
    
    if (!formData.email.trim() || !formData.phone.trim()) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'لطفاً ایمیل و شماره تلفن را وارد کنید' : 
          'Please enter email and phone number',
        variant: 'destructive',
      });
      return;
    }
    
    if (!emailRegex.test(formData.email)) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'لطفاً ایمیل معتبر وارد کنید' : 
          'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }
    
    if (!phoneRegex.test(formData.phone)) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'لطفاً شماره موبایل معتبر وارد کنید' : 
          'Please enter a valid mobile number',
        variant: 'destructive',
      });
      return;
    }
    
    setCurrentStep(2);
    loadAvailablePlans();
  };

  // Handle step 2 submission (plan selection only)
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPlan) {
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 
          'لطفاً پلن را انتخاب کنید' : 
          'Please select a plan',
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
      
      // Auto-generate unique username with bnets_test format (6 digits)
      const randomDigits = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
      const uniqueUsername = `bnets_test_${randomDigits}`;
      
      // Use STRICT plan-to-panel binding with email and phone
      const result = await PanelUserCreationService.createFreeTrial(
        uniqueUsername,
        selectedPlan, // UUID with STRICT panel assignment
        1, // 1 GB for free trial
        7, // 7 days for free trial
        formData.email,
        formData.phone
      );

      console.log('FREE_TRIAL: STRICT creation result:', result);

      if (result.success && result.data) {
        console.log('FREE_TRIAL: STRICT SUCCESS - calling onSuccess callback');
        
        // Send webhook notification for new test user
        try {
          console.log('FREE_TRIAL: Sending webhook notification');
          await supabase.functions.invoke('send-webhook-notification', {
            body: {
              type: 'new_test_user',
              test_user_id: result.data.username,
              username: result.data.username,
              mobile: formData.phone,
              email: formData.email,
              created_at: new Date().toISOString()
            }
          });
        } catch (webhookError) {
          console.error('FREE_TRIAL: Failed to send webhook notification:', webhookError);
          // Don't fail the trial creation for webhook issues
        }
        
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
        setFormData({ email: '', phone: '', username: '', mobile: '' });
        setSelectedPlan('');
        setCurrentStep(1);
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
            <span className="text-sm text-gray-500">
              ({currentStep}/2)
            </span>
          </DialogTitle>
        </DialogHeader>

        {currentStep === 1 ? (
          // Step 1: Email and Phone Collection
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <div>
              <Label htmlFor="email">
                {language === 'fa' ? 'آدرس ایمیل' : 'Email Address'}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={language === 'fa' ? 'example@gmail.com' : 'example@gmail.com'}
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="phone">
                {language === 'fa' ? 'شماره موبایل' : 'Mobile Number'}
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder={language === 'fa' ? '09123456789' : '09123456789'}
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                required
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="text-blue-800">
                {language === 'fa' ? 
                  '🎉 تست رایگان: ۱ گیگابایت برای ۷ روز' : 
                  '🎉 Free Trial: 1 GB for 7 days'
                }
              </p>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                {language === 'fa' ? 'انصراف' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                className="flex-1"
              >
                {language === 'fa' ? 'ادامه' : 'Continue'}
              </Button>
            </div>
          </form>
        ) : (
          // Step 2: Plan Selection Only
          <form onSubmit={handleStep2Submit} className="space-y-6">
            <div>
              <Label className="text-base font-semibold">
                {language === 'fa' ? 'انتخاب پلن' : 'Select Plan'}
              </Label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {language === 'fa' ? 'پلن مورد نظر خود را انتخاب کنید' : 'Choose your preferred plan'}
              </p>
              
              {/* Card-based Plan Selection */}
              <div className="grid gap-3">
                {isLoadingPlans ? (
                  // Loading skeleton
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
                            <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                            <span>•</span>
                            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                          </div>
                        </div>
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
                      </div>
                    </div>
                  ))
                ) : (
                  availablePlans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                        selectedPlan === plan.id
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">
                              {language === 'fa' ? plan.name_fa : plan.name_en}
                            </h3>
                            <div className={`w-3 h-3 rounded-full ${
                              plan.panel_servers.health_status === 'online' ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <span>🌍 {plan.panel_servers.name}</span>
                            <span>•</span>
                            <span className={`font-medium ${
                              plan.panel_servers.health_status === 'online' 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {plan.panel_servers.health_status === 'online' 
                                ? (language === 'fa' ? 'آنلاین' : 'Online')
                                : (language === 'fa' ? 'آفلاین' : 'Offline')
                              }
                            </span>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                          selectedPlan === plan.id
                            ? 'border-primary bg-primary'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {selectedPlan === plan.id && (
                            <div className="w-full h-full rounded-full bg-white scale-50" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
              
              {isLoadingPlans && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {language === 'fa' ? 'در حال بارگذاری پلن‌ها...' : 'Loading plans...'}
                  </p>
                </div>
              )}
              
              {availablePlans.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    {language === 'fa' ? 'هیچ پلن فعالی با پنل اختصاصی یافت نشد' : 'No active plans with assigned panels found'}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-green-50 p-3 rounded-lg text-sm">
              <p className="text-green-800">
                {language === 'fa' ? 
                  `✅ ایمیل: ${formData.email} | موبایل: ${formData.phone}` : 
                  `✅ Email: ${formData.email} | Mobile: ${formData.phone}`
                }
              </p>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="text-blue-800">
                {language === 'fa' ? 
                  '🎉 تست رایگان: ۱ گیگابایت برای ۷ روز' : 
                  '🎉 Free Trial: 1 GB for 7 days'
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
                onClick={() => setCurrentStep(1)}
                className="flex-1"
                disabled={isLoading}
              >
                {language === 'fa' ? 'قبلی' : 'Back'}
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading || isLoadingPlans || !selectedPlan || availablePlans.length === 0}
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {language === 'fa' ? 'شروع تست' : 'Start Trial'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FreeTrialDialog;
