// supabase/functions/daily-summary/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1) Calculate “yesterday” in YYYY-MM-DD
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0];

  // 2) Fetch counts / summaries
  const [{ count: newIntakes }, { count: newAppointments }] = await Promise.all([
    supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .eq("status", "intake_received")
      .gte("updated_at", dateStr),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("date", dateStr),
  ]);

  const { data: workLogs } = await supabase
    .rpc("get_worklog_totals", {
      start_date: dateStr,
      end_date: dateStr,
    });

  // 3) Build a simple HTML summary
  const html = `
    <h2>Daily Summary for ${dateStr}</h2>
    <ul>
      <li>New Intakes: ${newIntakes}</li>
      <li>Appointments Scheduled: ${newAppointments}</li>
      <li>Total Work Hours: ${(workLogs?.work_mins/60 || 0).toFixed(2)}</li>
      <li>Total Break Hours: ${(workLogs?.break_mins/60 || 0).toFixed(2)}</li>
    </ul>
  `;

  // 4) Send via SendGrid
  const msg = {
    personalizations: [{
      to: [{ email: Deno.env.get("ADMIN_EMAIL")! }],
      subject: `Daily Summary: ${dateStr}`
    }],
    from: { email: Deno.env.get("EMAIL_FROM")! },
    content: [{ type: "text/html", value: html }],
  };

  const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("SENDGRID_API_KEY")!}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(msg),
  });

  if (!resp.ok) {
    console.error("SendGrid error:", await resp.text());
    return new Response("Email send failed", { status: 502 });
  }
  return new Response("Daily summary sent", { status: 200 });
});

