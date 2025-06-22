
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PlanService } from '@/services/planService';
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
      console.log('SUBSCRIPTION_SUBMIT: Starting submission with ULTRA STRICT panel enforcement for plan:', data.selectedPlan?.name_en);
      
      // ULTRA STRICT VALIDATION: Validate that we have the required plan data
      if (!data.selectedPlan?.id) {
        throw new Error('Plan ID is missing. Please select a valid plan.');
      }

      // ULTRA STRICT: Get the latest plan data with MANDATORY panel assignment
      const latestPlan = await PlanService.getPlanById(data.selectedPlan.id);
      if (!latestPlan) {
        throw new Error('Selected plan is no longer available. Please refresh the page and select another plan.');
      }

      // ULTRA STRICT VALIDATION: Plan MUST have assigned panel - NO EXCEPTIONS
      if (!latestPlan.assigned_panel_id) {
        console.error('SUBSCRIPTION_SUBMIT: ULTRA STRICT REJECTION - Plan has NO assigned panel:', latestPlan);
        throw new Error(`CRITICAL ERROR: Plan "${latestPlan.name_en}" has NO assigned panel. This plan cannot create VPN users. Please contact admin.`);
      }

      console.log('SUBSCRIPTION_SUBMIT: Using plan with ULTRA STRICT panel assignment:', {
        planName: latestPlan.name_en,
        planId: latestPlan.id,
        assignedPanelId: latestPlan.assigned_panel_id,
        panelCount: latestPlan.panels.length
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
      
      // Insert subscription into database with CORRECT plan_id
      const subscriptionData = {
        username: uniqueUsername,
        mobile: data.mobile,
        data_limit_gb: data.dataLimit,
        duration_days: data.duration,
        price_toman: finalPrice,
        status: 'pending',
        user_id: null, // Allow anonymous subscriptions
        plan_id: selectedPlanId, // Use the CORRECT plan UUID
        notes: `Plan: ${latestPlan.name_en} (${latestPlan.plan_id}) - Assigned Panel: ${latestPlan.assigned_panel_id}${data.appliedDiscount ? `, Discount: ${data.appliedDiscount.code}` : ''}`
      };
      
      console.log('SUBSCRIPTION_SUBMIT: Inserting subscription to database with ULTRA STRICT plan data:', subscriptionData);
      
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
      
      // If price is 0, create VPN user immediately using ULTRA STRICT PanelUserCreationService
      if (finalPrice === 0) {
        try {
          console.log('SUBSCRIPTION_SUBMIT: Creating VPN user for free subscription using ULTRA STRICT PanelUserCreationService');
          
          const result = await PanelUserCreationService.createUserFromPanel({
            planId: selectedPlanId, // Use the CORRECT plan ID
            username: uniqueUsername,
            dataLimitGB: data.dataLimit,
            durationDays: data.duration,
            notes: `Free subscription via discount: ${data.appliedDiscount?.code || 'N/A'} - Plan: ${latestPlan.name_en}`,
            subscriptionId: subscription.id,
            isFreeTriaL: false
          });
          
          console.log('SUBSCRIPTION_SUBMIT: ULTRA STRICT VPN creation response:', result);
          
          if (result.success && result.data) {
            console.log('SUBSCRIPTION_SUBMIT: Free subscription completed successfully with ULTRA STRICT panel assignment');
            
            // Update subscription with VPN details
            await supabase
              .from('subscriptions')
              .update({
                status: 'active',
                subscription_url: result.data.subscription_url,
                expire_at: new Date(result.data.expire * 1000).toISOString(),
                marzban_user_created: true
              })
              .eq('id', subscription.id);
            
            toast({
              title: 'Success',
              description: 'Free subscription created successfully!',
            });
          } else {
            console.error('SUBSCRIPTION_SUBMIT: ULTRA STRICT VPN user creation failed:', result.error);
            
            toast({
              title: 'Subscription Created',
              description: `Subscription saved but VPN creation failed: ${result.error}. Please contact support.`,
              variant: 'destructive'
            });
          }
          
          return subscription.id;
          
        } catch (vpnError) {
          console.error('SUBSCRIPTION_SUBMIT: VPN creation failed for free subscription with ULTRA STRICT enforcement:', vpnError);
          toast({
            title: 'Subscription Created',
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
