import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Normalize phone to +1XXXXXXXXXX format */
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get API key from secure backend secret (trim whitespace)
    const telnyxApiKey = Deno.env.get('TELNYX_API_KEY')?.trim();
    if (!telnyxApiKey) {
      console.error('TELNYX_API_KEY secret is not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Telnyx API key is not configured. Please add it as a backend secret.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Load from-number from system_settings
    const { data: telnyxSettings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'telnyx_config')
      .maybeSingle();

    const config = telnyxSettings?.value as { from_number: string } | null;

    if (!config?.from_number) {
      console.error('Telnyx from number not configured in settings');
      return new Response(
        JSON.stringify({ success: false, error: 'Telnyx From Number is not configured. Please set it in SMS & Communications settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();

    // Support both single and bulk sends
    const messages: Array<{ to: string; message: string }> = [];

    if (body.recipients && Array.isArray(body.recipients)) {
      messages.push(...body.recipients);
    } else if (body.to && body.message) {
      messages.push({ to: body.to, message: body.message });
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request: provide {to, message} or {recipients: [{to, message}]}' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: Array<{ to: string; status: string; error?: string; telnyx_id?: string }> = [];

    for (const msg of messages) {
      const toNormalized = normalizePhone(msg.to);
      if (!toNormalized) {
        results.push({ to: msg.to, status: 'skipped', error: 'Invalid phone number' });
        continue;
      }

      try {
        const response = await fetch('https://api.telnyx.com/v2/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${telnyxApiKey}`,
          },
          body: JSON.stringify({
            from: config.from_number,
            to: toNormalized,
            text: msg.message,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          results.push({ to: toNormalized, status: 'sent', telnyx_id: data?.data?.id });
        } else {
          const errorText = await response.text();
          console.error(`Telnyx API error for ${toNormalized}:`, response.status, errorText);
          results.push({ to: toNormalized, status: 'failed', error: `Telnyx ${response.status}: ${errorText}` });
        }
      } catch (err) {
        console.error(`Error sending to ${toNormalized}:`, err);
        results.push({ to: toNormalized, status: 'error', error: String(err) });
      }
    }

    const sentCount = results.filter(r => r.status === 'sent').length;
    console.log(`SMS batch complete: ${sentCount}/${messages.length} sent`);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: messages.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-sms:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
