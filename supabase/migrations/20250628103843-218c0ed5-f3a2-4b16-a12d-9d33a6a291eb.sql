
-- Add email column to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN email text;

-- Create email_notifications table to track sent emails
CREATE TABLE public.email_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id uuid REFERENCES public.subscriptions(id),
  email_type text NOT NULL, -- 'user_confirmation', 'admin_notification'
  recipient_email text NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false,
  error_message text,
  email_data jsonb
);

-- Add index for better performance
CREATE INDEX idx_email_notifications_subscription_id ON public.email_notifications(subscription_id);
CREATE INDEX idx_email_notifications_email_type ON public.email_notifications(email_type);
