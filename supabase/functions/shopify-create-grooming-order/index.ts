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

    // Fetch the groomer with Shopify staff ID
    let shopifyStaffId: string | null = null;
    let groomerName = 'Unassigned';

    if (reservation.groomer_id) {
      const { data: groomer } = await supabase
        .from('groomers')
        .select('name, shopify_staff_id')
        .eq('id', reservation.groomer_id)
        .single();

      if (groomer) {
        groomerName = groomer.name;
        shopifyStaffId = groomer.shopify_staff_id || null;
      }
    }

    // Parse service and groom type from notes
    const notes = reservation.notes || '';
    const serviceMatch = notes.match(/Service:\s*([^\n|]+)/);
    const groomTypeMatch = notes.match(/Groom Type:\s*([^\n|]+)/);
    const serviceName = serviceMatch ? serviceMatch[1].trim() : 'Grooming Service';
    const groomType = groomTypeMatch ? groomTypeMatch[1].trim() : null;

    const pet = reservation.pets as any;
    const client = pet.clients as any;
    const clientName = `${client.first_name} ${client.last_name}`.trim();
    const clientEmail = client.email || '';

    // Try to find the Shopify variant for proper line items
    let lineItems: any[] = [];

    try {
      // Search for the product in Shopify Admin API
      const searchUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products.json?title=${encodeURIComponent(serviceName)}&limit=5`;
      const productResponse = await fetch(searchUrl, {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      });

      if (productResponse.ok) {
        const productData = await productResponse.json();
        const products = productData.products || [];
        
        // Find matching product
        const matchingProduct = products.find(
          (p: any) => p.title.toLowerCase() === serviceName.toLowerCase()
        );

        if (matchingProduct) {
          // Find matching variant by groom type
          let matchingVariant = null;
          if (groomType) {
            matchingVariant = matchingProduct.variants.find(
              (v: any) => v.title.toLowerCase() === groomType.toLowerCase()
            );
          }
          // Fall back to first variant
          if (!matchingVariant && matchingProduct.variants.length > 0) {
            matchingVariant = matchingProduct.variants[0];
          }

          if (matchingVariant) {
            lineItems.push({
              variant_id: matchingVariant.id,
              quantity: 1,
            });
          }
        }
      }
    } catch (searchErr) {
      console.error('Error searching Shopify products:', searchErr);
    }

    // Fallback: custom line item if no variant found
    if (lineItems.length === 0) {
      const title = groomType 
        ? `${serviceName} - ${groomType}`
        : serviceName;
      
      lineItems.push({
        title,
        quantity: 1,
        price: reservation.price ? String(reservation.price) : '0.00',
      });
    }

    // Build the order payload
    const orderPayload: any = {
      order: {
        line_items: lineItems,
        financial_status: 'pending',
        note: `Grooming for ${pet.name} (${pet.breed || 'Unknown breed'}) | Groomer: ${groomerName} | Reservation: ${reservationId}`,
        tags: 'grooming, lovable-generated',
        note_attributes: [
          { name: 'reservation_id', value: reservationId },
          { name: 'pet_name', value: pet.name },
          { name: 'groomer_name', value: groomerName },
          { name: 'service_type', value: 'grooming' },
        ],
      },
    };

    // Link to Shopify staff for tip attribution
    if (shopifyStaffId) {
      orderPayload.order.user_id = parseInt(shopifyStaffId, 10);
    }

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
    const shopifyOrderId = String(orderData.order.id);
    const shopifyOrderName = orderData.order.name; // e.g., #1001

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
