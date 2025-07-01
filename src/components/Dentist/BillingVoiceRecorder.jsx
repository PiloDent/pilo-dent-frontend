import { useState } from "react";

export default function BillingVoiceRecorder({ patientId }) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [matchedCodes, setMatchedCodes] = useState([]);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    let chunks = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      const audioBlob = new Blob(chunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("file", audioBlob, "voice-input.webm");

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.text) {
        setTranscript(data.text);
        saveTranscript(data.text);
        matchBillingCodes(data.text);
      } else {
        console.error(data.error);
      }
    };

    recorder.start();
    setMediaRecorder(recorder);
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setRecording(false);
  };

  const saveTranscript = async (text) => {
    await fetch("/api/save-transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, text }),
    });
  };

  const matchBillingCodes = async (text) => {
    const res = await fetch("/api/match-billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const data = await res.json();
    if (data.success) setMatchedCodes(data.codes || []);
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <button
        className={`px-4 py-2 rounded ${
          recording ? "bg-red-500" : "bg-green-500"
        } text-white`}
        onClick={recording ? stopRecording : startRecording}
      >
        🎙 {recording ? "Stop Recording" : "Start Recording"}
      </button>

      {transcript && (
        <div className="mt-4">
          <p className="text-gray-700 font-semibold">Transcript:</p>
          <p className="text-sm">{transcript}</p>
        </div>
      )}

      {matchedCodes.length > 0 && (
        <div className="mt-4">
          <p className="text-gray-700 font-semibold">Matched Codes:</p>
          <ul className="list-disc list-inside text-sm">
            {matchedCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
