
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MarzbanApiService } from '@/services/marzbanApi';

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
      console.log('Submitting subscription data:', data);
      console.log('Selected plan API type:', data.selectedPlan?.apiType);
      
      // Validate that we have the required plan data
      if (!data.selectedPlan?.apiType) {
        throw new Error('Plan API type is missing. Please select a valid plan.');
      }
      
      // Calculate price
      const basePrice = data.dataLimit * (data.selectedPlan?.pricePerGB || 800);
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
        notes: `Plan: ${data.selectedPlan.name}, API: ${data.selectedPlan.apiType}${data.appliedDiscount ? `, Discount: ${data.appliedDiscount.code}` : ''}`
      };
      
      console.log('Inserting subscription to database:', subscriptionData);
      
      const { data: subscription, error: insertError } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single();
      
      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error(`Failed to save subscription: ${insertError.message}`);
      }
      
      console.log('Subscription inserted successfully:', subscription);
      
      // If price is 0, create VPN user immediately
      if (finalPrice === 0) {
        try {
          console.log(`Creating VPN user for free subscription using ${data.selectedPlan.apiType} API...`);
          
          let vpnResult;
          
          // Use shared services instead of edge functions for direct API calls
          if (data.selectedPlan.apiType === 'marzban') {
            console.log('Using shared Marzban API service');
            vpnResult = await MarzbanApiService.createUser({
              username: uniqueUsername,
              dataLimitGB: data.dataLimit,
              durationDays: data.duration,
              notes: `Free subscription via discount: ${data.appliedDiscount?.code || 'N/A'} - Plan: ${data.selectedPlan.name}`
            });
          } else {
            console.log('Using Marzneshin edge function');
            const { data: edgeResult, error: vpnError } = await supabase.functions.invoke(
              'marzneshin-create-user',
              {
                body: {
                  username: uniqueUsername,
                  dataLimitGB: data.dataLimit,
                  durationDays: data.duration,
                  notes: `Free subscription via discount: ${data.appliedDiscount?.code || 'N/A'} - Plan: ${data.selectedPlan.name}`
                }
              }
            );
            
            if (vpnError) {
              console.error('Marzneshin edge function error:', vpnError);
              throw new Error(`VPN user creation failed: ${vpnError.message}`);
            }
            
            if (!edgeResult.success) {
              throw new Error(`VPN user creation failed: ${edgeResult.error}`);
            }
            
            vpnResult = edgeResult.data;
          }
          
          console.log(`VPN creation response using ${data.selectedPlan.apiType}:`, vpnResult);
          
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
              console.error('Failed to update subscription with VPN details:', updateError);
            } else {
              console.log(`Free subscription completed successfully using ${data.selectedPlan.apiType}`);
            }
          }
          
          toast({
            title: 'Success',
            description: 'Free subscription created successfully!',
          });
          
          return subscription.id;
        } catch (vpnError) {
          console.error(`VPN creation failed for free subscription using ${data.selectedPlan.apiType}:`, vpnError);
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
      console.error('Subscription submission error:', error);
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
