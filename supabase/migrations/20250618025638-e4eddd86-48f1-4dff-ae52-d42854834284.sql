
-- Create table for storing Zarinpal direct payment contracts
CREATE TABLE public.zarinpal_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_mobile TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  payman_authority TEXT NOT NULL UNIQUE,
  signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, cancelled, expired
  expire_at TIMESTAMP WITH TIME ZONE NOT NULL,
  max_daily_count INTEGER NOT NULL,
  max_monthly_count INTEGER NOT NULL,
  max_amount BIGINT NOT NULL,
  bank_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  signed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Create table for tracking direct payment transactions
CREATE TABLE public.zarinpal_direct_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.zarinpal_contracts(id),
  subscription_id UUID REFERENCES public.subscriptions(id),
  authority TEXT NOT NULL,
  reference_id BIGINT,
  amount BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed
  error_message TEXT,
  zarinpal_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for better performance
CREATE INDEX idx_zarinpal_contracts_mobile ON public.zarinpal_contracts(user_mobile);
CREATE INDEX idx_zarinpal_contracts_authority ON public.zarinpal_contracts(payman_authority);
CREATE INDEX idx_zarinpal_contracts_status ON public.zarinpal_contracts(status);
CREATE INDEX idx_zarinpal_direct_payments_contract ON public.zarinpal_direct_payments(contract_id);
CREATE INDEX idx_zarinpal_direct_payments_subscription ON public.zarinpal_direct_payments(subscription_id);

-- Enable RLS
ALTER TABLE public.zarinpal_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zarinpal_direct_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for now since we don't have user authentication for mobile users)
CREATE POLICY "Allow all operations on zarinpal_contracts" ON public.zarinpal_contracts FOR ALL USING (true);
CREATE POLICY "Allow all operations on zarinpal_direct_payments" ON public.zarinpal_direct_payments FOR ALL USING (true);

-- Add trigger for updated_at
CREATE TRIGGER handle_updated_at_zarinpal_contracts
  BEFORE UPDATE ON public.zarinpal_contracts
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
