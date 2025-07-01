import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useTranslation } from "react-i18next";

export default function RescheduleRequests() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    supabase
      .from("appointments")
      .select(
        "id, date, appointment_time, patient_first_name, patient_last_name, reschedule_requested"
      )
      .eq("reschedule_requested", true)
      .order("date", { ascending: true })
      .then(({ data }) => setRequests(data));
  }, []);

  if (!requests.length) return <p>{t("message.no_reschedule_requests")}</p>;

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-2">{t("header.reschedule_requests")}</h2>
      <ul>
        {requests.map((r) => (
          <li key={r.id} className="border-b py-2">
            {r.patient_first_name} {r.patient_last_name} – {r.date} {t("text.at")} {r.appointment_time}
          </li>
        ))}
      </ul>
    </div>
  );
}
