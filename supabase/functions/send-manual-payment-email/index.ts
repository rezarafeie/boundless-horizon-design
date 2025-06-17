
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== MANUAL PAYMENT EMAIL FUNCTION STARTED ===');
    
    const { subscriptionId, receiptImageUrl } = await req.json();
    console.log('Request body:', { subscriptionId, receiptImageUrl });

    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }

    // Check if RESEND_API_KEY is configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    console.log('RESEND_API_KEY configured:', !!resendApiKey);
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not configured in edge function secrets');
      throw new Error('Email service not configured');
    }

    const resend = new Resend(resendApiKey);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Fetching subscription details for ID:', subscriptionId);

    // Get subscription details
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (fetchError || !subscription) {
      console.error('Subscription fetch error:', fetchError);
      throw new Error('Subscription not found');
    }

    console.log('Subscription found:', {
      username: subscription.username,
      mobile: subscription.mobile,
      amount: subscription.price_toman
    });

    // Generate unique decision token
    const decisionToken = crypto.randomUUID();
    console.log('Generated decision token:', decisionToken);

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
      console.error('Subscription update error:', updateError);
      throw new Error('Failed to update subscription');
    }

    console.log('Subscription updated with decision token');

    // Create accept and reject URLs
    const baseUrl = 'https://feamvyruipxtafzhptkh.supabase.co/functions/v1/handle-manual-payment-response';
    const acceptUrl = `${baseUrl}?token=${decisionToken}&action=approve`;
    const rejectUrl = `${baseUrl}?token=${decisionToken}&action=reject`;

    console.log('Decision URLs created:', { acceptUrl, rejectUrl });

    // Prepare email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>🔔 New Manual Payment Request</h2>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>💰 Payment Details</h3>
          <p><strong>Username:</strong> ${subscription.username}</p>
          <p><strong>Mobile:</strong> ${subscription.mobile}</p>
          <p><strong>Data Limit:</strong> ${subscription.data_limit_gb} GB</p>
          <p><strong>Duration:</strong> ${subscription.duration_days} days</p>
          <p><strong>Amount:</strong> ${subscription.price_toman.toLocaleString()} Toman</p>
          <p><strong>Submitted:</strong> ${new Date(subscription.created_at).toLocaleString()}</p>
        </div>

        <div style="background: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>🏦 Bank Transfer Information</h3>
          <p><strong>Bank:</strong> Bank Mellat</p>
          <p><strong>Card Number:</strong> 6104-3378-8765-4321</p>
          <p><strong>Account Holder:</strong> Boundless Network Company</p>
        </div>

        ${receiptImageUrl ? `
          <div style="margin: 20px 0;">
            <h3>📸 Receipt Image</h3>
            <p>Receipt uploaded by user - please verify the payment.</p>
            <p><a href="${receiptImageUrl}" target="_blank" style="color: #0066cc;">📂 View Receipt</a></p>
          </div>
        ` : `
          <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p><strong>⚠️ Note:</strong> No receipt image was uploaded by the user.</p>
          </div>
        `}

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
          <p><strong>📋 Instructions:</strong></p>
          <ul>
            <li>Clicking <strong>APPROVE</strong> will automatically generate the VPN subscription for the user</li>
            <li>Clicking <strong>REJECT</strong> will notify the user that their payment was not verified</li>
            <li>Please verify the payment details before making a decision</li>
          </ul>
        </div>
        
        <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; color: #666; font-size: 12px;">
          <p>This is an automated notification from the VPN subscription system.</p>
          <p>Subscription ID: ${subscriptionId}</p>
        </div>
      </div>
    `;

    console.log('Sending email to admin...');

    try {
      // Send email
      const emailResult = await resend.emails.send({
        from: 'VPN Admin <noreply@bnets.co>',
        to: ['rezarafeie13@gmail.com'],
        subject: `🔔 Manual Payment Request - ${subscription.username} (${subscription.price_toman.toLocaleString()} Toman)`,
        html: emailHtml,
      });

      console.log('Email send result:', emailResult);

      if (emailResult.error) {
        console.error('Email sending failed:', emailResult.error);
        throw new Error(`Email sending failed: ${emailResult.error.message}`);
      }

      console.log('Email sent successfully with ID:', emailResult.data?.id);

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Payment notification sent to admin',
        emailId: emailResult.data?.id 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (emailError) {
      console.error('Resend email error:', emailError);
      
      // Fallback: Try to use a simpler email format
      const simpleEmailResult = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: ['rezarafeie13@gmail.com'],
        subject: `Manual Payment - ${subscription.username}`,
        text: `New manual payment request:\n\nUsername: ${subscription.username}\nMobile: ${subscription.mobile}\nAmount: ${subscription.price_toman} Toman\nData: ${subscription.data_limit_gb} GB\nDuration: ${subscription.duration_days} days\n\nApprove: ${acceptUrl}\nReject: ${rejectUrl}`,
      });

      if (simpleEmailResult.error) {
        throw new Error(`Email sending failed: ${simpleEmailResult.error.message}`);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Payment notification sent to admin (fallback)',
        emailId: simpleEmailResult.data?.id 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
