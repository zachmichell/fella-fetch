import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SHOPIFY_STORE_DOMAIN = 'fella-fetch.myshopify.com';
const SHOPIFY_API_VERSION = '2025-07';
const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const storefrontToken = Deno.env.get('SHOPIFY_STOREFRONT_ACCESS_TOKEN');
    if (!storefrontToken) {
      throw new Error('Shopify storefront token not configured');
    }

    const { action, email, password, accessToken } = await req.json();

    // Create a Storefront Access Token using Admin API
    if (action === 'createStorefrontToken') {
      const adminToken = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
      if (!adminToken) {
        throw new Error('Shopify admin token not configured');
      }

      const createTokenMutation = `
        mutation storefrontAccessTokenCreate($input: StorefrontAccessTokenInput!) {
          storefrontAccessTokenCreate(input: $input) {
            storefrontAccessToken {
              accessToken
              title
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const response = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': adminToken,
        },
        body: JSON.stringify({
          query: createTokenMutation,
          variables: {
            input: {
              title: 'Lovable Client Portal Token',
            },
          },
        }),
      });

      const data = await response.json();
      console.log('Create storefront token response:', JSON.stringify(data, null, 2));

      if (data.errors) {
        return new Response(
          JSON.stringify({ error: data.errors[0].message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = data.data?.storefrontAccessTokenCreate;
      if (result?.userErrors?.length > 0) {
        return new Response(
          JSON.stringify({ error: result.userErrors[0].message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          storefrontToken: result?.storefrontAccessToken?.accessToken,
          title: result?.storefrontAccessToken?.title,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'login') {
      // Create customer access token (login)
      const loginMutation = `
        mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
          customerAccessTokenCreate(input: $input) {
            customerAccessToken {
              accessToken
              expiresAt
            }
            customerUserErrors {
              code
              field
              message
            }
          }
        }
      `;

      const response = await fetch(SHOPIFY_STOREFRONT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': storefrontToken,
        },
        body: JSON.stringify({
          query: loginMutation,
          variables: {
            input: { email, password },
          },
        }),
      });

      const data = await response.json();
      console.log('Shopify login response:', JSON.stringify(data, null, 2));

      if (data.errors) {
        return new Response(
          JSON.stringify({ error: data.errors[0].message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = data.data.customerAccessTokenCreate;
      if (result.customerUserErrors && result.customerUserErrors.length > 0) {
        return new Response(
          JSON.stringify({ error: result.customerUserErrors[0].message }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!result.customerAccessToken) {
        return new Response(
          JSON.stringify({ error: 'Invalid email or password' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch customer details
      const customerQuery = `
        query getCustomer($accessToken: String!) {
          customer(customerAccessToken: $accessToken) {
            id
            email
            firstName
            lastName
            phone
            defaultAddress {
              address1
              address2
              city
              province
              country
              zip
            }
          }
        }
      `;

      const customerResponse = await fetch(SHOPIFY_STOREFRONT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': storefrontToken,
        },
        body: JSON.stringify({
          query: customerQuery,
          variables: { accessToken: result.customerAccessToken.accessToken },
        }),
      });

      const customerData = await customerResponse.json();
      console.log('Customer data response:', JSON.stringify(customerData, null, 2));

      return new Response(
        JSON.stringify({
          accessToken: result.customerAccessToken.accessToken,
          expiresAt: result.customerAccessToken.expiresAt,
          customer: customerData.data?.customer || null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'getCustomer') {
      // Get customer details using access token
      const customerQuery = `
        query getCustomer($accessToken: String!) {
          customer(customerAccessToken: $accessToken) {
            id
            email
            firstName
            lastName
            phone
            defaultAddress {
              address1
              address2
              city
              province
              country
              zip
            }
          }
        }
      `;

      const response = await fetch(SHOPIFY_STOREFRONT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': storefrontToken,
        },
        body: JSON.stringify({
          query: customerQuery,
          variables: { accessToken },
        }),
      });

      const data = await response.json();
      
      if (data.errors || !data.data?.customer) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ customer: data.data.customer }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'getClientData') {
      // First verify the access token is valid
      const customerQuery = `
        query getCustomer($accessToken: String!) {
          customer(customerAccessToken: $accessToken) {
            email
          }
        }
      `;

      const customerResponse = await fetch(SHOPIFY_STOREFRONT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': storefrontToken,
        },
        body: JSON.stringify({
          query: customerQuery,
          variables: { accessToken },
        }),
      });

      const customerData = await customerResponse.json();
      
      if (customerData.errors || !customerData.data?.customer?.email) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const customerEmail = customerData.data.customer.email;

      // Create Supabase client with service role to bypass RLS
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Fetch client by email
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('email', customerEmail)
        .maybeSingle();

      if (clientError) {
        console.error('Error fetching client:', clientError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch client data' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!client) {
        return new Response(
          JSON.stringify({ client: null, pets: [], reservations: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch pets for this client
      const { data: pets, error: petsError } = await supabase
        .from('pets')
        .select(`
          *,
          pet_traits (*)
        `)
        .eq('client_id', client.id)
        .eq('is_active', true);

      if (petsError) {
        console.error('Error fetching pets:', petsError);
      }

      // Fetch reservations for client's pets
      const petIds = (pets || []).map(p => p.id);
      let reservations: any[] = [];
      
      if (petIds.length > 0) {
        const { data: reservationData, error: reservationsError } = await supabase
          .from('reservations')
          .select(`
            *,
            pets (id, name, breed, photo_url)
          `)
          .in('pet_id', petIds)
          .order('start_date', { ascending: false });

        if (reservationsError) {
          console.error('Error fetching reservations:', reservationsError);
        } else {
          reservations = reservationData || [];
        }
      }

      return new Response(
        JSON.stringify({ 
          client, 
          pets: pets || [], 
          reservations 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'getOrders') {
      // Get customer orders using Admin API for payment details
      const adminToken = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
      if (!adminToken) {
        throw new Error('Shopify admin token not configured');
      }

      // First get customer email from storefront API
      const customerQuery = `
        query getCustomer($accessToken: String!) {
          customer(customerAccessToken: $accessToken) {
            email
          }
        }
      `;

      const customerResponse = await fetch(SHOPIFY_STOREFRONT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': storefrontToken,
        },
        body: JSON.stringify({
          query: customerQuery,
          variables: { accessToken },
        }),
      });

      const customerData = await customerResponse.json();
      
      if (customerData.errors || !customerData.data?.customer?.email) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const customerEmail = customerData.data.customer.email;

      // Use Admin API to get orders with payment details
      const adminQuery = `
        query findCustomerByEmail($query: String!) {
          customers(first: 1, query: $query) {
            edges {
              node {
                orders(first: 50, sortKey: PROCESSED_AT, reverse: true) {
                  edges {
                    node {
                      id
                      name
                      processedAt
                      displayFinancialStatus
                      displayFulfillmentStatus
                      paymentGatewayNames
                      transactions(first: 10) {
                        gateway
                        kind
                        status
                        receiptJson
                      }
                      totalPriceSet {
                        shopMoney {
                          amount
                          currencyCode
                        }
                      }
                      subtotalPriceSet {
                        shopMoney {
                          amount
                          currencyCode
                        }
                      }
                      totalTaxSet {
                        shopMoney {
                          amount
                          currencyCode
                        }
                      }
                      lineItems(first: 50) {
                        edges {
                          node {
                            title
                            quantity
                            variant {
                              id
                              title
                              price
                              image {
                                url
                                altText
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const adminResponse = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': adminToken,
        },
        body: JSON.stringify({
          query: adminQuery,
          variables: { query: `email:${customerEmail}` },
        }),
      });

      const adminData = await adminResponse.json();
      console.log('Admin orders response:', JSON.stringify(adminData, null, 2));

      if (adminData.errors) {
        return new Response(
          JSON.stringify({ error: adminData.errors[0].message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const customer = adminData.data?.customers?.edges?.[0]?.node;
      if (!customer) {
        return new Response(
          JSON.stringify({ orders: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const orders = customer.orders.edges.map((edge: any) => {
        const node = edge.node;
        
        // Extract payment method info
        let paymentMethod: { type: string; last4?: string; brand?: string } | null = null;
        
        const successfulTransaction = node.transactions?.find(
          (t: any) => t.status === 'SUCCESS' && (t.kind === 'SALE' || t.kind === 'CAPTURE')
        ) || node.transactions?.find((t: any) => t.status === 'SUCCESS') || node.transactions?.[0];
        
        if (successfulTransaction?.receiptJson) {
          try {
            const receipt = typeof successfulTransaction.receiptJson === 'string' 
              ? JSON.parse(successfulTransaction.receiptJson) 
              : successfulTransaction.receiptJson;
            
            if (receipt.last_four || receipt.card_last_four || receipt.last4) {
              paymentMethod = {
                type: 'card',
                last4: receipt.last_four || receipt.card_last_four || receipt.last4,
                brand: receipt.card_brand || receipt.brand || receipt.card_type || undefined,
              };
            }
          } catch (e) {
            // JSON parsing failed, continue to gateway fallback
          }
        }
        
        // Fallback to gateway names if no card details found
        if (!paymentMethod && node.paymentGatewayNames?.length > 0) {
          const gateway = node.paymentGatewayNames[0].toLowerCase();
          if (gateway.includes('cash') || gateway.includes('manual')) {
            paymentMethod = { type: 'cash' };
          } else if (gateway.includes('gift') || gateway.includes('store_credit')) {
            paymentMethod = { type: 'gift_card' };
          } else {
            paymentMethod = { type: 'other', brand: node.paymentGatewayNames[0] };
          }
        }
        
        return {
          id: node.id,
          orderNumber: parseInt(node.name.replace('#', '')),
          processedAt: node.processedAt,
          financialStatus: node.displayFinancialStatus,
          fulfillmentStatus: node.displayFulfillmentStatus,
          paymentMethod,
          totalPrice: {
            amount: node.totalPriceSet.shopMoney.amount,
            currencyCode: node.totalPriceSet.shopMoney.currencyCode,
          },
          subtotalPrice: {
            amount: node.subtotalPriceSet.shopMoney.amount,
            currencyCode: node.subtotalPriceSet.shopMoney.currencyCode,
          },
          totalTax: {
            amount: node.totalTaxSet.shopMoney.amount,
            currencyCode: node.totalTaxSet.shopMoney.currencyCode,
          },
          lineItems: {
            edges: node.lineItems.edges.map((lineEdge: any) => ({
              node: {
                title: lineEdge.node.title,
                quantity: lineEdge.node.quantity,
                variant: lineEdge.node.variant ? {
                  id: lineEdge.node.variant.id,
                  title: lineEdge.node.variant.title,
                  price: {
                    amount: lineEdge.node.variant.price,
                    currencyCode: node.totalPriceSet.shopMoney.currencyCode,
                  },
                  image: lineEdge.node.variant.image,
                } : null,
              },
            })),
          },
        };
      });

      return new Response(
        JSON.stringify({ orders }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'logout') {
      // Delete customer access token
      const logoutMutation = `
        mutation customerAccessTokenDelete($customerAccessToken: String!) {
          customerAccessTokenDelete(customerAccessToken: $customerAccessToken) {
            deletedAccessToken
            userErrors {
              field
              message
            }
          }
        }
      `;

      const response = await fetch(SHOPIFY_STOREFRONT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': storefrontToken,
        },
        body: JSON.stringify({
          query: logoutMutation,
          variables: { customerAccessToken: accessToken },
        }),
      });

      const data = await response.json();
      console.log('Logout response:', JSON.stringify(data, null, 2));

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in shopify-customer-auth:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
