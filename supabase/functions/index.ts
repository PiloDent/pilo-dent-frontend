import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { v4 } from "https://deno.land/std@0.168.0/uuid/mod.ts";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Expect appointmentId in JSON body
  const { appointmentId } = await req.json();
  if (!appointmentId) return new Response("appointmentId required", { status: 400 });

  // Fetch appointment + patient info
  const { data: appt } = await supabase
    .from("appointments")
    .select("patient_id, patients(email, first_name, last_name)")
    .eq("id", appointmentId)
    .single();
  if (!appt) return new Response("Appointment not found", { status: 404 });

  const token = v4.generate();
  // Insert survey record
  await supabase.from("patient_surveys").insert({
    appointment_id: appointmentId,
    patient_id: appt.patient_id,
    response_token: token,
  });

  // Build survey link
  const base = Deno.env.get("FRONTEND_URL")!; // e.g. https://yourapp.com
  const link = `${base}/survey/${token}`;

  // Send email via SendGrid
  const msg = {
    personalizations:[{
      to:[{ email: appt.patients.email }],
      subject:"How was your appointment?"
    }],
    from:{ email:Deno.env.get("EMAIL_FROM")! },
    content:[{
      type:"text/html",
      value:`
        <p>Hi ${appt.patients.first_name},</p>
        <p>Thanks for visiting us! Please rate your experience:</p>
        <p><a href="${link}?rating=1">😠</a>
           <a href="${link}?rating=2">😕</a>
           <a href="${link}?rating=3">😐</a>
           <a href="${link}?rating=4">🙂</a>
           <a href="${link}?rating=5">😀</a></p>
        <p>Or <a href="${link}">leave a comment</a>.</p>
      `
    }]
  };
  await fetch("https://api.sendgrid.com/v3/mail/send",{
    method:"POST",
    headers:{
      Authorization:`Bearer ${Deno.env.get("SENDGRID_API_KEY")!}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify(msg)
  });

  return new Response("Survey sent", { status: 200 });
});

