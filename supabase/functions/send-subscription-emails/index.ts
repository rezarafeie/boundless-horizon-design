
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface EmailRequest {
  subscriptionId: string;
  type: 'user_confirmation' | 'admin_notification';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subscriptionId, type }: EmailRequest = await req.json();

    // Fetch subscription data with plan details
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        subscription_plans (
          name_en,
          name_fa,
          description_en,
          description_fa
        )
      `)
      .eq('id', subscriptionId)
      .single();

    if (subError || !subscription) {
      throw new Error(`Subscription not found: ${subError?.message}`);
    }

    if (type === 'user_confirmation' && subscription.email) {
      await sendUserConfirmationEmail(subscription);
    }

    if (type === 'admin_notification') {
      await sendAdminNotificationEmail(subscription);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-subscription-emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

async function sendUserConfirmationEmail(subscription: any) {
  const deliveryUrl = `${Deno.env.get('SUPABASE_URL')?.replace('https://feamvyruipxtafzhptkh.supabase.co', 'https://main.dpng3e8bkfgqh3s5.lovableproject.com')}/delivery?id=${subscription.id}`;
  const expiryDate = subscription.expire_at ? new Date(subscription.expire_at).toLocaleDateString() : 'N/A';
  
  const userEmailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h1 style="color: #2563eb; text-align: center; margin-bottom: 30px;">🎉 Your VPN Subscription is Ready!</h1>
        
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #1e40af; margin-bottom: 15px;">Subscription Details</h2>
          <p><strong>Username:</strong> ${subscription.username}</p>
          <p><strong>Plan:</strong> ${subscription.subscription_plans?.name_en || 'N/A'}</p>
          <p><strong>Data Limit:</strong> ${subscription.data_limit_gb} GB</p>
          <p><strong>Duration:</strong> ${subscription.duration_days} days</p>
          <p><strong>Status:</strong> ${subscription.status}</p>
          ${subscription.expire_at ? `<p><strong>Expires:</strong> ${expiryDate}</p>` : ''}
        </div>

        ${subscription.subscription_url ? `
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #15803d; margin-bottom: 15px;">🔗 Your VPN Connection</h3>
            <p style="background-color: #e5e7eb; padding: 10px; border-radius: 5px; word-break: break-all; font-family: monospace;">
              ${subscription.subscription_url}
            </p>
            <p style="margin-top: 10px; color: #6b7280; font-size: 14px;">
              Copy this URL and import it into your VPN client application.
            </p>
          </div>
        ` : ''}

        <div style="text-align: center; margin-top: 30px;">
          <a href="${deliveryUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Full Details
          </a>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
          <p>Need help? Contact our support team.</p>
          <p style="margin-top: 10px;">Thank you for choosing Boundless Network!</p>
        </div>
      </div>
    </div>
  `;

  const emailResponse = await resend.emails.send({
    from: "Boundless Network <onboarding@resend.dev>",
    to: [subscription.email],
    subject: "🎉 Your VPN Subscription is Ready!",
    html: userEmailHtml,
  });

  // Log the email notification
  await supabase.from('email_notifications').insert({
    subscription_id: subscription.id,
    email_type: 'user_confirmation',
    recipient_email: subscription.email,
    success: !!emailResponse.data,
    error_message: emailResponse.error?.message,
    email_data: { emailResponse }
  });
}

async function sendAdminNotificationEmail(subscription: any) {
  const adminUrl = `${Deno.env.get('SUPABASE_URL')?.replace('https://feamvyruipxtafzhptkh.supabase.co', 'https://main.dpng3e8bkfgqh3s5.lovableproject.com')}/admin/users`;
  const approveUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/admin-approve-subscription?id=${subscription.id}&action=approve&token=${generateApprovalToken(subscription.id)}`;
  
  const adminEmailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h1 style="color: #dc2626; text-align: center; margin-bottom: 30px;">🚨 New Subscription Notification</h1>
        
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ef4444;">
          <h2 style="color: #dc2626; margin-bottom: 15px;">Subscription Details</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <p><strong>ID:</strong> ${subscription.id}</p>
            <p><strong>Username:</strong> ${subscription.username}</p>
            <p><strong>Mobile:</strong> ${subscription.mobile}</p>
            <p><strong>Email:</strong> ${subscription.email || 'N/A'}</p>
            <p><strong>Plan:</strong> ${subscription.subscription_plans?.name_en || 'N/A'}</p>
            <p><strong>Data Limit:</strong> ${subscription.data_limit_gb} GB</p>
            <p><strong>Duration:</strong> ${subscription.duration_days} days</p>
            <p><strong>Price:</strong> ${subscription.price_toman} Toman</p>
            <p><strong>Status:</strong> ${subscription.status}</p>
            <p><strong>Created:</strong> ${new Date(subscription.created_at).toLocaleString()}</p>
          </div>
        </div>

        ${subscription.zarinpal_authority ? `
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #1e40af; margin-bottom: 15px;">💳 Payment Information</h3>
            <p><strong>Zarinpal Authority:</strong> ${subscription.zarinpal_authority}</p>
            ${subscription.zarinpal_ref_id ? `<p><strong>Reference ID:</strong> ${subscription.zarinpal_ref_id}</p>` : ''}
          </div>
        ` : ''}

        ${subscription.notes ? `
          <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #92400e; margin-bottom: 15px;">📝 Notes</h3>
            <p>${subscription.notes}</p>
          </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${approveUrl}" style="background-color: #16a34a; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 15px;">
            ✅ APPROVE DIRECTLY
          </a>
          <a href="${adminUrl}" style="background-color: #2563eb; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            🏢 Admin Panel
          </a>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
          <p>This notification was sent automatically when a new subscription was created.</p>
          <p style="margin-top: 10px;">Boundless Network Admin System</p>
        </div>
      </div>
    </div>
  `;

  const emailResponse = await resend.emails.send({
    from: "Boundless Network Admin <onboarding@resend.dev>",
    to: ["bnetsmail@gmail.com"],
    subject: `🚨 New Subscription: ${subscription.username} - ${subscription.price_toman} Toman`,
    html: adminEmailHtml,
  });

  // Log the email notification
  await supabase.from('email_notifications').insert({
    subscription_id: subscription.id,
    email_type: 'admin_notification',
    recipient_email: 'bnetsmail@gmail.com',
    success: !!emailResponse.data,
    error_message: emailResponse.error?.message,
    email_data: { emailResponse }
  });
}

function generateApprovalToken(subscriptionId: string): string {
  // Simple token generation - in production, use a more secure method
  return btoa(`${subscriptionId}:${Date.now()}`);
}

serve(handler);
