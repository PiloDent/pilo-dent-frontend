import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useTranslation } from "react-i18next";

export default function AdminWorkLogViewer() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("id, full_name")
      .order("full_name");

    if (error) {
      console.error(t("error.fetch_employees"), error.message);
    } else {
      setEmployees(data);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from("work_logs")
      .select("*, employees(full_name)")
      .eq("date", date)
      .order("check_in", { ascending: true });

    if (selectedEmployeeId) {
      query = query.eq("employee_id", selectedEmployeeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error(t("error.fetch_logs"), error.message);
    } else {
      setLogs(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [date, selectedEmployeeId]);

  const formatTime = (timestamp) =>
    timestamp
      ? new Date(timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : t("text.na");

  const calcDuration = (checkIn, checkOut, breakStart, breakEnd) => {
    if (!checkIn || !checkOut) return t("text.na");

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    let duration = (end - start) / (1000 * 60); // minutes

    if (breakStart && breakEnd) {
      duration -= (new Date(breakEnd) - new Date(breakStart)) / (1000 * 60);
    }

    return `${Math.floor(duration / 60)}h ${Math.round(duration % 60)}m`;
  };

  const exportCSV = () => {
    const headers = [
      t("table_header.employee"),
      t("table_header.check_in"),
      t("table_header.start_break"),
      t("table_header.end_break"),
      t("table_header.check_out"),
      t("table_header.total_time"),
      t("table_header.latitude"),
      t("table_header.longitude"),
    ];

    const rows = logs.map((log) => [
      log.employees?.full_name || t("text.na"),
      formatTime(log.check_in),
      formatTime(log.lunch_start),
      formatTime(log.lunch_end),
      formatTime(log.check_out),
      calcDuration(log.check_in, log.check_out, log.lunch_start, log.lunch_end),
      log.latitude ? log.latitude.toFixed(4) : t("text.na"),
      log.longitude ? log.longitude.toFixed(4) : t("text.na"),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `work_logs_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">{t("header.work_logs")}</h2>

      <div className="flex flex-wrap gap-4 mb-4">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="p-2 border rounded"
        />

        <select
          value={selectedEmployeeId}
          onChange={(e) => setSelectedEmployeeId(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">{t("placeholder.all_employees")}</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.full_name}
            </option>
          ))}
        </select>

        <button
          onClick={exportCSV}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={logs.length === 0}
        >
          {t("button.export_csv")}
        </button>
      </div>

      {loading ? (
        <p>{t("message.loading_logs")}</p>
      ) : logs.length === 0 ? (
        <p>{t("message.no_logs_found")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-auto border border-gray-300 rounded text-sm">
            <thead className="bg-gray-100">
              <tr>
                {[
                  "employee",
                  "check_in",
                  "start_break",
                  "end_break",
                  "check_out",
                  "total_time",
                  "latitude",
                  "longitude",
                ].map((key) => (
                  <th key={key} className="p-2">
                    {t(`table_header.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="p-2">{log.employees?.full_name || t("text.na")}</td>
                  <td className="p-2">{formatTime(log.check_in)}</td>
                  <td className="p-2">{formatTime(log.lunch_start)}</td>
                  <td className="p-2">{formatTime(log.lunch_end)}</td>
                  <td className="p-2">{formatTime(log.check_out)}</td>
                  <td className="p-2">{calcDuration(log.check_in, log.check_out, log.lunch_start, log.lunch_end)}</td>
                  <td className="p-2">{log.latitude ? log.latitude.toFixed(4) : t("text.na")}</td>
                  <td className="p-2">{log.longitude ? log.longitude.toFixed(4) : t("text.na")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
