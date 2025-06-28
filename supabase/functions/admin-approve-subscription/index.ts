
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const subscriptionId = url.searchParams.get('id');
  const action = url.searchParams.get('action');
  const token = url.searchParams.get('token');

  if (!subscriptionId || !action || !token) {
    return new Response('Missing parameters', { status: 400 });
  }

  try {
    // Verify token (simple verification - in production, use more secure method)
    const decodedToken = atob(token);
    if (!decodedToken.startsWith(subscriptionId)) {
      return new Response('Invalid token', { status: 401 });
    }

    if (action === 'approve') {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          admin_decision: 'approved',
          admin_decided_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (error) {
        throw error;
      }

      return new Response(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #16a34a;">✅ Subscription Approved!</h1>
            <p>Subscription ${subscriptionId} has been approved successfully.</p>
            <p>The user will be notified automatically.</p>
            <a href="https://main.dpng3e8bkfgqh3s5.lovableproject.com/admin/users" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Go to Admin Panel
            </a>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    return new Response('Invalid action', { status: 400 });
  } catch (error) {
    console.error('Approval error:', error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
};

serve(handler);
