
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subscriptionId, receiptImageUrl } = await req.json();

    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get subscription details
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (fetchError || !subscription) {
      throw new Error('Subscription not found');
    }

    // Generate unique decision token
    const decisionToken = crypto.randomUUID();

    // Update subscription with decision token and receipt URL
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        admin_decision_token: decisionToken,
        receipt_image_url: receiptImageUrl,
        admin_decision: 'pending'
      })
      .eq('id', subscriptionId);

    if (updateError) {
      throw new Error('Failed to update subscription');
    }

    // Create accept and reject URLs
    const baseUrl = 'https://feamvyruipxtafzhptkh.supabase.co/functions/v1/handle-manual-payment-response';
    const acceptUrl = `${baseUrl}?token=${decisionToken}&action=approve`;
    const rejectUrl = `${baseUrl}?token=${decisionToken}&action=reject`;

    // Prepare email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Manual Payment Request</h2>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Payment Details</h3>
          <p><strong>Username:</strong> ${subscription.username}</p>
          <p><strong>Mobile:</strong> ${subscription.mobile}</p>
          <p><strong>Data Limit:</strong> ${subscription.data_limit_gb} GB</p>
          <p><strong>Duration:</strong> ${subscription.duration_days} days</p>
          <p><strong>Amount:</strong> ${subscription.price_toman.toLocaleString()} Toman</p>
          <p><strong>Submitted:</strong> ${new Date(subscription.created_at).toLocaleString()}</p>
        </div>

        <div style="background: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Bank Transfer Information</h3>
          <p><strong>Bank:</strong> Bank Mellat</p>
          <p><strong>Card Number:</strong> 6104-3378-8765-4321</p>
          <p><strong>Account Holder:</strong> Boundless Network Company</p>
        </div>

        ${receiptImageUrl ? `
          <div style="margin: 20px 0;">
            <h3>Receipt Image</h3>
            <p>Receipt uploaded by user - please verify the payment.</p>
          </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${acceptUrl}" 
             style="background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 0 10px; display: inline-block;">
            ✅ APPROVE PAYMENT
          </a>
          
          <a href="${rejectUrl}" 
             style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 0 10px; display: inline-block;">
            ❌ REJECT PAYMENT
          </a>
        </div>

        <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; font-size: 14px;">
          <p><strong>Note:</strong> Clicking approve will automatically generate the VPN subscription for the user. Clicking reject will notify the user that their payment was not verified.</p>
        </div>
      </div>
    `;

    // Send email
    const emailResult = await resend.emails.send({
      from: 'VPN Admin <admin@resend.dev>',
      to: ['rezarafeie13@gmail.com'],
      subject: `Manual Payment Request - ${subscription.username}`,
      html: emailHtml,
    });

    console.log('Email sent successfully:', emailResult);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Payment notification sent to admin',
      emailId: emailResult.data?.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Email sending error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
