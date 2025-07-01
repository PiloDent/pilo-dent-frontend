import { useEffect, useState, useRef } from "react";
import { supabase } from "@/supabaseClient";
import classNames from "classnames";
import { useToothStatus } from "../../context/ToothStatusContext";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

export default function AdvancedToothTreatmentModal({
  patientId,
  toothNumber,
  onClose,
  onSaved,
}) {
  const [treatments, setTreatments] = useState([]);
  const [billingCodes, setBillingCodes] = useState([]);
  const [description, setDescription] = useState("");
  const [billingCodeId, setBillingCodeId] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [listeningField, setListeningField] = useState(null);
  const recognitionRef = useRef(null);

  const { updateToothStatus } = useToothStatus();

  useEffect(() => {
    fetchTreatments();
    fetchBillingCodes();

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = "de-DE";
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (listeningField === "description") setDescription((d) => d + " " + transcript);
        else if (listeningField === "notes") setNotes((n) => n + " " + transcript);
        setListeningField(null);
      };

      recognitionRef.current.onerror = () => setListeningField(null);
      recognitionRef.current.onend = () => setListeningField(null);
    }
  }, [patientId, toothNumber]);

  const fetchTreatments = async () => {
    const { data, error } = await supabase
      .from("treatment_history")
      .select("id, created_at, billing_codes(code, description), notes, price")
      .eq("patient_id", patientId)
      .eq("tooth_number", toothNumber)
      .order("created_at", { ascending: false });

    if (!error) setTreatments(data || []);
  };

  const fetchBillingCodes = async () => {
    const { data, error } = await supabase
      .from("billing_codes")
      .select("id, code, description")
      .order("code", { ascending: true });

    if (!error) setBillingCodes(data || []);
  };

  const startListening = (field) => {
    if (!SpeechRecognition) return alert("Speech recognition not supported");
    if (recognitionRef.current && listeningField !== field) {
      setListeningField(field);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setListeningField(null);
  };

  const saveTreatment = async () => {
    if (!billingCodeId || !description.trim()) {
      alert("Please provide a billing code and description.");
      return;
    }
    setIsSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get default price for selected billing code (optional)
    const billingCode = billingCodes.find((c) => c.id === billingCodeId);
    const defaultPrice = billingCode?.default_price || 0;

    const { error } = await supabase.from("treatment_history").insert({
      patient_id: patientId,
      dentist_id: user.id,
      tooth_number: toothNumber,
      billing_code_id: billingCodeId,
      notes: notes.trim(),
      description: description.trim(),
      price: defaultPrice,
    });

    if (error) {
      alert("Failed to save treatment: " + error.message);
      setIsSaving(false);
      return;
    }

    // Update tooth status to 'filled' or logic you want here
    updateToothStatus(toothNumber, "filled");

    alert("Treatment saved!");
    setDescription("");
    setBillingCodeId("");
    setNotes("");
    setIsSaving(false);
    fetchTreatments();

    if (onSaved) onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold mb-4">
          🦷 Tooth {toothNumber} Treatment
        </h2>

        {/* Treatment History */}
        <section className="mb-6">
          <h3 className="font-semibold mb-2">Previous Treatments</h3>
          {treatments.length === 0 ? (
            <p className="text-gray-500 text-sm">No treatments recorded.</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto border p-2 rounded">
              {treatments.map((t) => (
                <li key={t.id} className="text-sm border-b last:border-none pb-1">
                  <div>
                    <strong>{new Date(t.created_at).toLocaleDateString()}</strong>{" "}
                    - {t.billing_codes?.code}: {t.billing_codes?.description}
                  </div>
                  {t.notes && (
                    <div className="text-gray-600 italic text-xs">Notes: {t.notes}</div>
                  )}
                  <div>Price: €{t.price?.toFixed(2)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* New Treatment Form */}
        <section>
          <label className="block font-semibold mb-1">Treatment Description *</label>
          <div className="flex items-center mb-3 space-x-2">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the treatment"
              className="flex-grow border p-2 rounded"
              disabled={isSaving}
            />
            <button
              type="button"
              onClick={() =>
                listeningField === "description" ? stopListening() : startListening("description")
              }
              className={classNames(
                "px-3 py-2 rounded",
                listeningField === "description"
                  ? "bg-red-600 text-white"
                  : "bg-blue-600 text-white"
              )}
              disabled={isSaving}
            >
              {listeningField === "description" ? "🎙️ Stop" : "🎤 Speak"}
            </button>
          </div>

          <label className="block font-semibold mb-1">Billing Code *</label>
          <select
            value={billingCodeId}
            onChange={(e) => setBillingCodeId(e.target.value)}
            className="w-full border p-2 rounded mb-3"
            disabled={isSaving}
          >
            <option value="">Select billing code</option>
            {billingCodes.map((code) => (
              <option key={code.id} value={code.id}>
                {code.code} - {code.description}
              </option>
            ))}
          </select>

          <label className="block font-semibold mb-1">Notes</label>
          <div className="flex items-center space-x-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes (optional)"
              className="flex-grow border p-2 rounded"
              rows={3}
              disabled={isSaving}
            />
            <button
              type="button"
              onClick={() =>
                listeningField === "notes" ? stopListening() : startListening("notes")
              }
              className={classNames(
                "px-3 py-2 rounded",
                listeningField === "notes" ? "bg-red-600 text-white" : "bg-blue-600 text-white"
              )}
              disabled={isSaving}
            >
              {listeningField === "notes" ? "🎙️ Stop" : "🎤 Speak"}
            </button>
          </div>
        </section>

        {/* Actions */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={saveTreatment}
            disabled={isSaving || !billingCodeId || !description.trim()}
            className={classNames(
              "px-4 py-2 rounded text-white",
              isSaving ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
            )}
          >
            {isSaving ? "Saving..." : "Save Treatment"}
          </button>
        </div>
      </div>
    </div>
  );
}
