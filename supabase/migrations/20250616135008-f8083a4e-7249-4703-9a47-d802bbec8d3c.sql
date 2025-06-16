
-- Create subscriptions table to track payment states and user subscriptions
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  mobile TEXT NOT NULL,
  data_limit_gb INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  price_toman INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'active', 'expired', 'cancelled')),
  marzban_user_created BOOLEAN DEFAULT false,
  subscription_url TEXT,
  expire_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  zarinpal_authority TEXT,
  zarinpal_ref_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment logs table for debugging and audit trail
CREATE TABLE public.payment_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('contract', 'verify', 'checkout')),
  request_data JSONB NOT NULL,
  response_data JSONB,
  status_code INTEGER,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscriptions
CREATE POLICY "Users can view their own subscriptions" 
  ON public.subscriptions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions" 
  ON public.subscriptions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" 
  ON public.subscriptions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- RLS policies for payment logs (read-only for users)
CREATE POLICY "Users can view logs for their subscriptions" 
  ON public.payment_logs 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions 
      WHERE subscriptions.id = payment_logs.subscription_id 
      AND subscriptions.user_id = auth.uid()
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscriptions table
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
