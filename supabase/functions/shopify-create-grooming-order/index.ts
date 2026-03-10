import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SHOPIFY_STORE_DOMAIN = 'fella-fetch.myshopify.com';
const SHOPIFY_API_VERSION = '2025-07';

interface CreateGroomingOrderPayload {
  reservationId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SHOPIFY_ACCESS_TOKEN = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
    if (!SHOPIFY_ACCESS_TOKEN) {
      throw new Error('SHOPIFY_ACCESS_TOKEN is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { reservationId }: CreateGroomingOrderPayload = await req.json();
    if (!reservationId) {
      throw new Error('reservationId is required');
    }

    // Fetch reservation with pet and client data
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select('*, pets!inner(name, breed, client_id, clients!inner(first_name, last_name, email, phone))')
      .eq('id', reservationId)
      .single();

    if (resError || !reservation) {
      throw new Error(`Reservation not found: ${resError?.message || 'unknown'}`);
    }

    // Fetch the groomer name
    let groomerName = 'Unassigned';

    if (reservation.groomer_id) {
      const { data: groomer } = await supabase
        .from('groomers')
        .select('name')
        .eq('id', reservation.groomer_id)
        .single();

      if (groomer) {
        groomerName = groomer.name;
      }
    }

    // Parse service and groom type from notes (format: "Groom Type: Large / Level 2 | Service: Bath & Brush | ...")
    const notes = reservation.notes || '';
    const serviceMatch = notes.match(/Service:\s*([^|\n]+)/);
    const groomTypeMatch = notes.match(/Groom Type:\s*([^|\n]+)/);
    const serviceName = serviceMatch ? serviceMatch[1].trim() : 'Grooming Service';
    const groomType = groomTypeMatch ? groomTypeMatch[1].trim() : null;
    console.log(`Parsed from notes - Service: "${serviceName}", Groom Type: "${groomType}"`);

    const pet = reservation.pets as any;
    const client = pet.clients as any;
    const clientEmail = client.email || '';

    // Try to find the Shopify variant for proper line items
    let lineItems: any[] = [];

    try {
      const graphqlQuery = `
        {
          products(first: 10, query: "title:\\"${serviceName.replace(/"/g, '\\"')}\\"") {
            edges {
              node {
                id
                title
                variants(first: 50) {
                  edges {
                    node {
                      id
                      title
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const productResponse = await fetch(
        `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: graphqlQuery }),
        }
      );

      if (productResponse.ok) {
        const graphqlData = await productResponse.json();
        console.log('GraphQL product search response:', JSON.stringify(graphqlData));
        const productEdges = graphqlData?.data?.products?.edges || [];
        
        const matchingEdge = productEdges.find(
          (edge: any) => edge.node.title.toLowerCase() === serviceName.toLowerCase()
        );

        if (matchingEdge) {
          const product = matchingEdge.node;
          const variants = product.variants.edges.map((e: any) => e.node);
          console.log(`Found product "${product.title}" with ${variants.length} variants: ${variants.map((v: any) => v.title).join(', ')}`);
          
          let matchingVariant = null;
          if (groomType) {
            // Exact match on variant title
            matchingVariant = variants.find(
              (v: any) => v.title.toLowerCase() === groomType.toLowerCase()
            );
            console.log(`Variant match for "${groomType}": ${matchingVariant ? matchingVariant.title : 'NOT FOUND'}`);
          }
          if (!matchingVariant && variants.length > 0) {
            matchingVariant = variants[0];
            console.log(`Falling back to first variant: ${matchingVariant.title}`);
          }

          if (matchingVariant) {
            const numericId = matchingVariant.id.split('/').pop();
            lineItems.push({
              variant_id: parseInt(numericId, 10),
              quantity: 1,
            });
            console.log(`Using variant: ${matchingVariant.title} (${numericId})`);
          }
        } else {
          console.log(`No exact title match for "${serviceName}" among ${productEdges.length} results`);
        }
      } else {
        const errText = await productResponse.text();
        console.error(`GraphQL search failed: ${productResponse.status} - ${errText}`);
      }
    } catch (searchErr) {
      console.error('Error searching Shopify products:', searchErr);
    }

    // Fallback: custom line item if no variant found
    if (lineItems.length === 0) {
      const title = groomType ? `${serviceName} - ${groomType}` : serviceName;
      lineItems.push({
        title,
        quantity: 1,
        price: reservation.price ? String(reservation.price) : '0.00',
      });
    }

    // Format date and time for the note
    const groomDate = reservation.start_date || 'Unknown date';
    const groomTime = reservation.start_time || 'Unknown time';

    // Build note with groomer attribution and appointment details
    const orderNote = [
      `Grooming for ${pet.name} (${pet.breed || 'Unknown breed'})`,
      `Groomer: ${groomerName}`,
      `Date: ${groomDate}`,
      `Time: ${groomTime}`,
    ].filter(Boolean).join(' | ');

    // Build the order payload
    const orderPayload: any = {
      order: {
        line_items: lineItems,
        note: orderNote,
        tags: groomerName,
        note_attributes: [
          { name: 'reservation_id', value: reservationId },
          { name: 'pet_name', value: pet.name },
          { name: 'groomer_name', value: groomerName },
          { name: 'service_type', value: 'grooming' },
        ],
        financial_status: 'pending',
      },
    };

    // Add customer email if available
    if (clientEmail) {
      orderPayload.order.email = clientEmail;
    }

    // Create the order via Shopify Admin API
    const orderResponse = await fetch(
      `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      }
    );

    if (!orderResponse.ok) {
      const errorBody = await orderResponse.text();
      console.error('Shopify order creation failed:', orderResponse.status, errorBody);
      throw new Error(`Shopify order creation failed [${orderResponse.status}]: ${errorBody}`);
    }

    const orderData = await orderResponse.json();
    const order = orderData.order;
    const shopifyOrderId = String(order.id);
    const shopifyOrderName = order.name;

    console.log(`Shopify order created: ${shopifyOrderName} (${shopifyOrderId}) for reservation ${reservationId}`);

    return new Response(
      JSON.stringify({
        success: true,
        shopify_order_id: shopifyOrderId,
        shopify_order_name: shopifyOrderName,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Error creating grooming order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
