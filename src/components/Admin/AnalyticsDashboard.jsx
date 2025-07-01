import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useTranslation } from "react-i18next";

export default function AnalyticsDashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/functions/analytics-summary")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data) return <p>{t("message.loading_analytics")}</p>;

  const { newIntakes, appointmentStats, workLog, avgSurvey, waitlist } = data;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">{t("header.analytics_dashboard")}</h1>

      {/* 1: New Intakes Line Chart */}
      <div>
        <h2 className="text-lg font-semibold">
          {t("header.new_intakes")}
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={newIntakes}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#4ade80" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 2: Appointments */}
      <div>
        <h2 className="text-lg font-semibold">{t("header.appointments")}</h2>
        <p>
          {t("text.scheduled")}:{" "}{appointmentStats.scheduled}, {t("text.completed")}:{" "}{appointmentStats.completed}, {t("text.no_show_rate")}:{" "}{(appointmentStats.noShowRate * 100).toFixed(1)}%
        </p>
      </div>

      {/* 3: Work Log Pie */}
      <div>
        <h2 className="text-lg font-semibold">
          {t("header.today_work_vs_break")}
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={[
                { name: t("label.work"), value: workLog.workHours },
                { name: t("label.break"), value: workLog.breakHours },
              ]}
              dataKey="value"
              nameKey="name"
              label
            >
              <Cell fill="#4ade80" />
              <Cell fill="#facc15" />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 4: Survey */}
      <div>
        <h2 className="text-lg font-semibold">
          {t("header.avg_survey_rating")}
        </h2>
        <p className="text-3xl font-bold">
          {avgSurvey ? avgSurvey.toFixed(2) : t("text.na")}
        </p>
      </div>

      {/* 5: Waitlist */}
      <div>
        <h2 className="text-lg font-semibold">{t("header.waitlist")}</h2>
        <p>
          {t("text.requested")}:{" "}{waitlist.requested}, {t("text.notified")}:{" "}{waitlist.notified}
        </p>
      </div>
    </div>
  );
}
