import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check staff role
    const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: roles } = await serviceClient.from('user_roles').select('role').eq('user_id', user.id);
    const isStaff = roles?.some(r => r.role === 'admin' || r.role === 'staff');
    if (!isStaff) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { startDate, endDate } = await req.json();
    if (!startDate || !endDate) {
      return new Response(JSON.stringify({ error: 'startDate and endDate required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const shopifyToken = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
    if (!shopifyToken) {
      return new Response(JSON.stringify({ error: 'Shopify not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const shopDomain = 'fella-fetch.myshopify.com';
    const apiVersion = '2025-07';

    // Fetch orders from Shopify Admin API
    let allOrders: any[] = [];
    let pageInfo: string | null = null;
    let hasNext = true;

    while (hasNext) {
      let url = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?status=any&created_at_min=${startDate}T00:00:00Z&created_at_max=${endDate}T23:59:59Z&limit=250`;
      if (pageInfo) {
        url = `https://${shopDomain}/admin/api/${apiVersion}/orders.json?page_info=${pageInfo}&limit=250`;
      }

      const resp = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
          'Content-Type': 'application/json',
        },
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Shopify API error [${resp.status}]: ${errText}`);
      }

      const data = await resp.json();
      allOrders = allOrders.concat(data.orders || []);

      // Check pagination
      const linkHeader = resp.headers.get('Link') || '';
      const nextMatch = linkHeader.match(/<[^>]*page_info=([^>&]+)[^>]*>;\s*rel="next"/);
      if (nextMatch) {
        pageInfo = nextMatch[1];
      } else {
        hasNext = false;
      }
    }

    // Aggregate revenue
    let totalRevenue = 0;
    const revenueByMonth: Record<string, number> = {};
    const revenueByLineItem: Record<string, number> = {};
    const customerSpend: Record<string, { email: string; name: string; total: number }> = {};

    for (const order of allOrders) {
      const orderTotal = parseFloat(order.total_price || '0');
      totalRevenue += orderTotal;

      const month = order.created_at?.substring(0, 7) || 'unknown';
      revenueByMonth[month] = (revenueByMonth[month] || 0) + orderTotal;

      // Track customer spending
      const email = order.email || order.customer?.email || 'unknown';
      const name = order.customer ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() : 'Unknown';
      if (!customerSpend[email]) {
        customerSpend[email] = { email, name, total: 0 };
      }
      customerSpend[email].total += orderTotal;

      // Revenue by line item title (for service type breakdown)
      for (const item of order.line_items || []) {
        const title = item.title || 'Other';
        const itemTotal = parseFloat(item.price || '0') * (item.quantity || 1);
        revenueByLineItem[title] = (revenueByLineItem[title] || 0) + itemTotal;
      }
    }

    // Top spenders (VIP)
    const topSpenders = Object.values(customerSpend)
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);

    // Monthly revenue array sorted
    const monthlyRevenue = Object.entries(revenueByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({ month, total: Math.round(total * 100) / 100 }));

    return new Response(JSON.stringify({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      orderCount: allOrders.length,
      monthlyRevenue,
      revenueByLineItem,
      topSpenders,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Analytics revenue error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
