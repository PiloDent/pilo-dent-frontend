// supabase/functions/daily-post-treatment-nudges/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1️⃣ Compute yesterday’s date range
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0];

  // 2️⃣ Fetch treatments from yesterday that haven't been nudged
  const { data: entries, error: fetchErr } = await supabase
    .from("treatment_history")
    .select(`
      id,
      patient_id,
      created_at,
      treatments,
      patients(email, phone, first_name, last_name)
    `)
    .eq("nudge_sent", false)
    .like("created_at", `${dateStr}%`);

  if (fetchErr) {
    console.error("Error fetching treatments for nudges:", fetchErr);
    return new Response("Fetch error", { status: 500 });
  }

  for (const entry of entries || []) {
    const { id, patient_id, treatments: tx, patients } = entry;
    const { email, phone, first_name } = patients || {};

    // Build a simple instruction message
    const instructionLines = (tx || []).map((t: any) =>
      `• ${t.procedure}: please follow post-op care.`
    );
    const messageBody = `Hallo ${first_name},\n\nVielen Dank für Ihren Besuch am ${new Date(
      entry.created_at
    ).toLocaleDateString()}. Bitte beachten Sie folgende Hinweise:\n${instructionLines.join(
      "\n"
    )}\n\nGute Besserung!\nIhr PilotDent Team`;

    // 3️⃣ Send Email via SendGrid
    try {
      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("SENDGRID_API_KEY")!}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: Deno.env.get("EMAIL_FROM")! },
          subject: "Ihre Nachsorge-Hinweise",
          content: [{ type: "text/plain", value: messageBody }],
        }),
      });
    } catch (e) {
      console.error("SendGrid error for entry", id, e);
    }

    // 4️⃣ Optionally send SMS via Twilio
    try {
      const sid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
      const token = Deno.env.get("TWILIO_AUTH_TOKEN")!;
      const from = Deno.env.get("TWILIO_PHONE_FROM")!;
      const resp = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization:
              "Basic " +
              btoa(`${sid}:${token}`),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            From: from,
            To: phone,
            Body: messageBody,
          }),
        }
      );
      if (!resp.ok) {
        console.error("Twilio error for entry", id, await resp.text());
      }
    } catch (e) {
      console.error("Twilio exception for entry", id, e);
    }

    // 5️⃣ Mark as nudged
    await supabase
      .from("treatment_history")
      .update({ nudge_sent: true })
      .eq("id", id);
  }

  return new Response("Post-treatment nudges sent", { status: 200 });
});

