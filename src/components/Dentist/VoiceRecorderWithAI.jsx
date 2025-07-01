import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

export default function VoiceRecorderWithAI({ patientId }) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [chunks, setChunks] = useState([]);

  useEffect(() => {
    if (recording && mediaRecorder) {
      mediaRecorder.start();
    }
  }, [recording, mediaRecorder]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const _chunks = [];

    recorder.ondataavailable = (e) => {
      _chunks.push(e.data);
    };

    recorder.onstop = async () => {
      const audioBlob = new Blob(_chunks, { type: "audio/webm" });
      await handleWhisperTranscription(audioBlob);
    };

    setChunks([]);
    setMediaRecorder(recorder);
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder.stop();
    setRecording(false);
  };

  const handleWhisperTranscription = async (audioBlob) => {
    const formData = new FormData();
    formData.append("file", audioBlob, "voice.webm");
    formData.append("model", "whisper-1");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
      },
      body: formData,
    });

    const whisperData = await res.json();
    const spokenText = whisperData.text;
    setTranscript(spokenText);

    const gptPrompt = `
You are a dental AI assistant helping document voice notes from a dentist.

From the following transcription, generate:
- Clean treatment notes
- A list of German billing codes (GOZ/BEMA)
- A suggested follow-up date (as YYYY-MM-DD)
- Tooth-specific updates for a teeth chart (tooth number, status, notes)

Transcription:
"${spokenText}"

Return JSON exactly in this format:

{
  "notes": "string",
  "billing_codes": ["string", "..."],
  "follow_up_date": "YYYY-MM-DD",
  "teeth_chart_updates": [
    {
      "tooth_number": "string",
      "status": "string",
      "notes": "string"
    }
  ]
}
`;

    const chatResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{ role: "user", content: gptPrompt }],
        }),
      }
    );

    const chatData = await chatResponse.json();

    try {
      const ai = JSON.parse(chatData.choices[0].message.content);
      setAiResponse(ai);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from("treatments").insert([
        {
          patient_id: patientId,
          dentist_id: user.id,
          notes: ai.notes,
          billing_codes: ai.billing_codes,
          follow_up_date: ai.follow_up_date,
        },
      ]);

      if (Array.isArray(ai.teeth_chart_updates)) {
        const updates = ai.teeth_chart_updates.map((t) => ({
          patient_id: patientId,
          tooth_number: t.tooth_number,
          status: t.status,
          notes: t.notes,
          updated_at: new Date().toISOString(),
        }));

        for (const update of updates) {
          await supabase.from("teeth_status").upsert(update, {
            onConflict: ["patient_id", "tooth_number"],
          });
        }
      }

      alert("AI treatment and teeth chart updated!");
    } catch (err) {
      console.error("AI response parse error", err);
      alert("AI response could not be parsed.");
    }
  };

  return (
    <div className="border p-4 rounded shadow space-y-4">
      <h3 className="text-xl font-semibold">🎙️ Voice Input</h3>

      <button
        className={`px-4 py-2 rounded text-white ${
          recording ? "bg-red-600" : "bg-green-600"
        }`}
        onClick={recording ? stopRecording : startRecording}
      >
        {recording ? "Stop Recording" : "Start Recording"}
      </button>

      {transcript && (
        <div className="bg-gray-100 p-2 rounded">
          <p>
            <strong>Transcript:</strong> {transcript}
          </p>
        </div>
      )}

      {aiResponse && (
        <div className="bg-blue-100 p-2 rounded space-y-2">
          <p>
            <strong>Notes:</strong> {aiResponse.notes}
          </p>
          <p>
            <strong>Billing Codes:</strong>{" "}
            {aiResponse.billing_codes.join(", ")}
          </p>
          <p>
            <strong>Follow-up:</strong> {aiResponse.follow_up_date}
          </p>
          {Array.isArray(aiResponse.teeth_chart_updates) && (
            <div>
              <strong>Tooth Chart Updates:</strong>
              <ul className="list-disc list-inside">
                {aiResponse.teeth_chart_updates.map((t, idx) => (
                  <li key={idx}>
                    Tooth {t.tooth_number}: {t.status} ({t.notes})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
