// supabase/functions/submit-claims/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1) Fetch all pending claims
  const { data: claims, error: fetchErr } = await supabase
    .from("insurance_claims")
    .select("*")
    .eq("status", "pending");

  if (fetchErr) {
    console.error("Error fetching claims:", fetchErr);
    return new Response("Error fetching claims", { status: 500 });
  }

  // 2) For each claim, call the insurer API
  for (const claim of claims) {
    try {
      // Example: POST to your insurer’s REST endpoint
      const resp = await fetch(Deno.env.get("INSURER_API_URL")! + "/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("INSURER_API_KEY")!}`,
        },
        body: JSON.stringify(claim.claim_data),
      });
      const respJson = await resp.json();

      // 3) Update the claim record
      await supabase
        .from("insurance_claims")
        .update({
          status: resp.ok ? "approved" : "rejected",
          response_data: respJson,
          error_message: resp.ok ? null : respJson.error || "Unknown error",
        })
        .eq("id", claim.id);
    } catch (err) {
      console.error("Error submitting claim ID", claim.id, err);
      await supabase
        .from("insurance_claims")
        .update({
          status: "failed",
          error_message: err.message,
        })
        .eq("id", claim.id);
    }
  }

  return new Response("Claims processed", { status: 200 });
});

