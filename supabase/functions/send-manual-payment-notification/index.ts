
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
    console.log('=== MANUAL PAYMENT NOTIFICATION STARTED ===');
    
    const { subscriptionId, type, adminDecision } = await req.json();
    console.log('Notification request:', { subscriptionId, type, adminDecision });

    if (!subscriptionId || !type) {
      throw new Error('Subscription ID and notification type are required');
    }

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get subscription details
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (subError || !subscription) {
      console.error('Failed to fetch subscription:', subError);
      throw new Error('Subscription not found');
    }

    console.log('Subscription found:', subscription.username, subscription.mobile);

    // If this is an approval notification, create VPN user first
    let vpnUserData = null;
    if (type === 'approved' && !subscription.marzban_user_created) {
      try {
        console.log('Creating VPN user for approved subscription...');
        
        // Call Marzneshin API to create user
        const createUserResponse = await fetch(`${Deno.env.get('MARZNESHIN_BASE_URL')}/api/user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getMarzneshinToken()}`
          },
          body: JSON.stringify({
            username: subscription.username,
            proxies: {
              vmess: {},
              vless: {}
            },
            data_limit: subscription.data_limit_gb * 1073741824, // Convert GB to bytes
            expire: Math.floor((Date.now() + (subscription.duration_days * 24 * 60 * 60 * 1000)) / 1000),
            status: 'active'
          })
        });

        if (createUserResponse.ok) {
          const userData = await createUserResponse.json();
          console.log('VPN user created successfully:', userData);
          
          // Get subscription URL
          if (userData.subscription_url) {
            vpnUserData = userData;
            
            // Update subscription with VPN details
            await supabase
              .from('subscriptions')
              .update({
                subscription_url: userData.subscription_url,
                marzban_user_created: true,
                status: 'active',
                expire_at: new Date(Date.now() + (subscription.duration_days * 24 * 60 * 60 * 1000)).toISOString()
              })
              .eq('id', subscriptionId);
          }
        } else {
          console.error('Failed to create VPN user:', await createUserResponse.text());
        }
      } catch (vpnError) {
        console.error('VPN user creation error:', vpnError);
        // Continue with notification even if VPN creation fails
      }
    }

    // Initialize Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      throw new Error('Email service not configured');
    }

    const resend = new Resend(resendApiKey);

    let emailSubject = '';
    let emailContent = '';

    if (type === 'confirmation') {
      emailSubject = 'Manual Payment Received - Under Review';
      emailContent = `
        <h2>Payment Confirmation</h2>
        <p>Dear ${subscription.username},</p>
        <p>We have received your manual payment for VPN subscription.</p>
        <h3>Order Details:</h3>
        <ul>
          <li><strong>Username:</strong> ${subscription.username}</li>
          <li><strong>Data Limit:</strong> ${subscription.data_limit_gb} GB</li>
          <li><strong>Duration:</strong> ${subscription.duration_days} days</li>
          <li><strong>Amount:</strong> ${subscription.price_toman.toLocaleString()} Toman</li>
        </ul>
        <p>Your payment is currently under review by our admin team. You will receive another email once your subscription is approved and activated.</p>
        <p>Thank you for choosing our VPN service!</p>
        <p>Best regards,<br>BoundlessNets Team</p>
      `;
    } else if (type === 'approved') {
      emailSubject = 'Payment Approved - VPN Subscription Activated!';
      emailContent = `
        <h2>🎉 Payment Approved!</h2>
        <p>Dear ${subscription.username},</p>
        <p>Great news! Your manual payment has been approved and your VPN subscription is now active.</p>
        <h3>Subscription Details:</h3>
        <ul>
          <li><strong>Username:</strong> ${subscription.username}</li>
          <li><strong>Data Limit:</strong> ${subscription.data_limit_gb} GB</li>
          <li><strong>Duration:</strong> ${subscription.duration_days} days</li>
          <li><strong>Expires:</strong> ${subscription.expire_at ? new Date(subscription.expire_at).toLocaleDateString() : 'Not set'}</li>
        </ul>
        ${vpnUserData?.subscription_url ? `
        <h3>Connection Details:</h3>
        <p>Your subscription URL: <code>${vpnUserData.subscription_url}</code></p>
        <p>You can also visit your delivery page to get the QR code and setup instructions.</p>
        <p><a href="https://bnets.co/delivery?subscriptionId=${subscriptionId}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Subscription Details</a></p>
        ` : '<p>Your subscription URL will be available shortly on your delivery page.</p>'}
        <p>Thank you for choosing our VPN service!</p>
        <p>Best regards,<br>BoundlessNets Team</p>
      `;
    } else if (type === 'rejected') {
      emailSubject = 'Payment Issue - Manual Review Required';
      emailContent = `
        <h2>Payment Review Update</h2>
        <p>Dear ${subscription.username},</p>
        <p>We've reviewed your manual payment submission and unfortunately we need to discuss this with you further.</p>
        <h3>Order Details:</h3>
        <ul>
          <li><strong>Username:</strong> ${subscription.username}</li>
          <li><strong>Amount:</strong> ${subscription.price_toman.toLocaleString()} Toman</li>
        </ul>
        <p>Please contact our support team for assistance with your payment.</p>
        <p>Best regards,<br>BoundlessNets Team</p>
      `;
    }

    // Extract email from mobile (assuming format like email@domain.com or just use a default pattern)
    // For now, we'll use a simple approach - in production, you'd want proper email collection
    const email = subscription.mobile.includes('@') ? subscription.mobile : `${subscription.username}@customer.bnets.co`;

    console.log('Sending email to:', email);

    const emailResponse = await resend.emails.send({
      from: 'BoundlessNets <noreply@bnets.co>',
      to: [email],
      subject: emailSubject,
      html: emailContent,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.id,
      message: 'Notification sent successfully',
      vpnUserCreated: !!vpnUserData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Email notification error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// Helper function to get Marzneshin authentication token
async function getMarzneshinToken() {
  try {
    const response = await fetch(`${Deno.env.get('MARZNESHIN_BASE_URL')}/api/admin/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'username': Deno.env.get('MARZNESHIN_ADMIN_USERNAME') ?? '',
        'password': Deno.env.get('MARZNESHIN_ADMIN_PASSWORD') ?? ''
      })
    });

    if (!response.ok) {
      throw new Error('Failed to authenticate with Marzneshin');
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Marzneshin authentication error:', error);
    throw error;
  }
}
