import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  type: string;
  webhook_type: string;
  subscription_id?: string;
  test_user_id?: string;
  username: string;
  mobile?: string;
  email?: string;
  amount?: number;
  plan?: string;
  payment_method?: string;
  receipt_url?: string;  
  approve_link?: string;
  reject_link?: string;
  subscription_url?: string;
  plan_name?: string;
  plan_id?: string;
  panel_name?: string;
  panel_type?: string;
  panel_url?: string;
  panel_country?: string;
  data_limit_gb?: number;
  duration_days?: number;
  expire_at?: string;
  protocol?: string;
  status?: string;
  created_at: string;
  [key: string]: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: WebhookPayload = await req.json();
    console.log('WEBHOOK: Received payload:', payload);
    
    // Get webhook configuration from database
    const { data: webhookConfig, error: configError } = await supabase
      .from('webhook_config')
      .select('*')
      .eq('is_enabled', true)
      .limit(1)
      .maybeSingle();

    if (configError) {
      console.error('WEBHOOK: Error fetching config:', configError);
      throw new Error(`Failed to fetch webhook config: ${configError.message}`);
    }

    if (!webhookConfig) {
      console.log('WEBHOOK: No active webhook configuration found');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No active webhook configuration found' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Check if this trigger is enabled
    const { data: triggerConfig, error: triggerError } = await supabase
      .from('webhook_triggers')
      .select('*')
      .eq('webhook_config_id', webhookConfig.id)
      .eq('trigger_name', payload.webhook_type)
      .eq('is_enabled', true)
      .maybeSingle();

    if (triggerError) {
      console.error('WEBHOOK: Error checking trigger:', triggerError);
    }

    if (!triggerConfig) {
      console.log(`WEBHOOK: Trigger ${payload.webhook_type} is not enabled or doesn't exist`);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Trigger ${payload.webhook_type} is not enabled` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get payload configuration to build dynamic payload  
    const { data: payloadConfig, error: payloadError } = await supabase
      .from('webhook_payload_config')
      .select('*')
      .eq('webhook_config_id', webhookConfig.id)
      .eq('is_enabled', true);

    if (payloadError) {
      console.error('WEBHOOK: Error fetching payload config:', payloadError);
    }

    // Build dynamic payload based on configuration
    const finalPayload: any = {};
    
    if (payloadConfig && payloadConfig.length > 0) {
      payloadConfig.forEach(config => {
        if (config.parameter_source && payload[config.parameter_source] !== undefined) {
          finalPayload[config.parameter_name] = payload[config.parameter_source];
        } else if (config.custom_value) {
          if (config.parameter_type === 'number') {
            finalPayload[config.parameter_name] = Number(config.custom_value);
          } else if (config.parameter_type === 'boolean') {
            finalPayload[config.parameter_name] = config.custom_value === 'true';
          } else {
            finalPayload[config.parameter_name] = config.custom_value;
          }
        }
      });
    } else {
      // Fallback to original payload if no config
      finalPayload = { ...payload };
    }

    // Add manual payment specific data if this is a manual payment webhook
    if (payload.webhook_type === 'manual_payment_approval' && payload.subscription_id) {
      // Get full subscription data
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans (
            name_en,
            name_fa,
            description_en,
            description_fa,
            panel_servers (
              name,
              type,
              panel_url,
              country_en,
              country_fa
            )
          )
        `)
        .eq('id', payload.subscription_id)
        .maybeSingle();

      if (subscription) {
        // Add approve/reject links
        const baseUrl = 'https://feamvyruipxtafzhptkh.supabase.co';
        finalPayload.approve_link = `${baseUrl}/admin/approve-order/${subscription.id}?token=${subscription.admin_decision_token}`;
        finalPayload.reject_link = `${baseUrl}/admin/reject-order/${subscription.id}?token=${subscription.admin_decision_token}`;
        
        // Add receipt URL if exists
        if (subscription.receipt_image_url) {
          finalPayload.receipt_url = subscription.receipt_image_url;
        }

        // Add complete subscription data
        finalPayload.subscription_data = {
          id: subscription.id,
          username: subscription.username,
          mobile: subscription.mobile,
          email: subscription.email,
          data_limit_gb: subscription.data_limit_gb,
          duration_days: subscription.duration_days,
          price_toman: subscription.price_toman,
          status: subscription.status,
          created_at: subscription.created_at,
          plan_name: subscription.subscription_plans?.name_en,
          plan_name_fa: subscription.subscription_plans?.name_fa,
          panel_name: subscription.subscription_plans?.panel_servers?.name,
          panel_type: subscription.subscription_plans?.panel_servers?.type,
          panel_country: subscription.subscription_plans?.panel_servers?.country_en,
        };
      }
    }

    console.log('WEBHOOK: Sending final payload:', finalPayload);

    // Send webhook with configured method and headers
    const webhookHeaders = {
      'Content-Type': 'application/json',
      ...webhookConfig.headers
    };

    const response = await fetch(webhookConfig.webhook_url, {
      method: webhookConfig.method,
      headers: webhookHeaders,
      body: JSON.stringify(finalPayload),
    });

    const responseText = await response.text();
    const success = response.ok;

    // Log the webhook attempt
    await supabase.from('webhook_logs').insert({
      webhook_config_id: webhookConfig.id,
      trigger_type: payload.webhook_type,
      payload: finalPayload,
      success: success,
      response_status: response.status,
      response_body: responseText.substring(0, 1000), // Limit response body length
      error_message: success ? null : `HTTP ${response.status}: ${response.statusText}`
    });

    if (!success) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }

    console.log('WEBHOOK: Success response:', responseText);

    return new Response(JSON.stringify({ 
      success: true, 
      webhook_response: responseText 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('WEBHOOK: Error sending notification:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});