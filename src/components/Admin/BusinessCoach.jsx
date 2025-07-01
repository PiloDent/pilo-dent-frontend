import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function BusinessCoach() {
  const { t } = useTranslation();
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    fetch("/functions/business-insights")
      .then((res) => res.json())
      .then(setInsights)
      .catch(console.error);
  }, []);

  if (!insights) return <p>{t("message.loading_business_insights")}</p>;

  return (
    <section className="p-6 bg-white rounded shadow space-y-4">
      <h2 className="text-xl font-bold">{t("header.business_coach")}</h2>
      <p>
        <strong>{t("label.revenue_30d")}:</strong> €{insights.revenueLast30Days.toFixed(2)}
      </p>
      <p>
        <strong>{t("label.appointments")}:</strong> {insights.appointments.total} {t("text.total")}, {insights.appointments.noShows} {t("text.no_shows")}
      </p>
      <p>
        <strong>{t("label.avg_value")}:</strong> €{insights.avgAppointmentValue.toFixed(2)}
      </p>
      <div>
        <strong>{t("label.top_procedures")}:</strong>
        <ul className="list-disc pl-5">
          {insights.topProcedures.map((tproc) => (
            <li key={tproc.billing_code.code}>
              {tproc.billing_code.code} – {tproc.billing_code.description}: €{tproc.sum_amount.toFixed(2)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
