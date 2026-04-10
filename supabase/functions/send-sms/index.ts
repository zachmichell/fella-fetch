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

interface SmsWebhookConfig {
  single_webhook_url?: string;
  bulk_webhook_url?: string;
  webhook_url?: string; // legacy fallback
  from_number?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Load SMS webhook config from system_settings
    const { data: smsSettings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'sms_webhook_config')
      .maybeSingle();

    const config = smsSettings?.value as SmsWebhookConfig | null;

    // Resolve webhook URLs with legacy fallback
    const singleUrl = config?.single_webhook_url || config?.webhook_url || '';
    const bulkUrl = config?.bulk_webhook_url || '';

    const body = await req.json();

    // Determine if this is a single or bulk send
    const isBulk = body.recipients && Array.isArray(body.recipients) && body.recipients.length > 0;
    const isSingle = !isBulk && body.to && body.message;

    if (!isBulk && !isSingle) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request: provide {to, message} or {recipients: [{to, message}]}' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- SINGLE SMS ---
    if (isSingle) {
      if (!singleUrl) {
        return new Response(
          JSON.stringify({ success: false, error: 'Single SMS webhook URL is not configured. Please set it in SMS & Communications settings.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const toNormalized = normalizePhone(body.to);
      if (!toNormalized) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid phone number' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const payload: Record<string, string> = { to: toNormalized, message: body.message };
      if (config?.from_number) payload.from = config.from_number;

      try {
        const response = await fetch(singleUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          console.log(`Single SMS sent to ${toNormalized}`);
          return new Response(
            JSON.stringify({ success: true, sent: 1, total: 1, results: [{ to: toNormalized, status: 'sent' }] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          const errorText = await response.text();
          console.error(`Single webhook error for ${toNormalized}:`, response.status, errorText);
          return new Response(
            JSON.stringify({ success: true, sent: 0, total: 1, results: [{ to: toNormalized, status: 'failed', error: `Webhook ${response.status}` }] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (err) {
        console.error(`Error sending single SMS to ${toNormalized}:`, err);
        return new Response(
          JSON.stringify({ success: true, sent: 0, total: 1, results: [{ to: toNormalized, status: 'error', error: String(err) }] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // --- BULK SMS ---
    if (!bulkUrl) {
      // Fallback: if no bulk URL but single URL exists, send individually
      if (singleUrl) {
        console.log('No bulk webhook configured, falling back to single webhook for each recipient');
        const messages = body.recipients as Array<{ to: string; message: string }>;
        const results: Array<{ to: string; status: string; error?: string }> = [];

        for (const msg of messages) {
          const toNormalized = normalizePhone(msg.to);
          if (!toNormalized) {
            results.push({ to: msg.to, status: 'skipped', error: 'Invalid phone number' });
            continue;
          }

          try {
            const payload: Record<string, string> = { to: toNormalized, message: msg.message };
            if (config?.from_number) payload.from = config.from_number;

            const response = await fetch(singleUrl, {
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
        console.log(`SMS batch (via single webhook) complete: ${sentCount}/${messages.length} sent`);
        return new Response(
          JSON.stringify({ success: true, sent: sentCount, total: messages.length, results }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: 'Bulk SMS webhook URL is not configured. Please set it in SMS & Communications settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send all recipients to bulk webhook in a single call
    const messages = body.recipients as Array<{ to: string; message: string }>;
    const normalizedRecipients = messages
      .map(msg => ({ to: normalizePhone(msg.to), message: msg.message }))
      .filter(msg => msg.to);

    const bulkPayload: Record<string, unknown> = {
      recipients: normalizedRecipients,
    };
    if (config?.from_number) bulkPayload.from = config.from_number;

    try {
      const response = await fetch(bulkUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkPayload),
      });

      if (response.ok) {
        console.log(`Bulk SMS sent: ${normalizedRecipients.length} recipients`);
        return new Response(
          JSON.stringify({
            success: true,
            sent: normalizedRecipients.length,
            total: messages.length,
            results: normalizedRecipients.map(r => ({ to: r.to, status: 'sent' })),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const errorText = await response.text();
        console.error('Bulk webhook error:', response.status, errorText);
        return new Response(
          JSON.stringify({
            success: true,
            sent: 0,
            total: messages.length,
            results: normalizedRecipients.map(r => ({ to: r.to, status: 'failed', error: `Webhook ${response.status}` })),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (err) {
      console.error('Error sending bulk SMS:', err);
      return new Response(
        JSON.stringify({ success: false, error: String(err) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in send-sms:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
