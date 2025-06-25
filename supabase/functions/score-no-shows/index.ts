// supabase/functions/score-no-shows/index.ts
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

  // 1) Fetch tomorrow’s appointments and past no-shows for the same patient
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("id, patient_id, appointment_time")
    .eq("date", dateStr)
    .limit(1000);

  if (error) {
    console.error("Error fetching appointments:", error);
    return new Response("Error", { status: 500 });
  }

  // 2) For each, compute a simple heuristic:
  //    baseRisk = (past no-show count) / (total past appointments)
  //    timeFactor = hour of appointment / 24
  //    finalScore = clamp(baseRisk * 0.7 + timeFactor * 0.3, 0, 1)
  for (const appt of appointments) {
    const { patient_id, id } = appt;

    // Count past no-shows for this patient
    const { count: noShows } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", patient_id)
      .eq("checked_in", false)
      .lt("date", dateStr);

    // Count total past appointments
    const { count: totalAppts } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", patient_id)
      .lt("date", dateStr);

    const baseRisk = totalAppts > 0 ? noShows / totalAppts : 0.1;
    const hour = parseInt(appt.appointment_time.split(":")[0], 10) || 12;
    const timeFactor = hour / 24;
    const score = Math.min(1, Math.max(0, baseRisk * 0.7 + timeFactor * 0.3));

    // Update the appointment record
    await supabase
      .from("appointments")
      .update({ no_show_score: score })
      .eq("id", id);
  }

  return new Response("Scoring complete", { status: 200 });
});

