// supabase/functions/business-insights/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1️⃣ Total revenue last 30 days
  const { data: revData } = await supabase
    .from("treatment_history")
    .select("sum:sum_amount", { head: false })
    .gte("date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]);

  // 2️⃣ Appointments completed vs. no-shows last 30 days
  const since = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const [{ count: total }, { count: noShows }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id", { head: true, count: "exact" })
      .gte("date", since),
    supabase
      .from("appointments")
      .select("id", { head: true, count: "exact" })
      .gte("date", since)
      .eq("checked_in", false),
  ]);

  // 3️⃣ Average appointment value
  const avgValue = revData?.[0]?.sum_amount && total > 0
    ? revData[0].sum_amount / total
    : 0;

  // 4️⃣ Top 5 procedures by revenue
  const { data: topProcedures } = await supabase
    .from("treatment_history")
    .select("billing_code(code, description), sum:sum_amount", { head: false })
    .gte("date", since)
    .group("billing_code(code, description)")
    .order("sum_amount", { ascending: false })
    .limit(5);

  const insights = {
    revenueLast30Days: revData?.[0]?.sum_amount || 0,
    appointments: { total, noShows },
    avgAppointmentValue: avgValue,
    topProcedures: topProcedures || [],
  };

  return new Response(JSON.stringify(insights), {
    headers: { "Content-Type": "application/json" },
  });
});

