import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SHOPIFY_STORE_DOMAIN = 'fella-fetch.myshopify.com';
const SHOPIFY_API_VERSION = '2025-01';
const SHOPIFY_ADMIN_URL = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify JWT and get user claims
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing auth header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract and decode the JWT token to get user info
    const token = authHeader.replace('Bearer ', '');
    
    // Decode JWT payload (second part)
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('Invalid JWT format');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token format' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Decode the payload (base64url)
    let payload;
    try {
      payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      console.log('JWT payload decoded, sub:', payload.sub);
    } catch (decodeError) {
      console.log('Failed to decode JWT payload:', decodeError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verify the token is not expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.log('Token expired');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Token expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get user email from JWT payload
    const userEmail = payload.email as string;
    console.log('User email from token:', userEmail);
    
    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: 'User email not found in token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shopifyAdminToken = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
    if (!shopifyAdminToken) {
      console.error('SHOPIFY_ACCESS_TOKEN not configured');
      throw new Error('Shopify admin token not configured');
    }

    const { action } = await req.json();
    console.log('Action requested:', action);

    if (action === 'getCustomerAndOrders') {
      // First, find customer by email using Admin API
      const customerQuery = `
        query findCustomerByEmail($query: String!) {
          customers(first: 1, query: $query) {
            edges {
              node {
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
                orders(first: 50, sortKey: PROCESSED_AT, reverse: true) {
                  edges {
                    node {
                      id
                      name
                      processedAt
                      displayFinancialStatus
                      displayFulfillmentStatus
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

      console.log('Querying Shopify for customer with email:', userEmail);
      
      const response = await fetch(SHOPIFY_ADMIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': shopifyAdminToken,
        },
        body: JSON.stringify({
          query: customerQuery,
          variables: { query: `email:${userEmail}` },
        }),
      });

      const data = await response.json();
      console.log('Shopify response status:', response.status);

      if (data.errors) {
        console.error('Shopify errors:', data.errors);
        return new Response(
          JSON.stringify({ error: data.errors[0].message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const customerEdge = data.data?.customers?.edges?.[0];
      if (!customerEdge) {
        console.log('No Shopify customer found for email:', userEmail);
        // No Shopify customer found - that's OK, they can still use the portal
        return new Response(
          JSON.stringify({ 
            customer: null, 
            orders: [],
            message: 'No Shopify customer record found for this email'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const customer = customerEdge.node;
      console.log('Found Shopify customer:', customer.email, 'with', customer.orders.edges.length, 'orders');
      
      const orders = customer.orders.edges.map((edge: any) => {
        const node = edge.node;
        return {
          id: node.id,
          orderNumber: parseInt(node.name.replace('#', '')),
          processedAt: node.processedAt,
          financialStatus: node.displayFinancialStatus,
          fulfillmentStatus: node.displayFulfillmentStatus,
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
        JSON.stringify({
          customer: {
            id: customer.id,
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone,
            defaultAddress: customer.defaultAddress,
          },
          orders,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in shopify-customer-orders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
