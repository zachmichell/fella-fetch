import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketingRecipient {
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
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
  message?: string; // SMS message content
  emailSubject?: string;
  emailContent?: string; // JSON stringified email blocks
  recipients: MarketingRecipient[];
  sentAt: string;
  sentBy: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: MarketingWebhookPayload = await req.json();
    console.log('Marketing webhook triggered:', {
      channel: payload.channel,
      segmentName: payload.segmentName,
      recipientCount: payload.recipients.length,
    });

    // Get the appropriate webhook URL based on channel
    const webhookUrl = payload.channel === 'sms'
      ? Deno.env.get('MARKETING_SMS_WEBHOOK_URL')
      : Deno.env.get('MARKETING_EMAIL_WEBHOOK_URL');

    if (!webhookUrl) {
      console.log(`${payload.channel.toUpperCase()} webhook URL not configured, skipping`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `${payload.channel.toUpperCase()} webhook URL not configured, skipped` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the webhook payload
    const webhookPayload = {
      event: `marketing.${payload.channel}`,
      timestamp: new Date().toISOString(),
      data: {
        channel: payload.channel,
        segment_name: payload.segmentName,
        segment_description: payload.segmentDescription || null,
        filters: payload.filters,
        sent_at: payload.sentAt,
        sent_by: payload.sentBy,
        recipient_count: payload.recipients.length,
        recipients: payload.recipients.map(r => ({
          client_id: r.clientId,
          client_name: r.clientName,
          client_email: r.clientEmail,
          client_phone: r.clientPhone,
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

    console.log('Sending webhook to:', webhookUrl);
    
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

    console.log('Marketing webhook sent successfully');
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
