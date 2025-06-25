// supabase/functions/recommend-slots/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { patientId } = await req.json().catch(() => ({}));
  if (!patientId) {
    return new Response("Missing patientId", { status: 400 });
  }

  // 1️⃣ Load patient no-show risk
  const { data: [p] } = await supabase
    .from("patients")
    .select("no_show_risk")
    .eq("id", patientId);

  const risk = p?.no_show_risk ?? 0.5;

  // 2️⃣ Fetch dentist availability slots for next 7 days
  const { data: slots } = await supabase
    .rpc("get_available_slots", { days_ahead: 7 });

  // 3️⃣ Score each slot (e.g. prefer low-risk times, matching patient history)
  const scored = slots
    .map((s: any) => ({
      ...s,
      score: (1 - risk) * (1 - s.load_factor) // simple example
    }))
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 5);

  return new Response(JSON.stringify({ recommendations: scored }), {
    headers: { "Content-Type": "application/json" },
  });
});

