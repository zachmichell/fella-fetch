import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Normalize phone to +1XXXXXXXXXX format for SMS delivery */
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

/**
 * Convert a local date string + time string in a given IANA timezone to a UTC Date.
 * e.g. toUTC("2025-07-15", "09:00", "America/New_York") => Date representing 13:00 UTC
 */
function toUTC(dateStr: string, timeStr: string, tz: string): Date {
  // Build an ISO-ish string and use the timezone to figure out the offset
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);

  // Create a date in UTC first as a starting point
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  // Use Intl to find what the local time would be in the target timezone at this UTC moment
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(utcGuess);
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');

  const localAtGuess = new Date(Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')));
  const offsetMs = localAtGuess.getTime() - utcGuess.getTime();

  // The actual UTC time = desired local time - offset
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0) - offsetMs);
}

/** Map settings timezone keys to IANA timezone names */
const TZ_MAP: Record<string, string> = {
  'America/Regina': 'America/Regina',
  'America/New_York': 'America/New_York',
  'America/Chicago': 'America/Chicago',
  'America/Denver': 'America/Denver',
  'America/Phoenix': 'America/Phoenix',
  'America/Los_Angeles': 'America/Los_Angeles',
  'America/Anchorage': 'America/Anchorage',
  'Pacific/Honolulu': 'Pacific/Honolulu',
  'America/Puerto_Rico': 'America/Puerto_Rico',
  'US/Eastern': 'America/New_York',
  'US/Central': 'America/Chicago',
  'US/Mountain': 'America/Denver',
  'US/Pacific': 'America/Los_Angeles',
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReminderConfig {
  enabled: boolean;
  message: string;
  timing_value: number;
  timing_unit: "hours" | "days";
  secondary_enabled?: boolean;
  secondary_message?: string;
  secondary_timing_value?: number;
  secondary_timing_unit?: "hours" | "days";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if this is a test request
    let isTest = false;
    let testServiceTypeId = "";
    let testOverride: Record<string, string> | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.test === true) {
          isTest = true;
          testServiceTypeId = body.service_type_id || "";
          testOverride = body.override || null;
        }
      } catch { /* no body or invalid JSON, proceed normally */ }
    }

    // TEST MODE: Send a sample rendered message via Telnyx
    if (isTest) {
      const { data: settingsRow } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "sms_reminder_settings")
        .maybeSingle();

      const reminderSettings = settingsRow?.value as Record<string, any> || {};
      const serviceTypeId = testServiceTypeId || Object.keys(reminderSettings)[0];
      const config = reminderSettings[serviceTypeId];

      if (!config?.message) {
        return new Response(
          JSON.stringify({ error: "No reminder template found for the specified service type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: st } = await supabase
        .from("service_types")
        .select("display_name")
        .eq("id", serviceTypeId)
        .maybeSingle();

      const clientName = testOverride?.client_name || "Test Client";
      const petNames = testOverride?.pet_names || "Buddy";
      const clientPhone = normalizePhone(testOverride?.client_phone || "+15555555555");
      const appointmentDate = testOverride?.date || new Date(Date.now() + 86400000).toISOString().split("T")[0];
      const appointmentTime = testOverride?.time || "08:00";

      let message = config.message;
      const clientFirstName = testOverride?.client_first_name || clientName.split(' ')[0];
      message = message.replace(/\{\{client_first_name\}\}/g, clientFirstName);
      message = message.replace(/\{\{client_name\}\}/g, clientName);
      message = message.replace(/\{\{pet_names\}\}/g, petNames);
      message = message.replace(/\{\{service_type\}\}/g, st?.display_name || "Daycare");
      message = message.replace(/\{\{date\}\}/g, appointmentDate);
      message = message.replace(/\{\{time\}\}/g, appointmentTime);
      message = message.replace(/\{\{business_name\}\}/g, "Fella & Fetch");

      const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
        body: { to: clientPhone, message },
      });

      return new Response(
        JSON.stringify({
          mode: "test",
          message,
          phone: clientPhone,
          smsResult,
          smsError: smsError ? String(smsError) : null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Load reminder settings
    const { data: settingsRow, error: settingsError } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "sms_reminder_settings")
      .maybeSingle();

    if (settingsError) throw settingsError;
    if (!settingsRow?.value) {
      return new Response(
        JSON.stringify({ message: "No reminder settings configured", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reminderSettings = settingsRow.value as Record<string, ReminderConfig>;

    // 1b. Load business timezone
    const { data: tzRow } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "business_timezone")
      .maybeSingle();

    const rawTz = typeof tzRow?.value === 'string' ? tzRow.value : (tzRow?.value as any)?.timezone || 'America/New_York';
    const businessTz = TZ_MAP[rawTz] || rawTz || 'America/New_York';
    console.log(`Using business timezone: ${businessTz}`);

    // 2. Load service types to map IDs to names
    const { data: serviceTypes } = await supabase
      .from("service_types")
      .select("id, display_name, name, category");

    const serviceTypeMap = new Map(
      (serviceTypes || []).map((st: any) => [st.id, st])
    );

    // 3. For each enabled reminder, find reservations in the reminder window
    const now = new Date();
    let totalSent = 0;
    const results: any[] = [];

    // Build a list of reminder jobs: primary + secondary per service type
    interface ReminderJob {
      serviceTypeId: string;
      config: ReminderConfig;
      offsetMs: number;
      messageTemplate: string;
      reminderType: string; // "primary" | "secondary"
    }

    const jobs: ReminderJob[] = [];

    for (const [serviceTypeId, config] of Object.entries(reminderSettings)) {
      if (!config.enabled || !config.message) continue;
      if (!serviceTypeMap.has(serviceTypeId)) continue;

      // Primary reminder
      const primaryOffsetMs =
        config.timing_unit === "days"
          ? config.timing_value * 24 * 60 * 60 * 1000
          : config.timing_value * 60 * 60 * 1000;

      jobs.push({
        serviceTypeId,
        config,
        offsetMs: primaryOffsetMs,
        messageTemplate: config.message,
        reminderType: "primary",
      });

      // Secondary reminder
      if (config.secondary_enabled && config.secondary_message) {
        const secondaryOffsetMs =
          (config.secondary_timing_unit === "days"
            ? (config.secondary_timing_value || 1) * 24 * 60 * 60 * 1000
            : (config.secondary_timing_value || 1) * 60 * 60 * 1000);

        jobs.push({
          serviceTypeId,
          config,
          offsetMs: secondaryOffsetMs,
          messageTemplate: config.secondary_message,
          reminderType: "secondary",
        });
      }
    }

    for (const job of jobs) {
      const serviceType = serviceTypeMap.get(job.serviceTypeId);
      if (!serviceType) continue;

      // Calculate the window of appointment times we should be sending reminders for
      // Target appointment UTC time = now + offset (meaning the reminder should fire now)
      const targetApptUtc = new Date(now.getTime() + job.offsetMs);

      // Query reservations around the target date
      // We need a wider date range because timezone conversion may shift dates
      const dayBefore = new Date(targetApptUtc.getTime() - 48 * 60 * 60 * 1000).toISOString().split("T")[0];
      const dayAfter = new Date(targetApptUtc.getTime() + 48 * 60 * 60 * 1000).toISOString().split("T")[0];

      const { data: reservations, error: resError } = await supabase
        .from("reservations")
        .select(
          "id, start_date, start_time, end_date, notes, status, pet_id, pets!inner(id, name, client_id, clients!inner(id, first_name, last_name, phone, sms_opt_in, sms_reminders_opt_in))"
        )
        .in("status", ["confirmed", "pending"])
        .gte("start_date", dayBefore)
        .lte("start_date", dayAfter);

      if (resError) {
        console.error(`Error querying reservations for ${serviceType.display_name}:`, resError);
        continue;
      }

      if (!reservations || reservations.length === 0) continue;

      // Filter: check if now is within ±15 min of when the reminder should fire
      const filteredReservations = reservations.filter((res: any) => {
        const timeStr = res.start_time || "09:00";
        // Convert the appointment's local date+time to UTC using the business timezone
        const appointmentUtc = toUTC(res.start_date, timeStr, businessTz);
        const reminderFireTime = new Date(appointmentUtc.getTime() - job.offsetMs);
        const diffMs = Math.abs(now.getTime() - reminderFireTime.getTime());
        return diffMs <= 15 * 60 * 1000;
      });

      if (filteredReservations.length === 0) continue;

      // Dedup key includes reminder type to allow both primary and secondary
      const dedupSuffix = job.reminderType === "secondary" ? "_secondary" : "";
      const dedupServiceTypeId = job.serviceTypeId + dedupSuffix;

      const reservationIds = filteredReservations.map((r: any) => r.id);
      const { data: alreadySent } = await supabase
        .from("sent_reminders")
        .select("reservation_id")
        .eq("service_type_id", dedupServiceTypeId)
        .in("reservation_id", reservationIds);

      const sentSet = new Set((alreadySent || []).map((r: any) => r.reservation_id));

      const clientReminders = new Map<
        string,
        { client: any; petNames: string[]; reservation: any; reservationIds: string[] }
      >();

      for (const res of filteredReservations) {
        if (sentSet.has(res.id)) continue;

        const pet = (res as any).pets;
        const client = pet?.clients;
        if (!client?.phone || client.sms_reminders_opt_in === false) continue;

        const clientId = client.id;
        if (!clientReminders.has(clientId)) {
          clientReminders.set(clientId, {
            client,
            petNames: [],
            reservation: res,
            reservationIds: [],
          });
        }
        const entry = clientReminders.get(clientId)!;
        entry.petNames.push(pet.name);
        entry.reservationIds.push(res.id);
      }

      // Send SMS for each client
      for (const [clientId, data] of clientReminders) {
        const { client, petNames, reservation, reservationIds: resIds } = data;

        let message = job.messageTemplate;
        message = message.replace(/\{\{client_first_name\}\}/g, client.first_name || '');
        message = message.replace(/\{\{client_name\}\}/g, `${client.first_name} ${client.last_name}`);
        message = message.replace(/\{\{pet_names\}\}/g, petNames.join(", "));
        message = message.replace(/\{\{service_type\}\}/g, serviceType.display_name);
        message = message.replace(/\{\{date\}\}/g, reservation.start_date || "");
        message = message.replace(/\{\{time\}\}/g, reservation.start_time || "");
        message = message.replace(/\{\{business_name\}\}/g, "Fella & Fetch");

        try {
          const clientPhone = normalizePhone(client.phone);

          const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
            body: { to: clientPhone, message },
          });

          if (!smsError && smsResult?.success) {
            for (const rid of resIds) {
              await supabase.from("sent_reminders").upsert(
                { reservation_id: rid, service_type_id: dedupServiceTypeId, client_id: clientId },
                { onConflict: "reservation_id,service_type_id" }
              );
            }
            totalSent++;
            results.push({
              client: `${client.first_name} ${client.last_name}`,
              service: serviceType.display_name,
              reminderType: job.reminderType,
              status: "sent",
            });
          } else {
            results.push({
              client: `${client.first_name} ${client.last_name}`,
              service: serviceType.display_name,
              reminderType: job.reminderType,
              status: "failed",
              error: smsError ? String(smsError) : smsResult?.error,
            });
          }
        } catch (smsErr) {
          console.error("SMS error:", smsErr);
          results.push({
            client: `${client.first_name} ${client.last_name}`,
            service: serviceType.display_name,
            reminderType: job.reminderType,
            status: "error",
            error: String(smsErr),
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ message: "Reminders processed", sent: totalSent, results, timezone: businessTz }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing reminders:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
