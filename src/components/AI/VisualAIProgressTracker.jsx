// src/components/AI/VisualAIProgressTracker.jsx
import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { generateTreatmentPlan } from "../../utils/openai";

export default function VisualAIProgressTracker({ patientId }) {
  const [notes, setNotes] = useState("");
  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 1) Load the latest clinical note for this patient
  useEffect(() => {
    if (!patientId) return;
    (async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("note_text, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) return setError("Failed to load latest note.");
      setNotes(data.note_text);
    })();
  }, [patientId]);

  // 2) Kick off generation
  const handleGenerate = async () => {
    setPlan("");
    setError("");
    if (!notes) return setError("No notes available to summarize.");
    setLoading(true);
    try {
      const generated = await generateTreatmentPlan(notes);
      setPlan(generated);
    } catch (e) {
      console.error(e);
      setError("AI generation failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 p-4 border rounded bg-gray-50">
      <h3 className="font-semibold mb-2">🤖 AI-Assisted Plan</h3>
      {!patientId ? (
        <p className="text-sm text-gray-500">Wähle einen Patienten …</p>
      ) : (
        <>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="mb-3 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
          >
            {loading ? "Generiere…" : "Behandlungsplan generieren"}
          </button>
          {error && <p className="text-red-600">{error}</p>}
          {plan && (
            <div className="prose max-w-none bg-white p-3 rounded shadow-sm">
              <h4 className="font-medium">Vorgeschlagener Plan:</h4>
              <div>
                {plan.split("\n").map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
