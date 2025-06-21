
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { UserCreationService } from '@/services/userCreationService';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionData {
  username: string;
  mobile: string;
  dataLimit: number;
  duration: number;
  selectedPlan: any;
  appliedDiscount?: any;
}

interface UseSubscriptionSubmitResult {
  isSubmitting: boolean;
  submitSubscription: (data: SubscriptionData) => Promise<string | null>;
}

export const useSubscriptionSubmit = (): UseSubscriptionSubmitResult => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const submitSubscription = async (data: SubscriptionData): Promise<string | null> => {
    setIsSubmitting(true);
    
    try {
      console.log('SUBSCRIPTION_SUBMIT: Starting submission with plan:', data.selectedPlan?.name);
      
      // Validate that we have the required plan data
      if (!data.selectedPlan?.id) {
        throw new Error('Plan ID is missing. Please select a valid plan.');
      }

      // Get plan configuration from database
      const { data: planConfig, error: planError } = await supabase
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
              is_active
            )
          )
        `)
        .eq('id', data.selectedPlan.id)
        .eq('is_active', true)
        .single();

      if (planError || !planConfig) {
        throw new Error('Selected plan is not available or inactive.');
      }

      console.log('SUBSCRIPTION_SUBMIT: Plan config loaded:', planConfig);

      // Find primary panel for this plan
      const primaryPanelMapping = planConfig.plan_panel_mappings.find((mapping: any) => mapping.is_primary);
      if (!primaryPanelMapping) {
        throw new Error('No primary panel found for this plan.');
      }

      const primaryPanel = primaryPanelMapping.panel_servers;
      console.log('SUBSCRIPTION_SUBMIT: Using primary panel:', {
        panelId: primaryPanel.id,
        panelName: primaryPanel.name,
        panelType: primaryPanel.type
      });
      
      // Calculate price
      const basePrice = data.dataLimit * planConfig.price_per_gb;
      const discountAmount = data.appliedDiscount ? 
        (basePrice * data.appliedDiscount.percentage) / 100 : 0;
      const finalPrice = Math.max(0, basePrice - discountAmount);
      
      // Generate unique username if needed
      const timestamp = Date.now();
      const uniqueUsername = data.username.includes('_') ? 
        data.username : `${data.username}_${timestamp}`;
      
      // Insert subscription into database
      const subscriptionData = {
        username: uniqueUsername,
        mobile: data.mobile,
        data_limit_gb: data.dataLimit,
        duration_days: data.duration,
        price_toman: finalPrice,
        status: 'pending',
        user_id: null, // Allow anonymous subscriptions
        notes: `Plan: ${planConfig.name_en}, Panel: ${primaryPanel.name}${data.appliedDiscount ? `, Discount: ${data.appliedDiscount.code}` : ''}`
      };
      
      console.log('SUBSCRIPTION_SUBMIT: Inserting subscription to database:', subscriptionData);
      
      const { data: subscription, error: insertError } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single();
      
      if (insertError) {
        console.error('SUBSCRIPTION_SUBMIT: Database insert error:', insertError);
        throw new Error(`Failed to save subscription: ${insertError.message}`);
      }
      
      console.log('SUBSCRIPTION_SUBMIT: Subscription inserted successfully:', subscription);
      
      // If price is 0, create VPN user immediately using new service
      if (finalPrice === 0) {
        try {
          console.log('SUBSCRIPTION_SUBMIT: Creating VPN user for free subscription using new service');
          
          const result = await UserCreationService.createSubscription(
            uniqueUsername,
            data.dataLimit,
            data.duration,
            primaryPanel.type as 'marzban' | 'marzneshin',
            subscription.id,
            `Free subscription via discount: ${data.appliedDiscount?.code || 'N/A'} - Plan: ${planConfig.name_en}`
          );
          
          console.log('SUBSCRIPTION_SUBMIT: VPN creation response:', result);
          
          if (result.success && result.data) {
            console.log('SUBSCRIPTION_SUBMIT: Free subscription completed successfully');
            
            toast({
              title: 'Success',
              description: 'Free subscription created successfully!',
            });
          } else {
            console.warn('SUBSCRIPTION_SUBMIT: VPN user creation failed:', result.error);
            
            toast({
              title: 'Partial Success',
              description: 'Subscription saved but VPN creation failed. Please contact support.',
              variant: 'destructive'
            });
          }
          
          return subscription.id;
          
        } catch (vpnError) {
          console.error('SUBSCRIPTION_SUBMIT: VPN creation failed for free subscription:', vpnError);
          toast({
            title: 'Partial Success',
            description: 'Subscription saved but VPN creation failed. Please contact support.',
            variant: 'destructive'
          });
          return subscription.id;
        }
      }
      
      // For paid subscriptions, return subscription ID for payment processing
      toast({
        title: 'Success',
        description: 'Subscription created. Redirecting to payment...',
      });
      
      return subscription.id;
      
    } catch (error) {
      console.error('SUBSCRIPTION_SUBMIT: Submission error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create subscription',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, submitSubscription };
};
