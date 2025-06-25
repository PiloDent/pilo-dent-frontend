import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Configuration, OpenAIApi } from "npm:openai";

serve(async (req) => {
  const { patientId, question } = await req.json();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  
  // 1) Fetch context
  const { data: patient } = await supabase
    .from("patients")
    .select("first_name, allergies")
    .eq("id", patientId)
    .single();

  const { data: history } = await supabase
    .from("treatment_history")
    .select("created_at, treatments")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: suggestions } = await supabase
    .from("treatment_suggestions")
    .select("suggestions")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1);

  // 2) Construct prompt
  const prompt = `
You are a friendly dental assistant. 
Patient: ${patient.first_name}, Allergies: ${patient.allergies || 'None'}
Recent Treatments:
${history.map(h => `- ${new Date(h.created_at).toLocaleDateString()}: ${h.treatments.map(t=>t.procedure).join(', ')}`).join("\n")}
AI-Suggested Next Steps:
${(suggestions[0]?.suggestions || []).map(s=>`- Tooth ${s.tooth}: ${s.suggestion}`).join("\n")}

User question: "${question}"

Provide a clear, concise answer or recommendation.
`;

  // 3) Call OpenAI
  const openai = new OpenAIApi(new Configuration({ apiKey: Deno.env.get("OPENAI_API_KEY")! }));
  const completion = await openai.createChatCompletion({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });
  const answer = completion.data.choices[0].message?.content || "Sorry, I don't know.";

  return new Response(JSON.stringify({ answer }), {
    headers: { "Content-Type": "application/json" },
  });
});

