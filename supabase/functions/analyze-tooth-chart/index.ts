// supabase/functions/analyze-tooth-chart/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VISION_URL = "https://api.openai.com/v1/images/analyze";

serve(async (req: Request) => {
  try {
    const { patientId, chartUrl } = await req.json();
    if (!patientId || !chartUrl) {
      return new Response("Missing patientId or chartUrl", { status: 400 });
    }

    // Call your vision/LLM API
    const resp = await fetch(VISION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: chartUrl,
        purpose: "treatment-suggestions",
      }),
    });
    const body = await resp.json();
    // assume body.suggestions is an array of { tooth, issue, suggestion }
    const suggestions = body.suggestions || [];

    // Persist to treatment_suggestions table
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await supabase.from("treatment_suggestions").upsert({
      patient_id: patientId,
      suggestions,
    });

    return new Response(JSON.stringify({ suggestions }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyze-tooth-chart error:", err);
    return new Response("Server error", { status: 500 });
  }
});

