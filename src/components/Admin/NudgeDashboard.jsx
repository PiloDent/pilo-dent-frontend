import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useTranslation } from "react-i18next";

export default function NudgeDashboard() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNudges = async () => {
      setLoading(true);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const dateStr = yesterday.toISOString().split("T")[0];
      const start = `${dateStr} 00:00:00`;
      const end = `${dateStr} 23:59:59`;

      const { data, error } = await supabase
        .from("treatment_history")
        .select(
          `
          id,
          created_at,
          nudge_sent,
          patients:first_name,last_name,email,phone
        `
        )
        .gte("created_at", start)
        .lte("created_at", end)
        .eq("nudge_sent", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(t("error.fetch_nudges"), error);
        setEntries([]);
      } else {
        setEntries(data);
      }
      setLoading(false);
    };

    fetchNudges();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">{t("header.nudge_dashboard")}</h1>

      {loading ? (
        <p>{t("message.loading")}</p>
      ) : entries.length === 0 ? (
        <p className="text-gray-500">{t("message.no_nudges")}</p>
      ) : (
        <table className="min-w-full border">
          <thead className="bg-gray-100">
            <tr>
              {["time", "patient", "email", "phone", "nudged"].map((key) => (
                <th key={key} className="px-4 py-2 border text-left">
                  {t(`table_header.${key}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border">
                  {new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-2 border">
                  {e.patients.first_name} {e.patients.last_name}
                </td>
                <td className="px-4 py-2 border">{e.patients.email}</td>
                <td className="px-4 py-2 border">{e.patients.phone}</td>
                <td className="px-4 py-2 border">
                  {e.nudge_sent ? t("text.yes") : t("text.no")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
