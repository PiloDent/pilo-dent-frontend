// pages/api/appointments/create.js
import { supabase } from "@/lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { patient_id, datetime, phone_number, ...rest } = req.body;

  // 1) Create the appointment
  const { data: appointment, error: appErr } = await supabase
    .from("appointments")
    .insert([{ patient_id, datetime, phone_number, ...rest }])
    .single();

  if (appErr) {
    return res.status(500).json({ error: appErr.message });
  }

  // 2) Schedule a reminder 24h before
  const remindAt = new Date(new Date(datetime).getTime() - 24 * 60 * 60 * 1000);
  await supabase.from("reminders").insert([
    {
      patient_id,
      appointment_id: appointment.id,
      remind_at: remindAt.toISOString(),
      channel: "sms",
      phone_number,
    },
  ]);

  return res.status(200).json({ appointment });
}

