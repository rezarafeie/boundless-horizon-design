
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== CREATE RECEIPT BUCKET FUNCTION STARTED ===');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Creating bucket for manual payment receipts...');

    // Create the bucket for manual payment receipts
    const { data, error } = await supabase.storage.createBucket('manual-payment-receipts', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg'],
      fileSizeLimit: 5242880 // 5MB
    });

    if (error && error.message !== 'Bucket already exists') {
      console.error('Bucket creation error:', error);
      throw error;
    }

    console.log('Bucket created or already exists:', data);

    // Set up bucket policies for public access
    try {
      const policyResult = await supabase.storage
        .from('manual-payment-receipts')
        .createSignedUrl('test', 60);
      
      console.log('Bucket policy test result:', policyResult);
    } catch (policyError) {
      console.log('Bucket policy test failed (this is normal):', policyError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Receipt bucket created or already exists',
      data 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Bucket creation error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
