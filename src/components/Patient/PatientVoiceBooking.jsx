import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";

export default function PatientVoiceBooking() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    if (recording && mediaRecorder) mediaRecorder.start();
  }, [recording, mediaRecorder]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const _chunks = [];

    recorder.ondataavailable = (e) => _chunks.push(e.data);
    recorder.onstop = async () => {
      const audioBlob = new Blob(_chunks, { type: "audio/webm" });
      await handleTranscription(audioBlob);
    };

    setChunks([]);
    setMediaRecorder(recorder);
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder.stop();
    setRecording(false);
  };

  const handleTranscription = async (audioBlob) => {
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

    const prompt = `
You are a patient intake assistant. Based on the following description, decide:
- how urgent the problem is
- how long the appointment should be in minutes (15, 30, or 60)
- what date to suggest (must be future)
- what kind of dentist to assign (general, surgery, orthodontist, etc.)

Return ONLY JSON in this format:

{
  "duration_minutes": number,
  "suggested_date": "YYYY-MM-DDTHH:MM",
  "reason": "short explanation"
}

Symptom description: "${spokenText}"
`;

    const aiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{ role: "user", content: prompt }],
        }),
      }
    );

    const chatData = await aiResponse.json();

    try {
      const parsed = JSON.parse(chatData.choices[0].message.content);
      setAiResult(parsed);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const dentistId = await getAvailableDentistId();
      const availableSlot = await findAvailableTimeSlot(
        dentistId,
        parsed.suggested_date,
        parsed.duration_minutes
      );

      if (!availableSlot) {
        alert("No available time slot found for selected date.");
        return;
      }

      await supabase.from("appointments").insert([
        {
          patient_id: user.id,
          dentist_id: dentistId,
          scheduled_time: availableSlot,
          duration_minutes: parsed.duration_minutes,
          notes: parsed.reason,
        },
      ]);

      setBookingSuccess(true);
    } catch (err) {
      console.error("AI parse error", err);
      alert("Sorry, couldn't understand the result.");
    }
  };

  const getAvailableDentistId = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "dentist")
      .limit(1);
    return data?.[0]?.id;
  };

  const findAvailableTimeSlot = async (
    dentistId,
    preferredDate,
    durationMinutes
  ) => {
    const date = new Date(preferredDate);
    const openingHour = 7;
    const closingHour = 19;
    const blockMinutes = 15;

    for (let h = openingHour; h <= closingHour; h++) {
      for (let m = 0; m < 60; m += blockMinutes) {
        const slot = new Date(date);
        slot.setHours(h, m, 0, 0);

        const { data: existing } = await supabase
          .from("appointments")
          .select("*")
          .eq("dentist_id", dentistId)
          .gte("scheduled_time", slot.toISOString())
          .lt(
            "scheduled_time",
            new Date(slot.getTime() + durationMinutes * 60000).toISOString()
          );

        if (existing.length === 0) {
          return slot.toISOString();
        }
      }
    }

    return null;
  };

  return (
    <div className="max-w-xl mx-auto mt-10 border p-6 rounded shadow space-y-6">
      <h2 className="text-xl font-bold">🗣️ Voice Booking Assistant</h2>

      <button
        className={`w-full px-4 py-2 rounded text-white ${
          recording ? "bg-red-600" : "bg-green-600"
        }`}
        onClick={recording ? stopRecording : startRecording}
      >
        {recording ? "Stop Recording" : "Start Recording"}
      </button>

      {transcript && (
        <p>
          <strong>Transcript:</strong> {transcript}
        </p>
      )}

      {aiResult && (
        <div className="bg-blue-100 p-4 rounded space-y-1">
          <p>
            <strong>Reason:</strong> {aiResult.reason}
          </p>
          <p>
            <strong>Preferred:</strong> {aiResult.suggested_date}
          </p>
          <p>
            <strong>Duration:</strong> {aiResult.duration_minutes} min
          </p>
        </div>
      )}

      {bookingSuccess && (
        <p className="text-green-600 font-medium">
          ✅ Appointment booked successfully!
        </p>
      )}
    </div>
  );
}
