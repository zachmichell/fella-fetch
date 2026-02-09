import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Normalize phone to +1XXXXXXXXXX format for SMS delivery */
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

interface GroomingCompletePayload {
  reservationId: string;
  petName: string;
  clientName: string;
  clientPhone: string;
  groomerName: string;
  serviceType: string;
  completedAt: string;
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get webhook URL: prefer UI-configured, fall back to env secret
    let webhookUrl = Deno.env.get('MAKE_WEBHOOK_URL') || '';
    const { data: webhookSettings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'webhook_urls')
      .maybeSingle();

    if (webhookSettings?.value) {
      const urls = webhookSettings.value as Record<string, string>;
      if (urls.grooming_pickup) {
        webhookUrl = urls.grooming_pickup;
      }
    }

    if (!webhookUrl) {
      console.log('Grooming pickup webhook URL not configured, skipping');
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook URL not configured, skipped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get grooming pickup SMS settings
    const { data: pickupSettings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'grooming_pickup_sms')
      .maybeSingle();

    const settings = pickupSettings?.value as { enabled: boolean; message: string } | null;

    if (!settings?.enabled) {
      console.log('Grooming pickup SMS is disabled, skipping');
      return new Response(
        JSON.stringify({ success: true, message: 'Grooming pickup SMS disabled, skipped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: GroomingCompletePayload = await req.json();
    console.log('Processing grooming complete webhook:', payload);

    // Render message template
    let message = settings.message || '';
    message = message.replace(/\{\{client_name\}\}/g, payload.clientName || '');
    message = message.replace(/\{\{pet_names\}\}/g, payload.petName || '');
    message = message.replace(/\{\{service_type\}\}/g, payload.serviceType || '');
    message = message.replace(/\{\{groomer_name\}\}/g, payload.groomerName || '');
    message = message.replace(/\{\{business_name\}\}/g, 'Fella & Fetch');

    const webhookPayload = {
      event: 'grooming.completed',
      timestamp: new Date().toISOString(),
      data: {
        reservation_id: payload.reservationId,
        pet_name: payload.petName,
        client_name: payload.clientName,
        client_phone: normalizePhone(payload.clientPhone),
        groomer_name: payload.groomerName,
        service_type: payload.serviceType,
        completed_at: payload.completedAt,
        notes: payload.notes || null,
        message,
      },
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });

    if (!response.ok) {
      console.error('Webhook failed:', response.status, await response.text());
      return new Response(
        JSON.stringify({ success: false, error: 'Webhook delivery failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Grooming pickup webhook sent successfully');
    return new Response(
      JSON.stringify({ success: true, message: webhookPayload.data.message }),
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
