// supabase/functions/book-appointment/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Replace with your OpenAI import path if you have an SDK, or use fetch
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

interface ParsedRequest {
  date: string;           // YYYY-MM-DD
  time: string;           // HH:MM
  serviceType: string;    // e.g. "cleaning"
  dentistName: string;    // e.g. "Dr. Müller"
}

serve(async (req: Request) => {
  try {
    const { patientId, text } = await req.json();
    if (!patientId || !text) {
      return new Response("Missing patientId or text", { status: 400 });
    }

    // 1) Call OpenAI to extract structured fields
    const aiResp = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Extract a JSON object with fields date (YYYY-MM-DD), time (HH:MM), serviceType, dentistName from the patient request.`
          },
          { role: "user", content: text }
        ],
        temperature: 0,
      }),
    });
    const aiData = await aiResp.json();
    const parsed: ParsedRequest = JSON.parse(aiData.choices[0].message.content);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 2) Look up the dentist’s ID by name
    const { data: dentistRec, error: dentistErr } = await supabase
      .from("dentists")
      .select("id")
      .ilike("full_name", parsed.dentistName)
      .maybeSingle();
    if (dentistErr || !dentistRec) {
      return new Response(`Dentist "${parsed.dentistName}" not found`, { status: 404 });
    }
    const dentistId = dentistRec.id;

    // 3) Check availability
    const { data: existing } = await supabase
      .from("appointments")
      .select("id")
      .eq("date", parsed.date)
      .eq("appointment_time", parsed.time)
      .eq("dentist_id", dentistId)
      .limit(1);
    if (existing.length) {
      return new Response(
        JSON.stringify({ success: false, message: "Slot already booked" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4) Create the appointment
    const { data: newAppt, error: insertErr } = await supabase
      .from("appointments")
      .insert([{
        patient_id: patientId,
        dentist_id: dentistId,
        date: parsed.date,
        appointment_time: parsed.time,
        service_type: parsed.serviceType,
        status: "scheduled",
      }])
      .select()
      .single();
    if (insertErr || !newAppt) {
      console.error(insertErr);
      return new Response("Failed to book", { status: 500 });
    }

    // 5) Respond with confirmation
    return new Response(
      JSON.stringify({
        success: true,
        appointment: newAppt,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("book-appointment error:", err);
    return new Response("Server error", { status: 500 });
  }
});

