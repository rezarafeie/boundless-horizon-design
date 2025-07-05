-- Add English name field to vpn_services table
ALTER TABLE public.vpn_services 
ADD COLUMN name_en TEXT;