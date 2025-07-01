import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import VoiceRecorderWithAI from "./VoiceRecorderWithAI";
import TreatmentHistory from "./TreatmentHistory";
import TeethChart from "./TeethChart";

export default function TreatmentAssistant() {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, first_name, last_name");

      if (!error) setPatients(data);
    };
    fetchPatients();
  }, []);

  const handleSimulateAI = async () => {
    if (!patientId) return alert("Please select a patient");
    setLoading(true);

    const simulated = {
      notes:
        "Patient reports sensitivity in lower right molar. Recommended filling.",
      billing_codes: ["GOZ 2040", "GOZ 4005"],
      follow_up_date: "2025-07-01",
    };

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("treatments").insert([
      {
        patient_id: patientId,
        dentist_id: user.id,
        notes: simulated.notes,
        billing_codes: simulated.billing_codes,
        follow_up_date: simulated.follow_up_date,
      },
    ]);

    if (!error) {
      setAiResult(simulated);
    } else {
      alert("Error saving treatment: " + error.message);
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6 border p-6 rounded shadow mt-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold">🦷 AI Treatment Assistant</h2>

      <select
        className="w-full border p-2"
        value={patientId}
        onChange={(e) => setPatientId(e.target.value)}
      >
        <option value="">Select Patient</option>
        {patients.map((p) => (
          <option key={p.id} value={p.id}>
            {p.first_name} {p.last_name}
          </option>
        ))}
      </select>

      <button
        onClick={handleSimulateAI}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Processing..." : "Simulate AI Treatment"}
      </button>

      {aiResult && (
        <div className="bg-gray-100 p-4 rounded space-y-1">
          <p>
            <strong>Notes:</strong> {aiResult.notes}
          </p>
          <p>
            <strong>Billing Codes:</strong> {aiResult.billing_codes.join(", ")}
          </p>
          <p>
            <strong>Follow-up:</strong> {aiResult.follow_up_date}
          </p>
        </div>
      )}

      {patientId && (
        <>
          <VoiceRecorderWithAI patientId={patientId} />
          <TreatmentHistory patientId={patientId} />
          <TeethChart patientId={patientId} />
        </>
      )}
    </div>
  );
}
