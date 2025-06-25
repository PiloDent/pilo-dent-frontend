// supabase/functions/process-waitlist/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1) Find any appointments that have been cancelled or marked for reschedule
  const { data: freedSlots, error: freedErr } = await supabase
    .from("appointments")
    .select("id, date, appointment_time")
    .or("status.eq.cancel_requested,reschedule_requested.eq.true");

  if (freedErr) {
    console.error("Error fetching freed slots:", freedErr);
    return new Response("Error", { status: 500 });
  }

  for (const slot of freedSlots) {
    const { date, appointment_time } = slot;

    // 2) Get the earliest waitlist entry for that date
    const { data: entries, error: wlErr } = await supabase
      .from("waitlist")
      .select("id, patient_id, notified")
      .eq("desired_date", date)
      .eq("notified", false)
      .order("created_at", { ascending: true })
      .limit(1);

    if (wlErr) {
      console.error("Error fetching waitlist:", wlErr);
      continue;
    }
    if (!entries?.length) continue;

    const entry = entries[0];

    // 3) Fetch that patient’s contact info
    const { data: patient, error: patErr } = await supabase
      .from("patients")
      .select("first_name, email, phone")
      .eq("id", entry.patient_id)
      .single();

    if (patErr || !patient) {
      console.error("Error fetching patient:", patErr);
      continue;
    }

    const { first_name, email, phone } = patient;
    const slotTime = appointment_time;

    // 4) Send email via SendGrid
    const emailMsg = {
      personalizations: [{
        to: [{ email }],
        subject: `Slot Available on ${date} at ${slotTime}`,
      }],
      from: { email: Deno.env.get("EMAIL_FROM")! },
      content: [{
        type: "text/plain",
        value: `Hi ${first_name},\n\nA slot has opened on ${date} at ${slotTime}. Please reply or log in to book it.\n\nThanks!`,
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

    // 5) Optional SMS via Twilio
    if (phone) {
      const sid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
      const token = Deno.env.get("TWILIO_AUTH_TOKEN")!;
      const fromNum = Deno.env.get("TWILIO_PHONE_FROM")!;
      const smsBody = `Hi ${first_name}, a slot opened on ${date} at ${slotTime}. Reply to book.`;
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: fromNum,
          To: phone,
          Body: smsBody,
        }),
      });
    }

    // 6) Mark waitlist entry as notified
    await supabase
      .from("waitlist")
      .update({ notified: true })
      .eq("id", entry.id);
  }

  return new Response("Processed waitlist", { status: 200 });
});

