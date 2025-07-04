
import { supabase } from '@/integrations/supabase/client';

interface WebhookPayload {
  type: 'new_subscription' | 'new_test_user';
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
  created_at: string;
}

export class WebhookService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 2000; // 2 seconds

  static async sendWithRetry(payload: WebhookPayload): Promise<{ success: boolean; error?: string }> {
    console.log('WEBHOOK_SERVICE: Starting webhook send with retry logic', payload);

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`WEBHOOK_SERVICE: Attempt ${attempt}/${this.MAX_RETRIES}`);
        
        const { data, error } = await supabase.functions.invoke('send-webhook-notification', {
          body: payload
        });

        if (error) {
          throw new Error(`Edge function error: ${error.message}`);
        }

        if (data && data.success) {
          console.log('WEBHOOK_SERVICE: Webhook sent successfully on attempt', attempt);
          return { success: true };
        } else {
          throw new Error(`Webhook failed: ${data?.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error(`WEBHOOK_SERVICE: Attempt ${attempt} failed:`, error);
        
        if (attempt === this.MAX_RETRIES) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('WEBHOOK_SERVICE: All retry attempts failed');
          return { success: false, error: errorMessage };
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
      }
    }

    return { success: false, error: 'Max retries exceeded' };
  }

  static async testWebhookEndpoint(): Promise<{ reachable: boolean; error?: string }> {
    try {
      console.log('WEBHOOK_SERVICE: Testing webhook endpoint connectivity');
      
      const testPayload = {
        type: 'test' as const,
        message: 'Webhook connectivity test',
        timestamp: new Date().toISOString()
      };

      const { data, error } = await supabase.functions.invoke('send-webhook-notification', {
        body: testPayload
      });

      if (error) {
        return { reachable: false, error: error.message };
      }

      return { reachable: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { reachable: false, error: errorMessage };
    }
  }
}
