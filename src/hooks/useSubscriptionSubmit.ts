
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PlanService } from '@/services/planService';

interface SubscriptionData {
  username: string;
  mobile: string;
  dataLimit: number;
  duration: number;
  protocol: string;
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
      console.log('SUBSCRIPTION SUBMIT: Starting submission with plan:', data.selectedPlan?.name);
      
      // Validate that we have the required plan data
      if (!data.selectedPlan?.id) {
        throw new Error('Plan ID is missing. Please select a valid plan.');
      }
      
      // Get plan configuration from the service
      const planConfig = await PlanService.getPlanById(data.selectedPlan.id);
      if (!planConfig) {
        throw new Error('Selected plan is not available or inactive.');
      }

      console.log('SUBSCRIPTION SUBMIT: Using plan configuration:', {
        planName: planConfig.name_en,
        apiType: PlanService.getApiType(planConfig),
        panelsCount: planConfig.panels.length
      });

      // Get the primary panel for this plan
      const primaryPanel = PlanService.getPrimaryPanel(planConfig);
      if (!primaryPanel) {
        throw new Error('No primary panel found for this plan.');
      }

      console.log('SUBSCRIPTION SUBMIT: Using primary panel:', {
        panelId: primaryPanel.id,
        panelName: primaryPanel.name,
        panelType: primaryPanel.type,
        enabledProtocols: primaryPanel.enabled_protocols
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
        protocol: data.protocol,
        price_toman: finalPrice,
        status: 'pending',
        user_id: null, // Allow anonymous subscriptions
        notes: `Plan: ${planConfig.name_en}, API: ${PlanService.getApiType(planConfig)}, Panel: ${primaryPanel.name}, Protocols: ${primaryPanel.enabled_protocols.join(', ')}${data.appliedDiscount ? `, Discount: ${data.appliedDiscount.code}` : ''}`
      };
      
      console.log('SUBSCRIPTION SUBMIT: Inserting subscription to database:', subscriptionData);
      
      const { data: subscription, error: insertError } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single();
      
      if (insertError) {
        console.error('SUBSCRIPTION SUBMIT: Database insert error:', insertError);
        throw new Error(`Failed to save subscription: ${insertError.message}`);
      }
      
      console.log('SUBSCRIPTION SUBMIT: Subscription inserted successfully:', subscription);
      
      // If price is 0, create VPN user immediately
      if (finalPrice === 0) {
        try {
          console.log('SUBSCRIPTION SUBMIT: Creating VPN user for free subscription using plan service with panel ID...');
          
          const vpnResult = await PlanService.createSubscription(planConfig.id, {
            username: uniqueUsername,
            mobile: data.mobile,
            dataLimitGB: data.dataLimit,
            durationDays: data.duration,
            notes: `Free subscription via discount: ${data.appliedDiscount?.code || 'N/A'} - Plan: ${planConfig.name_en}`,
            enabledProtocols: primaryPanel.enabled_protocols
          });
          
          console.log('SUBSCRIPTION SUBMIT: VPN creation response:', vpnResult);
          
          if (vpnResult?.subscription_url) {
            // Update subscription with VPN details
            const { error: updateError } = await supabase
              .from('subscriptions')
              .update({
                status: 'active',
                subscription_url: vpnResult.subscription_url,
                marzban_user_created: true,
                expire_at: new Date(Date.now() + data.duration * 24 * 60 * 60 * 1000).toISOString()
              })
              .eq('id', subscription.id);
            
            if (updateError) {
              console.error('SUBSCRIPTION SUBMIT: Failed to update subscription with VPN details:', updateError);
            } else {
              console.log('SUBSCRIPTION SUBMIT: Free subscription completed successfully');
            }
          } else {
            console.warn('SUBSCRIPTION SUBMIT: VPN user created but no subscription URL returned');
          }
          
          toast({
            title: 'Success',
            description: 'Free subscription created successfully!',
          });
          
          return subscription.id;
        } catch (vpnError) {
          console.error('SUBSCRIPTION SUBMIT: VPN creation failed for free subscription:', vpnError);
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
      console.error('SUBSCRIPTION SUBMIT: Submission error:', error);
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
