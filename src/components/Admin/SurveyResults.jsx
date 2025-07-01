import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useTranslation } from "react-i18next";

export default function SurveyResults() {
  const { t } = useTranslation();
  const [surveys, setSurveys] = useState([]);

  useEffect(() => {
    supabase
      .from("patient_surveys")
      .select(
        `
        id, rating, comments, responded_at,
        patients(first_name,last_name), appointments(date)
      `
      )
      .eq("responded_at", supabase.rpc("now"))
      .order("responded_at", { ascending: false })
      .then(({ data }) => setSurveys(data));
  }, []);

  if (!surveys.length) return <p>{t("message.no_surveys")}</p>;

  return (
    <table className="min-w-full bg-white border">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-4 py-2 text-left">{t("table_header.name")}</th>
          <th className="px-4 py-2 text-left">{t("table_header.date")}</th>
          <th className="px-4 py-2 text-left">{t("table_header.rating")}</th>
          <th className="px-4 py-2 text-left">{t("table_header.comments")}</th>
        </tr>
      </thead>
      <tbody>
        {surveys.map((s) => (
          <tr key={s.id} className="border-t">
            <td className="px-4 py-2">
              {s.patients.first_name} {s.patients.last_name}
            </td>
            <td className="px-4 py-2">{s.appointments.date}</td>
            <td className="px-4 py-2">{s.rating}</td>
            <td className="px-4 py-2">{s.comments || t("text.na")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}