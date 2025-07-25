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
    
    // Map legacy webhook types to standardized trigger names
    const triggerNameMap: Record<string, string> = {
      'testuser': 'test_account_creation',
      'newsub': 'subscription_creation',
      'paymentpending': 'subscription_creation',
      'manual': 'manual_payment_approval',
      'test': 'test',
      'subscription_update': 'subscription_update',
      'stripe_payment_success': 'stripe_payment_success',
      'zarinpal_payment_success': 'zarinpal_payment_success'
    };
    
    // Standardize the webhook type
    const standardizedTrigger = triggerNameMap[payload.webhook_type] || payload.webhook_type;
    console.log('WEBHOOK: Mapping webhook_type from', payload.webhook_type, 'to', standardizedTrigger);
    
    // Get primary webhook configuration from database
    const { data: primaryConfig, error: primaryError } = await supabase
      .from('webhook_config')
      .select('*')
      .eq('is_enabled', true)
      .eq('is_primary', true)
      .maybeSingle();

    if (primaryError) {
      console.error('WEBHOOK: Error fetching primary config:', primaryError);
      throw new Error(`Failed to fetch webhook config: ${primaryError.message}`);
    }

    let webhookConfig = primaryConfig;

    // Fallback to most recent enabled config if no primary config exists
    if (!webhookConfig) {
      console.log('WEBHOOK: No primary webhook config found, falling back to most recent enabled config');
      
      const { data: fallbackConfigs, error: fallbackError } = await supabase
        .from('webhook_config')
        .select('*')
        .eq('is_enabled', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fallbackError) {
        console.error('WEBHOOK: Error fetching fallback config:', fallbackError);
        throw new Error(`Failed to fetch webhook config: ${fallbackError.message}`);
      }

      if (!fallbackConfigs || fallbackConfigs.length === 0) {
        console.log('WEBHOOK: No active webhook configuration found');
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'No active webhook configuration found' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      webhookConfig = fallbackConfigs[0];
      console.warn('WEBHOOK: Using fallback config (no primary config set)');
    }

    console.log('WEBHOOK: Using config:', { 
      id: webhookConfig.id, 
      url: webhookConfig.webhook_url, 
      method: webhookConfig.method,
      is_primary: webhookConfig.is_primary || false
    });

    // Check if this trigger is enabled
    const { data: triggerConfig, error: triggerError } = await supabase
      .from('webhook_triggers')
      .select('*')
      .eq('webhook_config_id', webhookConfig.id)
      .eq('trigger_name', standardizedTrigger)
      .eq('is_enabled', true)
      .maybeSingle();

    if (triggerError) {
      console.error('WEBHOOK: Error checking trigger:', triggerError);
    }

    if (!triggerConfig) {
      const errorMessage = `Webhook trigger '${standardizedTrigger}' is not enabled or doesn't exist for webhook config ${webhookConfig.id}. Available triggers should be configured in webhook_triggers table.`;
      console.log(`WEBHOOK: ${errorMessage}`);
      
      // Log this as a failed attempt for debugging
      await supabase.from('webhook_logs').insert({
        webhook_config_id: webhookConfig.id,
        trigger_type: standardizedTrigger,
        payload: payload,
        success: false,
        response_status: null,
        response_body: null,
        error_message: errorMessage
      });

      return new Response(JSON.stringify({ 
        success: false, 
        error: errorMessage,
        details: {
          webhook_type: payload.webhook_type,
          standardized_trigger: standardizedTrigger,
          webhook_config_id: webhookConfig.id
        }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    console.log(`WEBHOOK: Trigger ${standardizedTrigger} is enabled for config ${webhookConfig.id}`);

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

    // Add webhook-specific data based on type
    if (payload.webhook_type === 'manual_payment_approval' && payload.subscription_id) {
      // Get full subscription data with relationships
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans (
            name_en,
            name_fa,
            description_en,
            description_fa,
            assigned_panel_id,
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
        // Ensure subscription has admin decision token for approval links
        let token = subscription.admin_decision_token;
        if (!token) {
          console.log('Missing admin_decision_token, generating new one for subscription:', subscription.id);
          token = crypto.randomUUID();
          
          // Update subscription with new token
          await supabase
            .from('subscriptions')
            .update({ 
              admin_decision_token: token,
              admin_decision: 'pending'
            })
            .eq('id', subscription.id);
            
          console.log('Generated and saved new token:', token);
        }
        
        // Add approve/reject links with proper domain
        const baseUrl = 'https://preview--boundless-horizon-design.lovable.app';
        finalPayload.approve_link = `${baseUrl}/admin/approve-order/${subscription.id}?token=${token}`;
        finalPayload.reject_link = `${baseUrl}/admin/reject-order/${subscription.id}?token=${token}`;
        
        // Add receipt URL if exists - convert to full URL
        if (subscription.receipt_image_url) {
          if (subscription.receipt_image_url.startsWith('http')) {
            finalPayload.receipt_url = subscription.receipt_image_url;
          } else {
            // Convert relative URL to full Supabase storage URL
            finalPayload.receipt_url = `https://feamvyruipxtafzhptkh.supabase.co/storage/v1/object/public/manual-payment-receipts/${subscription.receipt_image_url}`;
          }
        }

        // Add complete subscription data for manual payment context
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
          admin_dashboard_url: `${baseUrl}/admin/users`,
          subscription_details_url: `${baseUrl}/admin/users?search=${subscription.username}`
        };

        // Add payment verification data for manual approvals
        finalPayload.payment_verification = {
          receipt_uploaded: !!subscription.receipt_image_url,
          receipt_url: finalPayload.receipt_url || null,
          requires_manual_approval: true,
          admin_decision_required: subscription.admin_decision === null,
          amount_toman: subscription.price_toman,
          payment_method: 'manual_transfer'
        };

        // Add manual payment specific data
        finalPayload.manual_payment_data = {
          subscription_id: subscription.id,
          customer_name: subscription.username,
          customer_mobile: subscription.mobile,
          customer_email: subscription.email || '',
          amount_paid: subscription.price_toman,
          currency: 'IRR',
          plan_details: {
            plan_name: subscription.subscription_plans?.name_en || 'Unknown Plan',
            plan_name_fa: subscription.subscription_plans?.name_fa || 'نامشخص',
            data_limit_gb: subscription.data_limit_gb,
            duration_days: subscription.duration_days,
            panel_name: subscription.subscription_plans?.panel_servers?.name || 'Unknown Panel',
            panel_country: subscription.subscription_plans?.panel_servers?.country_en || 'Unknown'
          },
          admin_actions: {
            approve_url: finalPayload.approve_link,
            reject_url: finalPayload.reject_link,
            admin_dashboard_url: `${baseUrl}/admin/users`,
            subscription_management_url: `${baseUrl}/admin/users?search=${subscription.username}`
          },
          receipt_details: {
            receipt_uploaded: !!subscription.receipt_image_url,
            receipt_url: finalPayload.receipt_url || null,
            receipt_filename: subscription.receipt_image_url ? subscription.receipt_image_url.split('/').pop() : null
          },
          created_at: subscription.created_at,
          status: subscription.status,
          admin_decision_pending: subscription.admin_decision === null
        };
      }
    }
    
    // Add test user data for test account creation webhooks
    if (payload.webhook_type === 'test_account_creation') {
      console.log('WEBHOOK: Processing test_account_creation webhook');
      
      if (payload.test_user_id) {
        console.log('WEBHOOK: Looking up test user by ID:', payload.test_user_id);
        const { data: testUser } = await supabase
          .from('test_users')
          .select('*')
          .eq('id', payload.test_user_id)
          .maybeSingle();
          
        if (testUser) {
          console.log('WEBHOOK: Found test user by ID:', testUser);
          finalPayload.test_user_data = {
            id: testUser.id,
            username: testUser.username,
            email: testUser.email,
            phone_number: testUser.phone_number,
            panel_name: testUser.panel_name,
            expire_date: testUser.expire_date,
            subscription_url: testUser.subscription_url,
            data_limit_gb: Math.round(testUser.data_limit_bytes / (1024 * 1024 * 1024))
          };
        } else {
          console.log('WEBHOOK: Test user not found by ID, trying username:', payload.username);
        }
      }
      
      // If no test user found by ID, try by username
      if (!finalPayload.test_user_data && payload.username) {
        const { data: testUser } = await supabase
          .from('test_users')
          .select('*')
          .eq('username', payload.username)
          .maybeSingle();
          
        if (testUser) {
          console.log('WEBHOOK: Found test user by username:', testUser);
          finalPayload.test_user_data = {
            id: testUser.id,
            username: testUser.username,
            email: testUser.email,
            phone_number: testUser.phone_number,
            panel_name: testUser.panel_name,
            expire_date: testUser.expire_date,
            subscription_url: testUser.subscription_url,
            data_limit_gb: Math.round(testUser.data_limit_bytes / (1024 * 1024 * 1024))
          };
        } else {
          console.warn('WEBHOOK: Test user not found by username either');
        }
      }
    }

    console.log('WEBHOOK: Sending final payload to:', webhookConfig.webhook_url);
    console.log('WEBHOOK: Payload size:', JSON.stringify(finalPayload).length, 'bytes');
    console.log('WEBHOOK: Full payload:', finalPayload);

    // Send webhook with configured method and headers
    const webhookHeaders = {
      'Content-Type': 'application/json',
      ...webhookConfig.headers
    };

    console.log('WEBHOOK: Request headers:', webhookHeaders);
    console.log('WEBHOOK: Request method:', webhookConfig.method);

    let response: Response;
    let responseText: string;
    let success: boolean;

    try {
      response = await fetch(webhookConfig.webhook_url, {
        method: webhookConfig.method,
        headers: webhookHeaders,
        body: JSON.stringify(finalPayload),
      });

      responseText = await response.text();
      success = response.ok;
      
      console.log('WEBHOOK: Response status:', response.status);
      console.log('WEBHOOK: Response headers:', Object.fromEntries(response.headers.entries()));
      console.log('WEBHOOK: Response body:', responseText);
      
    } catch (fetchError) {
      console.error('WEBHOOK: Fetch error:', fetchError);
      responseText = `Fetch error: ${fetchError.message}`;
      success = false;
      response = new Response('', { status: 0 });
    }

    // Log the webhook attempt with enhanced details
    const logEntry = {
      webhook_config_id: webhookConfig.id,
      trigger_type: standardizedTrigger,
      payload: finalPayload,
      success: success,
      response_status: response.status || null,
      response_body: responseText.substring(0, 1000), // Limit response body length
      error_message: success ? null : (response.status ? `HTTP ${response.status}: ${response.statusText}` : responseText)
    };
    
    console.log('WEBHOOK: Logging attempt:', { 
      success, 
      status: response.status, 
      trigger: standardizedTrigger,
      config_id: webhookConfig.id 
    });
    
    const { error: logError } = await supabase.from('webhook_logs').insert(logEntry);
    if (logError) {
      console.error('WEBHOOK: Failed to log webhook attempt:', logError);
    }

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