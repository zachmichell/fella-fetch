import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    if (action === 'getOrders') {
      // Get customer orders
      const ordersQuery = `
        query getCustomerOrders($accessToken: String!, $first: Int!) {
          customer(customerAccessToken: $accessToken) {
            orders(first: $first, sortKey: PROCESSED_AT, reverse: true) {
              edges {
                node {
                  id
                  orderNumber
                  processedAt
                  financialStatus
                  fulfillmentStatus
                  totalPrice {
                    amount
                    currencyCode
                  }
                  subtotalPrice {
                    amount
                    currencyCode
                  }
                  totalTax {
                    amount
                    currencyCode
                  }
                  lineItems(first: 50) {
                    edges {
                      node {
                        title
                        quantity
                        variant {
                          id
                          title
                          price {
                            amount
                            currencyCode
                          }
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
      `;

      const response = await fetch(SHOPIFY_STOREFRONT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': storefrontToken,
        },
        body: JSON.stringify({
          query: ordersQuery,
          variables: { accessToken, first: 50 },
        }),
      });

      const data = await response.json();
      console.log('Orders response:', JSON.stringify(data, null, 2));

      if (data.errors) {
        return new Response(
          JSON.stringify({ error: data.errors[0].message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!data.data?.customer) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const orders = data.data.customer.orders.edges.map((edge: any) => edge.node);

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
