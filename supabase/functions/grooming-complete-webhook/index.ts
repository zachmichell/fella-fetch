import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GroomingCompletePayload {
  reservationId: string;
  petName: string;
  clientName: string;
  groomerId?: string;
  completedAt: string;
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const webhookUrl = Deno.env.get('MAKE_WEBHOOK_URL');
    if (!webhookUrl) {
      console.log('MAKE_WEBHOOK_URL not configured, skipping webhook');
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook URL not configured, skipped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: GroomingCompletePayload = await req.json();
    console.log('Sending grooming complete webhook:', payload);

    const webhookPayload = {
      event: 'grooming.completed',
      timestamp: new Date().toISOString(),
      data: {
        reservation_id: payload.reservationId,
        pet_name: payload.petName,
        client_name: payload.clientName,
        groomer_id: payload.groomerId || null,
        completed_at: payload.completedAt,
        notes: payload.notes || null,
      },
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!response.ok) {
      console.error('Webhook failed:', response.status, await response.text());
      return new Response(
        JSON.stringify({ success: false, error: 'Webhook delivery failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Webhook sent successfully');
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in grooming-complete-webhook:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
