import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/supabaseClient";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { useTranslation } from "react-i18next";

const COLORS = ["#4ade80", "#facc15"]; // Work, Break

export default function AdminWorkLogStats() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [view, setView] = useState("week");
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const fetchLogs = async () => {
    setLoading(true);
    const fromDate = view === "week" ? startOfWeek : startOfMonth;
    const { data, error } = await supabase
      .from("work_logs")
      .select("check_in, check_out, lunch_start, lunch_end, date")
      .gte("date", fromDate.toISOString().split("T")[0])
      .lte("date", today.toISOString().split("T")[0]);
    if (error) console.error(t("error.fetch_logs"), error.message);
    else setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [view]);

  const processData = () => {
    const dailyTotals = {};
    let totalWork = 0;
    let totalBreak = 0;

    logs.forEach((log) => {
      const label = new Date(log.date).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      let workMins = 0;
      if (log.check_in && log.check_out) {
        workMins = (new Date(log.check_out) - new Date(log.check_in)) / 60000;
      }
      let breakMins = 0;
      if (log.lunch_start && log.lunch_end) {
        breakMins =
          (new Date(log.lunch_end) - new Date(log.lunch_start)) / 60000;
      }
      const pureWork = workMins - breakMins;
      dailyTotals[label] = (dailyTotals[label] || 0) + pureWork;
      totalWork += pureWork;
      totalBreak += breakMins;
    });

    const barData = Object.entries(dailyTotals).map(([day, mins]) => ({
      name: day,
      hours: parseFloat((mins / 60).toFixed(2)),
    }));
    const pieData = [
      { name: t("label.work"), value: totalWork },
      { name: t("label.break"), value: totalBreak },
    ];
    return { barData, pieData };
  };

  const { barData, pieData } = processData();

  const exportCSV = () => {
    const header = [t("table_header.day"), t("table_header.hours_worked")];
    const rows = barData.map((d) => [d.name, d.hours]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `worklog_${view}.csv`;
    link.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(t("header.worklog_pdf", { view: t(`view.${view}`) }), 14, 16);
    doc.autoTable({
      head: [[t("table_header.day"), t("table_header.hours_worked")]],
      body: barData.map((d) => [d.name, d.hours]),
      startY: 22,
    });
    doc.save(`worklog_${view}.pdf`);
  };

  const exportXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(
      barData.map((d) => ({ [t("table_header.day")]: d.name, [t("table_header.hours_worked")]: d.hours }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WorkLog");
    XLSX.writeFile(wb, `worklog_${view}.xlsx`);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">{t("header.work_time_overview")}</h2>

      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => setView("week")}
          className={`px-4 py-2 rounded ${
            view === "week" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
        >
          {t("view.week")}
        </button>
        <button
          onClick={() => setView("month")}
          className={`px-4 py-2 rounded ${
            view === "month" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
        >
          {t("view.month")}
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={exportCSV} className="bg-gray-700 text-white px-3 py-1 rounded">
          {t("button.export_csv")}
        </button>
        <button onClick={exportPDF} className="bg-blue-600 text-white px-3 py-1 rounded">
          {t("button.export_pdf")}
        </button>
        <button onClick={exportXLSX} className="bg-green-600 text-white px-3 py-1 rounded">
          {t("button.export_xlsx")}
        </button>
      </div>

      {loading ? (
        <p>{t("message.loading_charts")}</p>
      ) : (
        <>
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-2">{t("header.hours_per_day")}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <XAxis dataKey="name" />
                <YAxis unit="h" />
                <Tooltip />
                <Bar dataKey="hours" fill={COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-2">{t("header.work_vs_break")}</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
