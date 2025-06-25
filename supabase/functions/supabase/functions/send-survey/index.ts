// supabase/functions/business-insights/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1️⃣ Total revenue last 30 days
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const { data: revenueRows, error: revErr } = await supabase
    .from("billing")
    .select("amount")
    .gte("created_at", since.toISOString());
  if (revErr) console.error("Revenue fetch error", revErr);
  const totalRevenue = revenueRows?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;

  // 2️⃣ Appointment counts
  const [{ count: scheduled }, { count: completed }] = await Promise.all([
    supabase.from("appointments").select("id", { head: true, count: "exact" }).eq("status", "scheduled"),
    supabase.from("appointments").select("id", { head: true, count: "exact" }).eq("status", "completed"),
  ]);

  // 3️⃣ Chair-time (via RPC)
  const { data: usage, error: usageErr } = await supabase.rpc("get_total_chair_time", {
    start_date: since.toISOString(),
    end_date: new Date().toISOString(),
  });
  if (usageErr) console.error("Chair-time RPC error", usageErr);
  const totalChairTimeMins = usage?.total_mins || 0;

  return new Response(
    JSON.stringify({
      totalRevenue,
      appointmentStats: { scheduled, completed },
      totalChairTimeMins,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});

