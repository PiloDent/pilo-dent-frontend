import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function BusinessInsights() {
  const { t } = useTranslation();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/functions/v1/business-insights")
      .then((res) => res.json())
      .then(setInsights)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>{t("message.loading_insights")}</p>;
  if (!insights) return <p>{t("message.unable_load_insights")}</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded shadow space-y-6">
      <h1 className="text-2xl font-bold">{t("header.business_insights")}</h1>

      <div className="space-y-4">
        <div>
          <h2 className="font-semibold">{t("label.revenue_last_30d")}</h2>
          <p className="text-xl">{insights.totalRevenue.toLocaleString()} €</p>
        </div>

        <div>
          <h2 className="font-semibold">{t("label.appointments")}</h2>
          <p>
            {t("text.scheduled")}:{" "}{insights.appointmentStats.scheduled}
          </p>
          <p>
            {t("text.completed")}:{" "}{insights.appointmentStats.completed}
          </p>
        </div>

        <div>
          <h2 className="font-semibold">{t("label.chair_time")}</h2>
          <p>{insights.totalChairTimeMins} {t("text.minutes")}</p>
        </div>
      </div>
    </div>
  );
}
