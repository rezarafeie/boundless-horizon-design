
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PlanService } from '@/services/planService';
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
      console.log('SUBSCRIPTION_SUBMIT: Starting submission with plan:', data.selectedPlan?.name_en);
      
      // Validate that we have the required plan data
      if (!data.selectedPlan?.id) {
        throw new Error('Plan ID is missing. Please select a valid plan.');
      }

      // Get the latest plan data
      const latestPlan = await PlanService.getPlanById(data.selectedPlan.id);
      if (!latestPlan) {
        throw new Error('Selected plan is no longer available. Please refresh the page and select another plan.');
      }

      console.log('SUBSCRIPTION_SUBMIT: Using plan:', {
        planName: latestPlan.name_en,
        planId: latestPlan.id
      });

      const selectedPlanId = latestPlan.id;

      // Calculate price
      const basePrice = data.dataLimit * (latestPlan.price_per_gb || 0);
      const discountAmount = data.appliedDiscount ? 
        (basePrice * data.appliedDiscount.percentage) / 100 : 0;
      const finalPrice = Math.max(0, basePrice - discountAmount);
      
      // Generate unique username if needed
      const timestamp = Date.now();
      const uniqueUsername = data.username.includes('_') ? 
        data.username : `${data.username}_${timestamp}`;
      
      // Insert subscription into database with plan_id
      const subscriptionData = {
        username: uniqueUsername,
        mobile: data.mobile,
        data_limit_gb: data.dataLimit,
        duration_days: data.duration,
        price_toman: finalPrice,
        status: 'pending',
        user_id: null, // Allow anonymous subscriptions
        plan_id: selectedPlanId, // Use the plan UUID
        notes: `Plan: ${latestPlan.name_en} (${latestPlan.plan_id})${data.appliedDiscount ? `, Discount: ${data.appliedDiscount.code}` : ''}`
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
      
      // If price is 0, create VPN user immediately using PlanService
      if (finalPrice === 0) {
        try {
          console.log('SUBSCRIPTION_SUBMIT: Creating VPN user for free subscription using PlanService');
          
          const result = await PlanService.createSubscription(
            selectedPlanId,
            {
              username: uniqueUsername,
              mobile: data.mobile,
              dataLimitGB: data.dataLimit,
              durationDays: data.duration,
              notes: `Free subscription via discount: ${data.appliedDiscount?.code || 'N/A'} - Plan: ${latestPlan.name_en}`
            }
          );
          
          console.log('SUBSCRIPTION_SUBMIT: VPN creation response:', result);
          
          if (result) {
            console.log('SUBSCRIPTION_SUBMIT: Free subscription completed successfully');
            
            // Update subscription with VPN details
            await supabase
              .from('subscriptions')
              .update({
                status: 'active',
                subscription_url: result.subscription_url,
                expire_at: result.expire,
                marzban_user_created: true
              })
              .eq('id', subscription.id);
            
            toast({
              title: 'Success',
              description: 'Free subscription created successfully!',
            });
          } else {
            console.warn('SUBSCRIPTION_SUBMIT: VPN user creation failed');
            
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
