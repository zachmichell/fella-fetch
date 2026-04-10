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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Load SMS webhook URL from system_settings
    const { data: smsSettings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'sms_webhook_config')
      .maybeSingle();

    const config = smsSettings?.value as { webhook_url: string; from_number?: string } | null;

    if (!config?.webhook_url) {
      console.error('SMS webhook URL not configured in settings');
      return new Response(
        JSON.stringify({ success: false, error: 'SMS webhook URL is not configured. Please set it in SMS & Communications settings.' }),
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

    const results: Array<{ to: string; status: string; error?: string }> = [];

    for (const msg of messages) {
      const toNormalized = normalizePhone(msg.to);
      if (!toNormalized) {
        results.push({ to: msg.to, status: 'skipped', error: 'Invalid phone number' });
        continue;
      }

      try {
        const payload: Record<string, string> = {
          to: toNormalized,
          message: msg.message,
        };
        if (config.from_number) {
          payload.from = config.from_number;
        }

        const response = await fetch(config.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          results.push({ to: toNormalized, status: 'sent' });
        } else {
          const errorText = await response.text();
          console.error(`Webhook error for ${toNormalized}:`, response.status, errorText);
          results.push({ to: toNormalized, status: 'failed', error: `Webhook ${response.status}` });
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
