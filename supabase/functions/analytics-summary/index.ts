// supabase/functions/analytics-summary/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1️⃣ New Intakes in the last 7 days (grouped by day)
  const since = new Date();
  since.setDate(since.getDate() - 6);
  const sinceStr = since.toISOString().split("T")[0];
  const { data: intakes, error: iErr } = await supabase
    .from("patients")
    .select("date:sent_at::date, count:id", { count: "exact", head: false })
    .gte("sent_at", sinceStr)
    .group("date");
  if (iErr) console.error("Intakes error", iErr);

  // 2️⃣ Appointments: scheduled vs completed
  const [{ count: scheduled }, { count: completed }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id", { head: true, count: "exact" }),
    supabase
      .from("appointments")
      .select("id", { head: true, count: "exact" })
      .eq("checked_in", true),
  ]);

  // 3️⃣ No-show rate = (scheduled - completed) / scheduled
  const noShowRate = scheduled > 0
    ? (scheduled - completed) / scheduled
    : 0;

  // 4️⃣ Work-log totals for today
  const todayStr = new Date().toISOString().split("T")[0];
  const { data: work } = await supabase
    .rpc("get_worklog_totals", { start_date: todayStr, end_date: todayStr });

  // 5️⃣ Average survey rating
  const { data: surveyStats } = await supabase
    .from("patient_surveys")
    .select("avg:avg_rating", { head: false })
    .avg("rating");
  const avgSurvey = surveyStats?.[0]?.avg || null;

  // 6️⃣ Waitlist stats (requested vs notified)
  const [{ count: wlReq }, { count: wlNotified }] = await Promise.all([
    supabase.from("waitlist").select("id", { head: true, count: "exact" }),
    supabase
      .from("waitlist")
      .select("id", { head: true, count: "exact" })
      .eq("notified", true),
  ]);

  // 7️⃣ Billing trends & patient volumes in last 7 days
  const { data: billingData, error: bErr } = await supabase
    .from("treatment_history")
    .select(`
      date:created_at::date,
      total_fees:sum((treatments->>'fee')::numeric),
      count:id
    `)
    .gte("created_at", sinceStr)
    .group("date");
  if (bErr) console.error("Billing error", bErr);

  // 8️⃣ Chair‐time per operatory for today (requires a SQL function)
  const { data: chairTimeData, error: ctErr } = await supabase
    .rpc("get_chairtime_totals", { on_date: todayStr });
  if (ctErr) console.error("Chair‐time error", ctErr);

  // Assemble summary
  const summary = {
    newIntakes: intakes || [],
    appointmentStats: { scheduled, completed, noShowRate },
    workLog: {
      workHours: work?.work_mins / 60 || 0,
      breakHours: work?.break_mins / 60 || 0,
    },
    avgSurvey,
    waitlist: { requested: wlReq, notified: wlNotified },
    billingTrends: billingData || [],
    patientVolumes: billingData?.map((b: any) => ({
      date: b.date,
      count: b.count,
    })) || [],
    chairTime: chairTimeData || [],
  };

  return new Response(JSON.stringify(summary), {
    headers: { "Content-Type": "application/json" },
  });
});

