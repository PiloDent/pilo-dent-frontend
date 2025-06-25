import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// (Optional) import a simple ML library or call an external model

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1️⃣ Fetch relevant data for each patient
  const { data: patients } = await supabase
    .from("patients")
    .select("id, last_visit, no_show_count, appointment_count, perio_measurements");

  // 2️⃣ Compute risk scores (placeholder logic)
  const updates = patients!.map((p: any) => {
    const noShowRisk = p.appointment_count
      ? p.no_show_count / p.appointment_count
      : 0;
    // e.g. perio_measurements = [{ pocket_depths: [...] }]
    const perioRisk = Math.min(1, (p.perio_measurements?.flatMap((m:any)=>m.pocket_depths).reduce((a:number,b:number)=>a+b,0) || 0) / 100);
    const compliance = 1 - noShowRisk; 
    return { id: p.id, no_show_risk: noShowRisk, perio_risk_score: perioRisk, compliance_score: compliance };
  });

  // 3️⃣ Batch update
  const { error } = await supabase
    .from("patients")
    .upsert(updates, { onConflict: "id" });

  if (error) console.error("Risk scoring error:", error);

  return new Response("Risk scores computed", { status: 200 });
});

