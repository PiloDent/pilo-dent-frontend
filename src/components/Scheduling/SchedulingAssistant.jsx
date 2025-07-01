// src/components/Scheduling/SchedulingAssistant.jsx
import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useTranslation } from "react-i18next";

export default function SchedulingAssistant({ patientId, onBook }) {
  const { t } = useTranslation();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    fetch("/functions/v1/recommend-slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId }),
    })
      .then((res) => res.json())
      .then((json) => setSlots(json.recommendations || []))
      .catch(() => setError(t("scheduling_assistant.load_error")))
      .finally(() => setLoading(false));
  }, [patientId, t]);

  const bookSlot = async (slot) => {
    setLoading(true);
    const { data, error: bookError } = await supabase
      .from("appointments")
      .insert({
        patient_id: patientId,
        date: slot.date,
        appointment_time: slot.time,
        dentist_id: slot.dentist_id,
      });
    setLoading(false);

    if (bookError) {
      setError(t("scheduling_assistant.booking_failed"));
    } else {
      onBook?.(data);
    }
  };

  if (loading) {
    return <p>{t("scheduling_assistant.loading")}</p>;
  }
  if (error) {
    return <p className="text-red-600">{error}</p>;
  }
  if (!slots.length) {
    return <p>{t("scheduling_assistant.no_suggestions")}</p>;
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">{t("scheduling_assistant.title")}</h3>
      <ul>
        {slots.map((s) => (
          <li key={`${s.date}-${s.time}`} className="flex justify-between">
            <span>
              {new Date(s.date).toLocaleDateString()} @ {s.time}
            </span>
            <button
              onClick={() => bookSlot(s)}
              className="bg-blue-600 text-white px-2 py-1 rounded"
            >
              {t("scheduling_assistant.book_button")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
