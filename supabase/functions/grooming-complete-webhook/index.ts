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
    console.log('Processing grooming complete SMS:', payload);

    // Render message template
    let message = settings.message || '';
    message = message.replace(/\{\{client_name\}\}/g, payload.clientName || '');
    message = message.replace(/\{\{pet_names\}\}/g, payload.petName || '');
    message = message.replace(/\{\{service_type\}\}/g, payload.serviceType || '');
    message = message.replace(/\{\{groomer_name\}\}/g, payload.groomerName || '');
    message = message.replace(/\{\{business_name\}\}/g, 'Fella & Fetch');

    const clientPhone = normalizePhone(payload.clientPhone);
    if (!clientPhone) {
      console.log('No valid phone number for client, skipping SMS');
      return new Response(
        JSON.stringify({ success: true, message: 'No valid phone number, skipped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send SMS via Telnyx using the send-sms function
    const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
      body: { to: clientPhone, message },
    });

    if (smsError) {
      console.error('Failed to send SMS:', smsError);
      return new Response(
        JSON.stringify({ success: false, error: 'SMS delivery failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Grooming pickup SMS sent successfully:', smsResult);
    return new Response(
      JSON.stringify({ success: true, message, smsResult }),
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
