// supabase/functions/send-reminder/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Compute tomorrow’s date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split("T")[0];

  // Fetch tomorrow’s appointments with patient info
  const { data: appts, error } = await supabase
    .from("appointments")
    .select("id, appointment_time, patients(first_name, last_name, email, phone)")
    .eq("date", dateStr)
    .eq("checked_in", false);

  if (error) {
    console.error("Error fetching appointments:", error);
    return new Response("Error", { status: 500 });
  }

  for (const appt of appts) {
    const { id, appointment_time, patients: p } = appt;
    const patientName = `${p.first_name} ${p.last_name}`;

    // Prepare email via SendGrid
    const emailMsg = {
      personalizations: [{
        to: [{ email: p.email }],
        subject: `Reminder: Your appointment tomorrow at ${appointment_time}`
      }],
      from: { email: Deno.env.get("EMAIL_FROM")! },
      content: [{
        type: "text/plain",
        value: `Hello ${patientName},\n\nThis is a friendly reminder of your appointment tomorrow (${dateStr}) at ${appointment_time}. Please reply or call if you need to reschedule.\n\nThank you!`
      }],
    };
    await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("SENDGRID_API_KEY")!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailMsg),
    });

    // (Optional) Send SMS via Twilio if you’ve set TWILIO_* env vars
    if (p.phone) {
      const sid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
      const token = Deno.env.get("TWILIO_AUTH_TOKEN")!;
      const from = Deno.env.get("TWILIO_PHONE_FROM")!;
      const body = `Reminder: Hi ${p.first_name}, your appointment is tomorrow at ${appointment_time}.`;
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ From: from, To: p.phone, Body: body }),
      });
    }
  }

  return new Response("Reminders sent", { status: 200 });
});

