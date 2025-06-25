// supabase/functions/ai-claim-justifier/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Configuration, OpenAIApi } from "npm:openai";

serve(async (req) => {
  const { claimId } = await req.json();
  if (!claimId) {
    return new Response("Missing claimId", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1️⃣ Fetch claim, patient, code details
  const { data: claim } = await supabase
    .from("insurance_claims")
    .select(`
      id,
      code,
      amount,
      submitted_at,
      patients!inner(first_name, last_name, dob, insurer_type)
    `)
    .eq("id", claimId)
    .single();

  if (!claim) {
    return new Response("Claim not found", { status: 404 });
  }

  const { patients: patient } = claim;

  // 2️⃣ Build prompt
  const prompt = `
You are a billing specialist. 
Patient: ${patient.first_name} ${patient.last_name}, DOB: ${new Date(patient.dob).toLocaleDateString()}, Insurer Type: ${patient.insurer_type}
Claim: Code ${claim.code}, Amount: €${claim.amount.toFixed(2)}, Submitted: ${new Date(claim.submitted_at).toLocaleDateString()}

Provide a concise justification paragraph explaining why this procedure/code is medically necessary and billable today.
`;

  // 3️⃣ Call OpenAI
  const openai = new OpenAIApi(new Configuration({
    apiKey: Deno.env.get("OPENAI_API_KEY")!
  }));
  const completion = await openai.createChatCompletion({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });
  const justification = completion.data.choices[0].message?.content?.trim() || "";

  // 4️⃣ Persist it
  const { error: insertErr } = await supabase
    .from("claim_justifications")
    .insert([{ claim_id: claimId, justification }]);
  if (insertErr) console.error("Justification insert error:", insertErr);

  return new Response(JSON.stringify({ justification }), {
    headers: { "Content-Type": "application/json" },
  });
});

