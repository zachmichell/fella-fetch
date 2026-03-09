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

    // Use GraphQL Admin API to fetch staff members (works on all plans)
    const graphqlQuery = `
      {
        staffMembers(first: 50) {
          edges {
            node {
              id
              firstName
              lastName
              email
              isShopOwner
            }
          }
        }
      }
    `;

    const response = await fetch(
      `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: graphqlQuery }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shopify API error:', response.status, errorText);
      throw new Error(`Shopify API error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error('Shopify GraphQL errors:', JSON.stringify(data.errors));
      throw new Error(`Shopify GraphQL error: ${data.errors.map((e: any) => e.message).join(', ')}`);
    }

    const edges = data.data?.staffMembers?.edges || [];
    const staff = edges.map((edge: any) => {
      const node = edge.node;
      // Extract numeric ID from gid://shopify/StaffMember/12345
      const numericId = node.id.replace(/^gid:\/\/shopify\/StaffMember\//, '');
      return {
        id: numericId,
        first_name: node.firstName || '',
        last_name: node.lastName || '',
        email: node.email || '',
        account_owner: node.isShopOwner || false,
      };
    });

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
