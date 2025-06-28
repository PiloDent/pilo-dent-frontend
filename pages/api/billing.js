import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // must use service role for insert
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { patientId, dentistId, billingCodeId, price, notes } = req.body;
  if (!patientId || !dentistId || !billingCodeId || !price) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const { error } = await supabase.from("treatment_history").insert([
    {
      patient_id: patientId,
      dentist_id: dentistId,
      billing_code_id: billingCodeId,
      price,
      notes,
    },
  ]);

  if (error) {
    console.error("Supabase error:", error.message);
    return res.status(500).json({ error: "Failed to save billing entry" });
  }

  res.status(200).json({ success: true });
}
