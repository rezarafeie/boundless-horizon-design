import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { VpnService, CreateVpnServiceData, VpnServicesService } from '@/services/vpnServicesService';
import { PlanService, PlanWithPanels } from '@/services/planService';

interface ServicesFormProps {
  isOpen: boolean;
  onClose: () => void;
  service?: VpnService | null;
  onSuccess: () => void;
}

export const ServicesForm = ({ isOpen, onClose, service, onSuccess }: ServicesFormProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plans, setPlans] = useState<PlanWithPanels[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CreateVpnServiceData>({
    defaultValues: {
      name: '',
      name_en: '',
      duration_days: 30,
      data_limit_gb: 10,
      price_toman: 0,
      plan_id: '',
      status: 'active'
    }
  });

  const isActive = watch('status') === 'active';

  useEffect(() => {
    if (isOpen) {
      loadPlans();
      if (service) {
        reset({
          name: service.name,
          name_en: service.name_en || '',
          duration_days: service.duration_days,
          data_limit_gb: service.data_limit_gb,
          price_toman: service.price_toman,
          plan_id: service.plan_id,
          status: service.status
        });
      } else {
        reset({
          name: '',
          name_en: '',
          duration_days: 30,
          data_limit_gb: 10,
          price_toman: 0,
          plan_id: '',
          status: 'active'
        });
      }
    }
  }, [isOpen, service, reset]);

  const loadPlans = async () => {
    setLoadingPlans(true);
    try {
      const availablePlans = await PlanService.getAvailablePlans();
      setPlans(availablePlans);
    } catch (error) {
      console.error('Failed to load plans:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' ? 'خطا در بارگذاری پلن‌ها' : 'Failed to load plans',
        variant: 'destructive'
      });
    } finally {
      setLoadingPlans(false);
    }
  };

  const onSubmit = async (data: CreateVpnServiceData) => {
    setIsSubmitting(true);
    try {
      if (service) {
        await VpnServicesService.updateService({ ...data, id: service.id });
        toast({
          title: language === 'fa' ? 'موفق' : 'Success',
          description: language === 'fa' ? 'سرویس با موفقیت بروزرسانی شد' : 'Service updated successfully'
        });
      } else {
        await VpnServicesService.createService(data);
        toast({
          title: language === 'fa' ? 'موفق' : 'Success',
          description: language === 'fa' ? 'سرویس با موفقیت ایجاد شد' : 'Service created successfully'
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save service:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: error instanceof Error ? error.message : 'Failed to save service',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {service 
              ? (language === 'fa' ? 'ویرایش سرویس' : 'Edit Service')
              : (language === 'fa' ? 'افزودن سرویس جدید' : 'Add New Service')
            }
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                {language === 'fa' ? 'نام سرویس (فارسی)' : 'Service Name (Persian)'}
              </Label>
              <Input
                id="name"
                {...register('name', { required: 'Service name is required' })}
                placeholder={language === 'fa' ? 'نام سرویس را وارد کنید' : 'Enter service name in Persian'}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name_en">
                {language === 'fa' ? 'نام سرویس (انگلیسی)' : 'Service Name (English)'}
              </Label>
              <Input
                id="name_en"
                {...register('name_en')}
                placeholder={language === 'fa' ? 'نام انگلیسی سرویس' : 'Enter service name in English'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration_days">
                {language === 'fa' ? 'مدت (روز)' : 'Duration (Days)'}
              </Label>
              <Input
                id="duration_days"
                type="number"
                min="1"
                {...register('duration_days', { 
                  required: 'Duration is required',
                  min: { value: 1, message: 'Duration must be at least 1 day' }
                })}
              />
              {errors.duration_days && (
                <p className="text-sm text-destructive">{errors.duration_days.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_limit_gb">
                {language === 'fa' ? 'حجم (گیگابایت)' : 'Data Limit (GB)'}
              </Label>
              <Input
                id="data_limit_gb"
                type="number"
                min="1"
                {...register('data_limit_gb', { 
                  required: 'Data limit is required',
                  min: { value: 1, message: 'Data limit must be at least 1 GB' }
                })}
              />
              {errors.data_limit_gb && (
                <p className="text-sm text-destructive">{errors.data_limit_gb.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price_toman">
              {language === 'fa' ? 'قیمت (تومان)' : 'Price (Toman)'}
            </Label>
            <Input
              id="price_toman"
              type="number"
              min="0"
              {...register('price_toman', { 
                required: 'Price is required',
                min: { value: 0, message: 'Price cannot be negative' }
              })}
            />
            {errors.price_toman && (
              <p className="text-sm text-destructive">{errors.price_toman.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan_id">
              {language === 'fa' ? 'پلن متصل' : 'Connected Plan'}
            </Label>
            <Select 
              value={watch('plan_id')} 
              onValueChange={(value) => setValue('plan_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  loadingPlans 
                    ? (language === 'fa' ? 'بارگذاری...' : 'Loading...') 
                    : (language === 'fa' ? 'پلن را انتخاب کنید' : 'Select a plan')
                } />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {language === 'fa' ? plan.name_fa : plan.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.plan_id && (
              <p className="text-sm text-destructive">Plan selection is required</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="status">
              {language === 'fa' ? 'وضعیت فعال' : 'Active Status'}
            </Label>
            <Switch
              id="status"
              checked={isActive}
              onCheckedChange={(checked) => setValue('status', checked ? 'active' : 'inactive')}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              {language === 'fa' ? 'لغو' : 'Cancel'}
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {service 
                ? (language === 'fa' ? 'بروزرسانی' : 'Update')
                : (language === 'fa' ? 'ایجاد' : 'Create')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};