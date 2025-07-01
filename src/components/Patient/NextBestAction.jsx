// src/components/Patient/NextBestAction.jsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/supabaseClient";

export default function NextBestAction({ patientId }) {
  const { t } = useTranslation();
  const [action, setAction] = useState(t("next_best_action.loading"));

  useEffect(() => {
    (async () => {
      setAction(t("next_best_action.loading"));
      // 1) Last appointment
      const { data: lastAppt } = await supabase
        .from("appointments")
        .select("date")
        .eq("patient_id", patientId)
        .order("date", { ascending: false })
        .limit(1)
        .single();

      // 2) Next appointment
      const tomorrow = new Date().toISOString().split("T")[0];
      const { data: nextAppt } = await supabase
        .from("appointments")
        .select("date, appointment_time, no_show_score")
        .eq("patient_id", patientId)
        .gte("date", tomorrow)
        .order("date", { ascending: true })
        .limit(1)
        .single();

      // 3) Allergy flag
      const { data: patient } = await supabase
        .from("patients")
        .select("allergies")
        .eq("id", patientId)
        .single();

      let suggestion = "";
      if (!nextAppt) {
        // No upcoming appt
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        if (new Date(lastAppt?.date) < sixMonthsAgo) {
          suggestion = t("next_best_action.over_six_months");
        } else {
          suggestion = t("next_best_action.no_upcoming_appt");
        }
      } else if (nextAppt.no_show_score > 0.7) {
        suggestion = t("next_best_action.high_no_show", {
          pct: Math.round(nextAppt.no_show_score * 100),
          date: nextAppt.date,
        });
      } else {
        suggestion = t("next_best_action.all_set", {
          date: nextAppt.date,
          time: nextAppt.appointment_time,
        });
      }

      if (patient?.allergies) {
        suggestion +=
          " 🔔 " +
          t("next_best_action.allergy_note", { allergies: patient.allergies });
      }

      setAction(suggestion);
    })();
  }, [patientId, t]);

  return (
    <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400">
      <h3 className="font-semibold mb-2">{t("next_best_action.title")}</h3>
      <p>{action}</p>
    </div>
  );
}
