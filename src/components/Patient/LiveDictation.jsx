// src/components/Patient/LiveDictation.jsx
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/supabaseClient";

export default function LiveDictation({ patientId }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech Recognition API not supported in this browser.");
      return;
    }
    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = "de-DE"; // adjust as needed
    recog.onresult = async (event) => {
      let interim = "";
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          finalTranscript += res[0].transcript;
        } else {
          interim += res[0].transcript;
        }
      }
      if (interim) {
        setTranscript((t) => t + interim);
      }
      if (finalTranscript) {
        const chunk = finalTranscript.trim();
        setTranscript((t) => t + chunk + "\n");
        // persist each final chunk to Supabase
        const { error: insertErr } = await supabase
          .from("dictations")
          .insert({
            patient_id: patientId,
            dentist_id: supabase.auth.user()?.id,
            transcript: chunk,
          });
        if (insertErr) console.error("Dictation insert error:", insertErr);
      }
    };
    recog.onerror = (e) => {
      console.error("SpeechRecognition error", e);
      setError("Speech recognition error: " + e.error);
      setListening(false);
    };
    recognitionRef.current = recog;
  }, [patientId]);

  const startListening = () => {
    setTranscript("");
    setError("");
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (e) {
      console.error(e);
      setError("Failed to start recognition.");
    }
  };
  const stopListening = () => {
    recognitionRef.current.stop();
    setListening(false);
  };

  return (
    <div className="p-4 border rounded bg-gray-50">
      <h3 className="font-semibold mb-2">🗣️ Live Dictation</h3>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      <div className="mb-2">
        {listening ? (
          <button
            onClick={stopListening}
            className="bg-red-600 text-white px-3 py-1 rounded"
          >
            ■ Stop
          </button>
        ) : (
          <button
            onClick={startListening}
            className="bg-green-600 text-white px-3 py-1 rounded"
          >
            ▶️ Start
          </button>
        )}
      </div>
      <textarea
        readOnly
        value={transcript}
        rows={8}
        className="w-full p-2 border rounded font-mono text-sm"
        placeholder="Live transcript will appear here…"
      />
      <p className="text-xs text-gray-500 mt-1">
        Every finalized segment is saved automatically.
      </p>
    </div>
  );
}
