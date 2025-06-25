// supabase/functions/intake/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const patientId = formData.get("patientId") as string;
    if (!file || !patientId) {
      return new Response("Missing file or patient ID", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Upload PDF to storage
    const uploadRes = await supabase.storage
      .from("intake_forms")
      .upload(`patient_${patientId}.pdf`, file.stream(), {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadRes.error) {
      return new Response("Upload failed: " + uploadRes.error.message, { status: 500 });
    }

    // Base64 encode PDF and call OpenAI
    const buffer = await file.arrayBuffer();
    const base64PDF = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const oaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: "Extract structured patient data from this PDF and respond with JSON." },
          { role: "user", content: `data:application/pdf;base64,${base64PDF}` },
        ],
        max_tokens: 1000,
        temperature: 0.2,
      }),
    });
    const oaiData = await oaiResp.json();
    const parsed = JSON.parse(oaiData.choices[0].message.content || "{}");

    // Update patient record
    const updateFields = {
      address: parsed.address || null,
      phone: parsed.phone || null,
      gender: parsed.gender || null,
      allergies: parsed.allergies || null,
      medications: parsed.medications || null,
      insurance_provider: parsed.insurance_provider || null,
      insurance_number: parsed.insurance_number || null,
    };
    const { error: updateError } = await supabase
      .from("patients")
      .update(updateFields)
      .eq("id", patientId);
    if (updateError) {
      return new Response("Update failed: " + updateError.message, { status: 500 });
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Intake error", err);
    return new Response("Server error", { status: 500 });
  }
});

