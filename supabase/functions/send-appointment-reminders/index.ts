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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    // Try to get webhook URL from system_settings first, fall back to env secret
    let webhookUrl = Deno.env.get("REMINDER_SMS_WEBHOOK_URL") || "";
    const { data: webhookSettings } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "webhook_urls")
      .maybeSingle();

    if (webhookSettings?.value) {
      const urls = webhookSettings.value as Record<string, string>;
      if (urls.reminder_sms) {
        webhookUrl = urls.reminder_sms;
      }
    }

    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ error: "Reminder SMS webhook URL not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TEST MODE: Send a sample rendered message to the webhook
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

      // Get service type name
      const { data: st } = await supabase
        .from("service_types")
        .select("display_name")
        .eq("id", serviceTypeId)
        .maybeSingle();

      // Use override data if provided, otherwise sample data
      const clientName = testOverride?.client_name || "Test Client";
      const petNames = testOverride?.pet_names || "Buddy";
      const clientPhone = normalizePhone(testOverride?.client_phone || "+15555555555");
      const appointmentDate = testOverride?.date || new Date(Date.now() + 86400000).toISOString().split("T")[0];
      const appointmentTime = testOverride?.time || "08:00";
      const reservationId = testOverride?.reservation_id || "test-reservation-000";

      let message = config.message;
      message = message.replace(/\{\{client_name\}\}/g, clientName);
      message = message.replace(/\{\{pet_names\}\}/g, petNames);
      message = message.replace(/\{\{service_type\}\}/g, st?.display_name || "Daycare");
      message = message.replace(/\{\{date\}\}/g, appointmentDate);
      message = message.replace(/\{\{time\}\}/g, appointmentTime);
      message = message.replace(/\{\{business_name\}\}/g, "Fella & Fetch");

      const testPayload = {
        type: "appointment_reminder",
        client_id: testOverride?.client_id || "test-000",
        client_name: clientName,
        client_phone: clientPhone,
        pet_names: [petNames],
        service_type: st?.display_name || "Daycare",
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        message,
        reservation_id: reservationId,
      };

      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
      });

      const responseText = await webhookResponse.text();
      return new Response(
        JSON.stringify({
          mode: "test",
          webhookStatus: webhookResponse.status,
          webhookResponse: responseText,
          sentPayload: testPayload,
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

    const reminderSettings = settingsRow.value as Record<
      string,
      {
        enabled: boolean;
        message: string;
        timing_value: number;
        timing_unit: "hours" | "days";
      }
    >;

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

    for (const [serviceTypeId, config] of Object.entries(reminderSettings)) {
      if (!config.enabled || !config.message) continue;

      const serviceType = serviceTypeMap.get(serviceTypeId);
      if (!serviceType) continue;

      // Calculate the offset in milliseconds
      const offsetMs =
        config.timing_unit === "days"
          ? config.timing_value * 24 * 60 * 60 * 1000
          : config.timing_value * 60 * 60 * 1000;

      // Widen the date query to cover possible dates, then filter precisely using start_time
      const earliestApptTime = new Date(now.getTime() + offsetMs - 15 * 60 * 1000);
      const latestApptTime = new Date(now.getTime() + offsetMs + 15 * 60 * 1000);

      const queryStartDate = earliestApptTime.toISOString().split("T")[0];
      const queryEndDate = latestApptTime.toISOString().split("T")[0];

      const { data: reservations, error: resError } = await supabase
        .from("reservations")
        .select(
          "id, start_date, start_time, end_date, notes, status, pet_id, pets!inner(id, name, client_id, clients!inner(id, first_name, last_name, phone, sms_opt_in, sms_reminders_opt_in))"
        )
        .in("status", ["confirmed", "pending"])
        .gte("start_date", queryStartDate)
        .lte("start_date", queryEndDate);

      if (resError) {
        console.error(
          `Error querying reservations for ${serviceType.display_name}:`,
          resError
        );
        continue;
      }

      if (!reservations || reservations.length === 0) continue;

      // Precisely filter: combine start_date + start_time into a real datetime
      // and check if NOW is within the 30-min window around (appointment - offset)
      const filteredReservations = reservations.filter((res: any) => {
        const timeStr = res.start_time || "09:00"; // default to 9am if no time set
        const appointmentDt = new Date(`${res.start_date}T${timeStr}:00`);
        const reminderDt = new Date(appointmentDt.getTime() - offsetMs);
        const diffMs = Math.abs(now.getTime() - reminderDt.getTime());
        return diffMs <= 15 * 60 * 1000; // within ±15 minutes of ideal send time
      });

      if (filteredReservations.length === 0) continue;

      // Filter out reservations that already had a reminder sent
      const reservationIds = filteredReservations.map((r: any) => r.id);
      const { data: alreadySent } = await supabase
        .from("sent_reminders")
        .select("reservation_id")
        .eq("service_type_id", serviceTypeId)
        .in("reservation_id", reservationIds);

      const sentSet = new Set((alreadySent || []).map((r: any) => r.reservation_id));

      // Group by client to avoid sending duplicate reminders
      const clientReminders = new Map<
        string,
        { client: any; petNames: string[]; reservation: any; reservationIds: string[] }
      >();

      for (const res of filteredReservations) {
        if (sentSet.has(res.id)) continue; // Already sent

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
      // Send webhook for each client
      for (const [clientId, data] of clientReminders) {
        const { client, petNames, reservation, reservationIds: resIds } = data;

        // Replace dynamic variables in the message
        let message = config.message;
        message = message.replace(
          /\{\{client_name\}\}/g,
          `${client.first_name} ${client.last_name}`
        );
        message = message.replace(/\{\{pet_names\}\}/g, petNames.join(", "));
        message = message.replace(
          /\{\{service_type\}\}/g,
          serviceType.display_name
        );
        message = message.replace(
          /\{\{date\}\}/g,
          reservation.start_date || ""
        );
        message = message.replace(
          /\{\{time\}\}/g,
          reservation.start_time || ""
        );
        message = message.replace(
          /\{\{business_name\}\}/g,
          "Fella & Fetch"
        );

        // Send to webhook
        try {
          const webhookPayload = {
            type: "appointment_reminder",
            client_id: clientId,
            client_name: `${client.first_name} ${client.last_name}`,
            client_phone: normalizePhone(client.phone),
            pet_names: petNames,
            service_type: serviceType.display_name,
            appointment_date: reservation.start_date,
            appointment_time: reservation.start_time,
            message,
            reservation_id: reservation.id,
          };

          const webhookResponse = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(webhookPayload),
          });

          if (webhookResponse.ok) {
            // Record all reservation IDs as sent so they won't be sent again
            for (const rid of resIds) {
              await supabase.from("sent_reminders").upsert(
                { reservation_id: rid, service_type_id: serviceTypeId, client_id: clientId },
                { onConflict: "reservation_id,service_type_id" }
              );
            }
            totalSent++;
            results.push({
              client: `${client.first_name} ${client.last_name}`,
              service: serviceType.display_name,
              status: "sent",
            });
          } else {
            const errorText = await webhookResponse.text();
            results.push({
              client: `${client.first_name} ${client.last_name}`,
              service: serviceType.display_name,
              status: "failed",
              error: errorText,
            });
          }
        } catch (webhookError) {
          console.error("Webhook error:", webhookError);
          results.push({
            client: `${client.first_name} ${client.last_name}`,
            service: serviceType.display_name,
            status: "error",
            error: String(webhookError),
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ message: "Reminders processed", sent: totalSent, results }),
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
