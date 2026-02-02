import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DaycareSubscription {
  id: string;
  client_id: string;
  pet_id: string;
  day_type: 'full' | 'half';
  half_day_period: 'morning' | 'afternoon' | null;
  days_of_week: number[];
  is_active: boolean;
  is_approved: boolean;
  notes: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is staff/admin
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is staff or admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (roleError || !roleData || !['staff', 'admin'].includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - staff access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get subscription ID from request body
    const { subscriptionId } = await req.json();
    
    if (!subscriptionId) {
      return new Response(
        JSON.stringify({ error: 'Missing subscriptionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the subscription
    const { data: subscription, error: subError } = await supabase
      .from('daycare_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ error: 'Subscription not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sub = subscription as DaycareSubscription;

    if (!sub.is_approved || !sub.is_active) {
      return new Response(
        JSON.stringify({ error: 'Subscription is not active or approved' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate reservations for the next 8 weeks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 56); // 8 weeks

    // Get existing reservations for this subscription to avoid duplicates
    const { data: existingReservations } = await supabase
      .from('reservations')
      .select('start_date')
      .eq('subscription_id', subscriptionId)
      .gte('start_date', today.toISOString().split('T')[0]);

    const existingDates = new Set(
      (existingReservations || []).map((r: { start_date: string }) => r.start_date)
    );

    // Build notes string
    const noteParts: string[] = [];
    noteParts.push(sub.day_type === 'half' ? 'Half Day' : 'Full Day');
    if (sub.half_day_period) {
      noteParts.push(`(${sub.half_day_period})`);
    }
    noteParts.push('| Recurring');
    if (sub.notes) {
      noteParts.push(`| ${sub.notes}`);
    }
    const reservationNotes = noteParts.join(' ');

    // Generate reservations for each matching day
    const reservationsToCreate: any[] = [];
    const currentDate = new Date(today);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      
      if (sub.days_of_week.includes(dayOfWeek)) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Skip if reservation already exists for this date
        if (!existingDates.has(dateStr)) {
          reservationsToCreate.push({
            pet_id: sub.pet_id,
            service_type: 'daycare',
            status: 'confirmed', // Auto-confirm since subscription is approved
            start_date: dateStr,
            notes: reservationNotes,
            subscription_id: subscriptionId,
          });
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Insert reservations in batches
    if (reservationsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('reservations')
        .insert(reservationsToCreate);

      if (insertError) {
        console.error('Error inserting reservations:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create reservations', details: insertError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created ${reservationsToCreate.length} reservations`,
        count: reservationsToCreate.length 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-subscription-reservations:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
