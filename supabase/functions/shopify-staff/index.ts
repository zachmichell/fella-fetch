import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SHOPIFY_ACCESS_TOKEN = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
    if (!SHOPIFY_ACCESS_TOKEN) {
      throw new Error('SHOPIFY_ACCESS_TOKEN is not configured');
    }

    const SHOPIFY_STORE_DOMAIN = 'fella-fetch.myshopify.com';
    const API_VERSION = '2025-07';

    // Fetch Shopify staff/users via Admin API
    const response = await fetch(
      `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${API_VERSION}/users.json`,
      {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shopify API error:', response.status, errorText);
      throw new Error(`Shopify API error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    
    // Return simplified staff list
    const staff = (data.users || []).map((user: any) => ({
      id: String(user.id),
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      account_owner: user.account_owner || false,
    }));

    return new Response(JSON.stringify({ staff }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error fetching Shopify staff:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
