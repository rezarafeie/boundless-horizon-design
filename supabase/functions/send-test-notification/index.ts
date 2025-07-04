import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendTestNotificationRequest {
  testUserId: string;
  email: string;
  phoneNumber: string;
  username: string;
  subscriptionUrl: string;
  expireDate: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('SEND_TEST_NOTIFICATION: Processing request...');
    
    const {
      testUserId,
      email,
      phoneNumber,
      username,
      subscriptionUrl,
      expireDate
    }: SendTestNotificationRequest = await req.json();

    console.log('SEND_TEST_NOTIFICATION: Request data:', {
      testUserId,
      email,
      phoneNumber: phoneNumber.substring(0, 4) + '***',
      username,
      hasSubscriptionUrl: !!subscriptionUrl
    });

    // Format expiration date
    const expireFormatted = new Date(expireDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "Boundless VPN <noreply@resend.dev>",
      to: [email],
      subject: "Your Free VPN Test Account - Ready to Use!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">🎉 Your Free VPN Test Account is Ready!</h1>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0;">Account Details</h2>
            <p><strong>Username:</strong> ${username}</p>
            <p><strong>Phone Number:</strong> ${phoneNumber}</p>
            <p><strong>Valid Until:</strong> ${expireFormatted}</p>
            <p><strong>Data Limit:</strong> 1 GB</p>
          </div>
          
          ${subscriptionUrl ? `
          <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #16a34a;">📱 Your VPN Configuration</h3>
            <p>Click the link below to download your VPN configuration:</p>
            <a href="${subscriptionUrl}" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">
              Download VPN Config
            </a>
            <p style="font-size: 14px; color: #666;">
              <strong>Note:</strong> This link contains your personal VPN configuration. Keep it secure and don't share it with others.
            </p>
          </div>
          ` : ''}
          
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #d97706;">⏰ Important</h3>
            <p>Your test account will expire on <strong>${expireFormatted}</strong>. After expiration, the VPN configuration will no longer work.</p>
            <p>If you need more time or want to upgrade to a full account, please contact our support team.</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #666; font-size: 14px;">
              Need help? Contact our support team or visit our website for setup guides.
            </p>
            <p style="color: #666; font-size: 14px;">
              Best regards,<br>
              The Boundless VPN Team
            </p>
          </div>
        </div>
      `,
    });

    console.log('SEND_TEST_NOTIFICATION: Email sent successfully:', emailResponse);

    // TODO: Add SMS notification using a service like Twilio
    // For now, we'll just log that SMS would be sent
    console.log('SEND_TEST_NOTIFICATION: SMS would be sent to:', phoneNumber.substring(0, 4) + '***');

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification sent successfully",
        emailSent: true,
        smsSent: false // Will be true when SMS is implemented
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('SEND_TEST_NOTIFICATION: Error sending notification:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: "Failed to send notification"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);