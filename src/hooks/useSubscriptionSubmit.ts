
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PanelUserCreationService } from '@/services/panelUserCreationService';
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
      console.log('SUBSCRIPTION_SUBMIT: Starting FIXED submission with plan:', data.selectedPlan?.name);
      
      // Validate that we have the required plan data
      if (!data.selectedPlan?.id && !data.selectedPlan?.plan_id) {
        throw new Error('Plan ID is missing. Please select a valid plan.');
      }

      // Get the plan ID (support both formats)
      const selectedPlanId = data.selectedPlan.id || data.selectedPlan.plan_id;
      console.log('SUBSCRIPTION_SUBMIT: Using FIXED plan ID:', selectedPlanId);

      // Calculate price
      const basePrice = data.dataLimit * (data.selectedPlan.price_per_gb || data.selectedPlan.pricePerGB || 0);
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
        notes: `Plan: ${data.selectedPlan.name || data.selectedPlan.name_en}${data.appliedDiscount ? `, Discount: ${data.appliedDiscount.code}` : ''}`
      };
      
      console.log('SUBSCRIPTION_SUBMIT: Inserting FIXED subscription to database:', subscriptionData);
      
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
      
      // If price is 0, create VPN user immediately using FIXED centralized service
      if (finalPrice === 0) {
        try {
          console.log('SUBSCRIPTION_SUBMIT: Creating VPN user for free subscription using FIXED centralized service');
          
          const result = await PanelUserCreationService.createPaidSubscription(
            uniqueUsername,
            selectedPlanId,
            data.dataLimit,
            data.duration,
            subscription.id,
            `Free subscription via discount: ${data.appliedDiscount?.code || 'N/A'} - Plan: ${data.selectedPlan.name || data.selectedPlan.name_en}`
          );
          
          console.log('SUBSCRIPTION_SUBMIT: FIXED VPN creation response:', result);
          
          if (result.success && result.data) {
            console.log('SUBSCRIPTION_SUBMIT: FIXED free subscription completed successfully');
            
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
      console.error('SUBSCRIPTION_SUBMIT: FIXED submission error:', error);
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
