import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketingRecipient {
  clientId: string;
  clientName: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  daycareCredits: number;
  halfDaycareCredits: number;
  boardingCredits: number;
  pets: Array<{
    petId: string;
    petName: string;
    petBreed: string | null;
    daysSinceLastVisit: number | null;
    daysSinceLastGroom: number | null;
    lastVisitDate: string | null;
    lastGroomDate: string | null;
  }>;
}

interface MarketingWebhookPayload {
  channel: 'sms' | 'email';
  segmentName: string;
  segmentDescription?: string;
  filters: any[];
  message?: string;
  emailSubject?: string;
  emailContent?: string;
  recipients: MarketingRecipient[];
  sentAt: string;
  sentBy: string;
}

function resolveVariables(template: string, recipient: MarketingRecipient): string {
  const petNames = recipient.pets.map(p => p.petName).join(', ');
  const petBreeds = recipient.pets.map(p => p.petBreed).filter(Boolean).join(', ');
  const firstPet = recipient.pets[0];

  const vars: Record<string, string> = {
    client_first_name: recipient.clientFirstName || '',
    client_last_name: recipient.clientLastName || '',
    client_name: recipient.clientName || '',
    client_email: recipient.clientEmail || '',
    client_phone: recipient.clientPhone || '',
    pet_names: petNames,
    first_pet_name: firstPet?.petName || '',
    pet_breeds: petBreeds,
    daycare_credits: String(recipient.daycareCredits ?? 0),
    half_daycare_credits: String(recipient.halfDaycareCredits ?? 0),
    boarding_credits: String(recipient.boardingCredits ?? 0),
    days_since_last_visit: firstPet?.daysSinceLastVisit != null ? String(firstPet.daysSinceLastVisit) : 'N/A',
    days_since_last_groom: firstPet?.daysSinceLastGroom != null ? String(firstPet.daysSinceLastGroom) : 'N/A',
    last_visit_date: firstPet?.lastVisitDate || 'N/A',
    last_groom_date: firstPet?.lastGroomDate || 'N/A',
    business_name: 'Fella Fetch',
    business_phone: '',
    booking_link: '',
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return phone;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: MarketingWebhookPayload = await req.json();
    console.log('Marketing message triggered:', {
      channel: payload.channel,
      segmentName: payload.segmentName,
      recipientCount: payload.recipients.length,
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const messageTemplate = payload.message || '';

    if (payload.channel === 'sms') {
      // Send SMS directly via Telnyx through the send-sms function
      const smsRecipients = payload.recipients
        .filter(r => r.clientPhone)
        .map(r => ({
          to: normalizePhone(r.clientPhone) || '',
          message: resolveVariables(messageTemplate, r),
        }))
        .filter(r => r.to);

      if (smsRecipients.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No valid SMS recipients' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: smsResult, error: smsError } = await supabaseClient.functions.invoke('send-sms', {
        body: { recipients: smsRecipients },
      });

      if (smsError) {
        console.error('SMS send error:', smsError);
        return new Response(
          JSON.stringify({ success: false, error: 'SMS delivery failed', details: String(smsError) }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Marketing SMS sent:', smsResult);
      return new Response(
        JSON.stringify({ success: true, recipientCount: smsRecipients.length, smsResult }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // EMAIL channel - still uses webhook
    let emailWebhookUrl: string | undefined;

    const { data: settingsData } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'webhook_urls')
      .single();

    if (settingsData?.value) {
      const urls = settingsData.value as Record<string, string>;
      emailWebhookUrl = urls.marketing_email;
    }

    if (!emailWebhookUrl) {
      emailWebhookUrl = Deno.env.get('MARKETING_EMAIL_WEBHOOK_URL');
    }

    if (!emailWebhookUrl) {
      console.log('Email webhook URL not configured, skipping');
      return new Response(
        JSON.stringify({ success: true, message: 'Email webhook URL not configured, skipped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subjectTemplate = payload.emailSubject || '';

    const webhookPayload = {
      event: 'marketing.email',
      timestamp: new Date().toISOString(),
      data: {
        channel: payload.channel,
        segment_name: payload.segmentName,
        segment_description: payload.segmentDescription || null,
        filters: payload.filters,
        message_template: messageTemplate,
        email_subject_template: subjectTemplate,
        email_content: payload.emailContent || null,
        sent_at: payload.sentAt,
        sent_by: payload.sentBy,
        recipient_count: payload.recipients.length,
        recipients: payload.recipients.map(r => ({
          client_id: r.clientId,
          client_name: r.clientName,
          client_first_name: r.clientFirstName,
          client_last_name: r.clientLastName,
          client_email: r.clientEmail,
          client_phone: normalizePhone(r.clientPhone),
          resolved_message: resolveVariables(messageTemplate, r),
          resolved_subject: subjectTemplate ? resolveVariables(subjectTemplate, r) : null,
          daycare_credits: r.daycareCredits,
          half_daycare_credits: r.halfDaycareCredits,
          boarding_credits: r.boardingCredits,
          pets: r.pets.map(p => ({
            pet_id: p.petId,
            pet_name: p.petName,
            pet_breed: p.petBreed,
            days_since_last_visit: p.daysSinceLastVisit,
            days_since_last_groom: p.daysSinceLastGroom,
            last_visit_date: p.lastVisitDate,
            last_groom_date: p.lastGroomDate,
          })),
        })),
      },
    };

    console.log('Sending email webhook to:', emailWebhookUrl);

    const response = await fetch(emailWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });

    if (!response.ok) {
      console.error('Email webhook failed:', response.status, await response.text());
      return new Response(
        JSON.stringify({ success: false, error: 'Email webhook delivery failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Marketing email webhook sent successfully');
    return new Response(
      JSON.stringify({ success: true, recipientCount: payload.recipients.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in marketing-webhook:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
