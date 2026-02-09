import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Escape special characters for iCal text fields */
function escapeIcal(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Format a date + optional time to iCal DTSTART format */
function formatIcalDate(date: string, time?: string | null): string {
  const d = date.replace(/-/g, "");
  if (time) {
    const t = time.replace(/:/g, "").substring(0, 6);
    return `${d}T${t}`;
  }
  return d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const clientId = url.searchParams.get("client_id");
    const token = url.searchParams.get("token");

    if (!clientId || !token) {
      return new Response("Missing client_id or token", { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the token matches the client's ID (simple hash-based verification)
    // Token = first 16 chars of client_id reversed + "ical"
    const expectedToken = clientId.split("").reverse().join("").substring(0, 16) + "ical";
    if (token !== expectedToken) {
      return new Response("Invalid token", { status: 403 });
    }

    // Verify client exists
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, first_name, last_name")
      .eq("id", clientId)
      .maybeSingle();

    if (clientError || !client) {
      return new Response("Client not found", { status: 404 });
    }

    // Get all upcoming reservations for this client's pets
    const today = new Date().toISOString().split("T")[0];
    const { data: reservations } = await supabase
      .from("reservations")
      .select(
        "id, start_date, start_time, end_date, end_time, status, service_type, notes, pets!inner(name, client_id), groomers(name)"
      )
      .eq("pets.client_id", clientId)
      .in("status", ["confirmed", "pending", "checked_in"])
      .gte("start_date", today)
      .order("start_date", { ascending: true });

    // Also include past 30 days for context
    const pastDate = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const { data: pastReservations } = await supabase
      .from("reservations")
      .select(
        "id, start_date, start_time, end_date, end_time, status, service_type, notes, pets!inner(name, client_id), groomers(name)"
      )
      .eq("pets.client_id", clientId)
      .in("status", ["checked_out", "confirmed"])
      .gte("start_date", pastDate)
      .lt("start_date", today)
      .order("start_date", { ascending: true });

    const allReservations = [...(pastReservations || []), ...(reservations || [])];

    // Get service type display names
    const { data: serviceTypes } = await supabase
      .from("service_types")
      .select("name, display_name");
    const stMap = new Map((serviceTypes || []).map((st: any) => [st.name, st.display_name]));

    // Build iCal
    const calName = `${client.first_name} ${client.last_name} — Fella & Fetch`;
    let ical = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Fella & Fetch//Pet Calendar//EN",
      `X-WR-CALNAME:${escapeIcal(calName)}`,
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-TIMEZONE:America/Regina",
    ];

    for (const res of allReservations) {
      const pet = (res as any).pets;
      const groomer = (res as any).groomers;
      const serviceName = stMap.get(res.service_type) || res.service_type;
      const petName = pet?.name || "Pet";

      const summary = `${petName} — ${serviceName}`;
      const dtStart = formatIcalDate(res.start_date, res.start_time);
      const dtEnd = res.end_date
        ? formatIcalDate(res.end_date, res.end_time)
        : res.start_time
          ? formatIcalDate(res.start_date, res.end_time || res.start_time)
          : formatIcalDate(res.start_date);

      const descParts: string[] = [];
      descParts.push(`Pet: ${petName}`);
      descParts.push(`Service: ${serviceName}`);
      descParts.push(`Status: ${res.status}`);
      if (groomer?.name) descParts.push(`Groomer: ${groomer.name}`);
      if (res.notes) descParts.push(`Notes: ${res.notes}`);

      const isAllDay = !res.start_time;

      ical.push("BEGIN:VEVENT");
      ical.push(`UID:${res.id}@fellaandfetch`);
      ical.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`);
      if (isAllDay) {
        ical.push(`DTSTART;VALUE=DATE:${dtStart}`);
        // For all-day events, end date should be the next day
        const endDate = res.end_date || res.start_date;
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        const endStr = end.toISOString().split("T")[0].replace(/-/g, "");
        ical.push(`DTEND;VALUE=DATE:${endStr}`);
      } else {
        ical.push(`DTSTART:${dtStart}`);
        ical.push(`DTEND:${dtEnd}`);
      }
      ical.push(`SUMMARY:${escapeIcal(summary)}`);
      ical.push(`DESCRIPTION:${escapeIcal(descParts.join("\\n"))}`);
      ical.push(`LOCATION:Fella & Fetch`);
      ical.push("END:VEVENT");
    }

    ical.push("END:VCALENDAR");

    return new Response(ical.join("\r\n"), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="fella-fetch-calendar.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error generating calendar:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
