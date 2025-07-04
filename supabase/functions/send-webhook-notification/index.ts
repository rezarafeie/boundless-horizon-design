import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  type: 'new_subscription' | 'new_test_user';
  webhook_type: 'testuser' | 'newsub' | 'paymentpending';
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
  // Complete subscription data for paymentpending webhooks
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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();
    
    // Only include approve/reject links for payment pending webhooks (manual payments)
    const finalPayload = { ...payload };
    if (payload.webhook_type !== 'paymentpending') {
      delete finalPayload.approve_link;
      delete finalPayload.reject_link;
    }
    
    console.log('WEBHOOK: Sending notification to n8n:', finalPayload);

    const webhookUrl = 'https://rafeie.app.n8n.cloud/webhook-test/bnetswewbmailnewusernotification';
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(finalPayload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.text();
    console.log('WEBHOOK: Success response from n8n:', result);

    return new Response(JSON.stringify({ 
      success: true, 
      webhook_response: result 
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