// src/components/Dentist/BillingAssistant.jsx
import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useToothStatus } from "../../context/ToothStatusContext";

export default function BillingAssistant({ patientId }) {
  const [transcript, setTranscript] = useState("");
  const [match, setMatch] = useState(null);
  const [customPricing, setCustomPricing] = useState({});
  const [manualDesc, setManualDesc] = useState("");
  const [suggestions, setSuggestions] = useState({ bema_codes: [], goz_codes: [] });
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [error, setError] = useState("");
  const { updateToothStatus } = useToothStatus();

  // --- MATCH BILLING CODES VIA AI PROXY ---
  const handleMatchBilling = async (text) => {
    const res = await fetch("/functions/match-billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error("Billing match failed");
    const best = await res.json(); // { id, code, description, default_price, score }
    setMatch(best);

    if (best.score >= 85) {
      await saveTreatment(best, text);
    }
  };

  // --- PARSE TOOTH CHART UPDATES VIA AI PROXY ---
  const handleParseTooth = async (text) => {
    const res = await fetch("/functions/parse-tooth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error("Tooth parse failed");
    const updates = await res.json(); // e.g. [ { tooth_number, status }, ... ]

    for (const u of updates) {
      await supabase.from("tooth_status").upsert({
        patient_id: patientId,
        tooth_number: u.tooth_number,
        status: u.status,
      });
      updateToothStatus(u.tooth_number, u.status);
    }
  };

  // --- SAVE TREATMENT ENTRY ---
  const saveTreatment = async (code, notes) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("treatment_history").insert({
      dentist_id: user.id,
      patient_id: patientId,
      billing_code_id: code.id,
      price: customPricing[code.id] || code.default_price,
      notes,
    });
    alert("✅ Behandlung gespeichert!");
    setTranscript("");
    setMatch(null);
  };

  // --- LOAD CUSTOM PRICING ---
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: dentist } = await supabase
        .from("dentists")
        .select("company_id")
        .eq("id", user.id)
        .maybeSingle();
      if (!dentist?.company_id) return;

      const { data: pricing } = await supabase
        .from("custom_pricing")
        .select("billing_code_id, price")
        .eq("company_id", dentist.company_id);

      const map = {};
      pricing?.forEach((r) => (map[r.billing_code_id] = r.price));
      setCustomPricing(map);
    })();
  }, []);

  // --- LISTEN FOR AUTO-SAVED TRANSCRIPTS FROM Voice Recorder ---
  useEffect(() => {
    const channel = supabase
      .channel("transcript-listener")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transcripts",
          filter: `patient_id=eq.${patientId}`,
        },
        async (payload) => {
          const newText = payload.new.text;
          setTranscript(newText);
          await handleMatchBilling(newText);
          await handleParseTooth(newText);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [patientId]);

  // --- New: Fetch billing code suggestions from AI billing assistant ---
  const fetchBillingSuggestions = async (desc) => {
    if (!desc.trim()) {
      setSuggestions({ bema_codes: [], goz_codes: [] });
      setError("");
      return;
    }
    setLoadingSuggestions(true);
    try {
      const res = await fetch("https://imnaccrdadrmrljsgcpl.functions.supabase.co/billing-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltbmFjY3JkYWRybXJsanNnY3BsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTk5NTE4MywiZXhwIjoyMDY1NTcxMTgzfQ.GCAdj2ywF1hs2oLIdbDObxYUTnAMKqGqeoGqbES9mU0`,
        },
        body: JSON.stringify({ treatmentDescription: desc }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setSuggestions({ bema_codes: [], goz_codes: [] });
      } else {
        setError("");
        setSuggestions(data.suggestions || { bema_codes: [], goz_codes: [] });
      }
    } catch (e) {
      setError("Network error");
      setSuggestions({ bema_codes: [], goz_codes: [] });
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // --- Debounced manual input handler ---
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchBillingSuggestions(manualDesc);
    }, 500);

    return () => clearTimeout(handler);
  }, [manualDesc]);

  return (
    <div className="border p-4 rounded shadow mt-6 bg-white space-y-4">
      <h2 className="text-lg font-semibold">
        🦷 Billing Assistant (auto from Voice)
      </h2>

      {transcript && (
        <div>
          <h3 className="font-semibold mt-4">📝 Transcript:</h3>
          <p className="bg-gray-100 p-2 rounded">{transcript}</p>
        </div>
      )}

      {match && (
        <div className="border p-3 rounded mt-4 bg-green-50">
          <h3 className="font-semibold">✅ Gefundener Code:</h3>
          <p>
            <strong>{match.code}</strong>: {match.description}
          </p>
          <p>
            💶 Preis:{" "}
            {customPricing[match.id]
              ? `Individuell €${customPricing[match.id]}`
              : `Standard €${match.default_price}`}
          </p>
          <p>Vertrauen: {match.score}%</p>
          <button
            className="mt-2 bg-green-600 text-white px-4 py-2 rounded"
            onClick={() => saveTreatment(match, transcript)}
          >
            💾 Speichern
          </button>
        </div>
      )}

      {/* New Manual Input Section */}
      <div className="mt-6">
        <h3 className="font-semibold mb-2">Manuelle Behandlung eingeben:</h3>
        <textarea
          value={manualDesc}
          onChange={(e) => setManualDesc(e.target.value)}
          placeholder="Behandlung beschreiben..."
          rows={4}
          className="w-full p-2 border rounded"
        />

        {loadingSuggestions && <p className="text-blue-600 mt-2">Codes werden geladen...</p>}
        {error && <p className="text-red-600 mt-2">{error}</p>}

        <div className="mt-4">
          <h4 className="font-semibold">Vorgeschlagene BEMA Codes:</h4>
          {suggestions.bema_codes.length ? (
            <ul className="list-disc list-inside">
              {suggestions.bema_codes.map((code) => (
                <li key={code}>{code}</li>
              ))}
            </ul>
          ) : (
            <p>Keine Vorschläge</p>
          )}

          <h4 className="font-semibold mt-4">Vorgeschlagene GOZ Codes:</h4>
          {suggestions.goz_codes.length ? (
            <ul className="list-disc list-inside">
              {suggestions.goz_codes.map((code) => (
                <li key={code}>{code}</li>
              ))}
            </ul>
          ) : (
            <p>Keine Vorschläge</p>
          )}
        </div>
      </div>
    </div>
  );
}
