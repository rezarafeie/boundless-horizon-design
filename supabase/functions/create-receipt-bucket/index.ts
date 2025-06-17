
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
    
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create the bucket for manual payment receipts
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('manual-payment-receipts', {
      public: false,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    });

    if (bucketError && !bucketError.message.includes('already exists')) {
      console.error('Bucket creation error:', bucketError);
      throw bucketError;
    }

    console.log('Bucket created or already exists:', bucket);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Receipt bucket ready' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Create bucket error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
