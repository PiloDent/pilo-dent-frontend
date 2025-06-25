// supabase/functions/email-intake/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  try {
    const { patientId } = await req.json();
    if (!patientId) return new Response("Missing patientId", { status: 400 });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch patient info
    const { data: patient, error: patientErr } = await supabase
      .from("patients")
      .select("first_name, last_name")
      .eq("id", patientId)
      .single();
    if (patientErr || !patient) {
      console.error("Patient lookup failed", patientErr);
      return new Response("Patient not found", { status: 404 });
    }

    // Download PDF
    const { data: fileStream, error: downloadErr } = await supabase.storage
      .from("intake_forms")
      .download(`patient_${patientId}.pdf`);
    if (downloadErr || !fileStream) {
      console.error("PDF download failed", downloadErr);
      return new Response("PDF not found", { status: 404 });
    }
    const arrayBuffer = await fileStream.arrayBuffer();
    const base64PDF = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Compose email via SendGrid
    const msg = {
      personalizations: [{
        to: [{ email: Deno.env.get("ADMIN_EMAIL")! }],
        subject: `New Intake: ${patient.first_name} ${patient.last_name}`
      }],
      from: { email: Deno.env.get("EMAIL_FROM")! },
      content: [{
        type: "text/plain",
        value: `Patient ${patient.first_name} ${patient.last_name} submitted their intake. See PDF attached.`
      }],
      attachments: [{
        content: base64PDF,
        filename: `intake_${patientId}.pdf`,
        type: "application/pdf",
        disposition: "attachment"
      }]
    };

    const emailRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("SENDGRID_API_KEY")!}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(msg),
    });
    if (!emailRes.ok) {
      console.error("SendGrid error", await emailRes.text());
      return new Response("Email send failed", { status: 502 });
    }

    return new Response("Email sent", { status: 200 });
  } catch (err) {
    console.error("email-intake error", err);
    return new Response("Server error", { status: 500 });
  }
});

