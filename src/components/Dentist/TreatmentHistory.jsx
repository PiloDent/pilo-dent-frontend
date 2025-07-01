import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import jsPDF from "jspdf";
import "jspdf-autotable";
import EditTreatmentModal from "./EditTreatmentModal";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import moment from "moment";

export default function TreatmentHistory({ patientId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editingEntry, setEditingEntry] = useState(null);

  useEffect(() => {
    if (patientId) fetchHistory();
  }, [patientId, startDate, endDate]);

  const fetchHistory = async () => {
    setLoading(true);

    let query = supabase
      .from("treatment_history")
      .select("*, billing_codes(code, description, cost, category)")
      .eq("patient_id", patientId);

    if (startDate) query = query.gte("treatment_date", startDate);
    if (endDate) query = query.lte("treatment_date", endDate);

    const { data, error } = await query.order("treatment_date", {
      ascending: false,
    });

    if (error) {
      console.error("Error fetching history:", error);
    } else {
      setHistory(data);
    }

    setLoading(false);
  };

  const exportCSV = () => {
    if (history.length === 0) return;

    const rows = history.map((entry) => ({
      Date: new Date(entry.treatment_date).toLocaleDateString(),
      Tooth: entry.tooth || "-",
      Description: entry.treatment_description,
      Code: entry.billing_codes?.code || "",
      Category: entry.billing_codes?.category || "",
      Cost: entry.billing_codes?.cost?.toFixed(2) || "0.00",
    }));

    const csv = [
      Object.keys(rows[0]).join(","),
      ...rows.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "treatment_history.csv");
    link.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const tableData = history.map((entry) => [
      new Date(entry.treatment_date).toLocaleDateString(),
      entry.tooth || "-",
      entry.treatment_description,
      entry.billing_codes?.code || "",
      entry.billing_codes?.category || "",
      entry.billing_codes?.cost?.toFixed(2) || "0.00",
    ]);

    doc.text("Treatment History", 14, 16);
    doc.autoTable({
      startY: 20,
      head: [["Date", "Tooth", "Description", "Code", "Category", "Cost (€)"]],
      body: tableData,
    });

    doc.save("treatment_history.pdf");
  };

  const groupBy = (period) => {
    const groups = {};
    history.forEach((entry) => {
      const key = moment(entry.treatment_date).startOf(period).format("YYYY-MM-DD");
      const cost = entry.billing_codes?.cost || 0;
      groups[key] = (groups[key] || 0) + cost;
    });
    return Object.entries(groups).map(([key, value]) => ({
      period: key,
      Revenue: Math.round(value * 100) / 100,
    }));
  };

  return (
    <div className="mt-8 p-4 border rounded bg-white shadow">
      <h3 className="text-lg font-semibold mb-4">📋 Treatment History</h3>

      {/* Filter */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <label className="block text-sm">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border p-2 rounded"
          />
        </div>
        <div>
          <label className="block text-sm">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border p-2 rounded"
          />
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : history.length === 0 ? (
        <p>No treatments recorded yet.</p>
      ) : (
        <>
          {/* Export buttons */}
          <div className="flex justify-end mb-2 space-x-2">
            <button
              onClick={exportCSV}
              className="px-3 py-1 bg-gray-700 text-white rounded text-sm"
            >
              📥 Export CSV
            </button>
            <button
              onClick={exportPDF}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
            >
              📄 Export PDF
            </button>
          </div>

          {/* Table */}
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Date</th>
                <th className="p-2 border">Tooth</th>
                <th className="p-2 border">Description</th>
                <th className="p-2 border">Code</th>
                <th className="p-2 border">Category</th>
                <th className="p-2 border">Cost (€)</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id}>
                  <td className="p-2 border">{new Date(entry.treatment_date).toLocaleDateString()}</td>
                  <td className="p-2 border">{entry.tooth || "-"}</td>
                  <td className="p-2 border">{entry.treatment_description}</td>
                  <td className="p-2 border">{entry.billing_codes?.code}</td>
                  <td className="p-2 border">{entry.billing_codes?.category}</td>
                  <td className="p-2 border">{entry.billing_codes?.cost?.toFixed(2)}</td>
                  <td className="p-2 border">
                    <button
                      onClick={() => setEditingEntry(entry)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      ✏️ Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-6 bg-gray-50 p-4 rounded border">
            <h4 className="font-semibold mb-2">💰 Billing Totals</h4>
            <p><strong>Total Treatments:</strong> {history.length}</p>
            <p>
              <strong>Total Revenue:</strong>{" "}
              {history.reduce((sum, e) => sum + (e.billing_codes?.cost || 0), 0).toFixed(2)} €
            </p>
          </div>

          {/* Billing Graphs */}
          <div className="mt-8 space-y-8">
            {["day", "week", "month", "year"].map((period) => (
              <div key={period}>
                <h4 className="text-md font-semibold capitalize mb-2">
                  📈 Revenue by {period}
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={groupBy(period)}>
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Revenue" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </>
      )}

      {editingEntry && (
        <EditTreatmentModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaved={fetchHistory}
        />
      )}
    </div>
  );
}
