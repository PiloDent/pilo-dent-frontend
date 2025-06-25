// supabase/functions/incoming-sms/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Helper to respond with TwiML
const twimlResponse = (message: string) =>
  `<?xml version="1.0" encoding="UTF-8"?>
   <Response><Message>${message}</Message></Response>`;

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const form = await req.formData();
  const from = form.get("From") as string;      // e.g. "+15551234567"
  const body = (form.get("Body") as string).trim().toLowerCase();

  // Only handle recognized commands
  if (["reschedule", "cancel"].includes(body)) {
    // Find tomorrow’s appointment for this phone
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    const { data: appts } = await supabase
      .from("appointments")
      .select("id")
      .eq("patient_phone", from)     // ensure you store phone in appointments
      .eq("date", dateStr)
      .eq("checked_in", false);

    if (appts?.length) {
      const apptId = appts[0].id;
      await supabase
        .from("appointments")
        .update({
          reschedule_requested: true,
          status: body === "cancel" ? "cancel_requested" : undefined,
        })
        .eq("id", apptId);
      const reply =
        body === "cancel"
          ? "We have received your cancellation. Please contact us to reschedule."
          : "Reschedule request noted. Our team will contact you to pick a new time.";
      return new Response(twimlResponse(reply), {
        headers: { "Content-Type": "application/xml" },
      });
    } else {
      return new Response(
        twimlResponse("No appointment found for tomorrow under your number."),
        { headers: { "Content-Type": "application/xml" } }
      );
    }
  }

  // Fallback: unrecognized
  return new Response(
    twimlResponse("Sorry, we didn't understand. Reply 'Reschedule' or 'Cancel'."),
    { headers: { "Content-Type": "application/xml" } }
  );
});

