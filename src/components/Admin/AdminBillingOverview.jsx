import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { useTranslation } from "react-i18next";

export default function AdminBillingOverview() {
  const { t } = useTranslation();
  const [billingData, setBillingData] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchBillingData();
  }, [startDate, endDate]);

  const fetchBillingData = async () => {
    let query = supabase
      .from("treatment_history")
      .select(
        "id, dentist_id, treatment_date, billing_codes(code, category, cost), dentists(name)"
      );

    if (startDate) query = query.gte("treatment_date", startDate);
    if (endDate) query = query.lte("treatment_date", endDate);

    const { data, error } = await query;

    if (error) {
      console.error(t("error.failed_fetch_billing"), error);
    } else {
      setBillingData(data);
    }
  };

  const groupByDentist = () => {
    const dentists = {};

    billingData.forEach((entry) => {
      const dentistId = entry.dentist_id;
      const name = entry.dentists?.name || t("text.unknown_dentist");
      const category = entry.billing_codes?.category || t("text.unknown");
      const cost = entry.billing_codes?.cost || 0;

      if (!dentists[dentistId]) {
        dentists[dentistId] = {
          name,
          totalRevenue: 0,
          treatmentCount: 0,
          categories: {},
        };
      }

      dentists[dentistId].totalRevenue += cost;
      dentists[dentistId].treatmentCount += 1;
      dentists[dentistId].categories[category] =
        (dentists[dentistId].categories[category] || 0) + cost;
    });

    return Object.values(dentists);
  };

  const exportCSV = () => {
    const rows = groupByDentist().map((dentist) => ({
      [t("table_header.dentist")]: dentist.name,
      [t("table_header.treatments")]: dentist.treatmentCount,
      [t("table_header.total_eur")]: dentist.totalRevenue.toFixed(2),
      [t("table_header.bema_eur")]: (dentist.categories["BEMA"] || 0).toFixed(2),
      [t("table_header.goz_eur")]: (dentist.categories["GOZ"] || 0).toFixed(2),
    }));

    const csv = [
      Object.keys(rows[0]).join(","),
      ...rows.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "admin_billing_overview.csv");
    link.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const tableData = groupByDentist().map((dentist) => [
      dentist.name,
      dentist.treatmentCount,
      dentist.totalRevenue.toFixed(2),
      (dentist.categories["BEMA"] || 0).toFixed(2),
      (dentist.categories["GOZ"] || 0).toFixed(2),
    ]);

    doc.text(t("header.admin_billing_overview"), 14, 16);
    doc.autoTable({
      startY: 20,
      head: [[
        t("table_header.dentist"),
        t("table_header.treatments"),
        t("table_header.total_eur"),
        t("table_header.bema_eur"),
        t("table_header.goz_eur"),
      ]],
      body: tableData,
    });

    doc.save("admin_billing_overview.pdf");
  };

  const grouped = groupByDentist();

  return (
    <div className="p-6 bg-white border rounded shadow max-w-5xl mx-auto mt-10 space-y-6">
      <h2 className="text-xl font-bold">{t("header.admin_billing_overview")}</h2>

      {/* Date Filters */}
      <div className="flex space-x-4">
        <div>
          <label className="text-sm">{t("label.start_date")}</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border p-2 rounded"
          />
        </div>
        <div>
          <label className="text-sm">{t("label.end_date")}</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border p-2 rounded"
          />
        </div>
      </div>

      {/* Export Buttons */}
      <div className="flex justify-end space-x-2">
        <button
          onClick={exportCSV}
          className="bg-gray-700 text-white px-4 py-2 rounded text-sm"
        >
          {t("button.export_csv")}
        </button>
        <button
          onClick={exportPDF}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
        >
          {t("button.export_pdf")}
        </button>
      </div>

      {/* Table */}
      <table className="w-full table-auto border-collapse mt-4">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2 text-left">{t("table_header.dentist")}</th>
            <th className="border p-2 text-left">{t("table_header.treatments")}</th>
            <th className="border p-2 text-left">{t("table_header.total_eur")}</th>
            <th className="border p-2 text-left">{t("table_header.bema_eur")}</th>
            <th className="border p-2 text-left">{t("table_header.goz_eur")}</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map((dentist) => (
            <tr key={dentist.name}>
              <td className="border p-2">{dentist.name}</td>
              <td className="border p-2">{dentist.treatmentCount}</td>
              <td className="border p-2">{dentist.totalRevenue.toFixed(2)}</td>
              <td className="border p-2">{(dentist.categories["BEMA"] || 0).toFixed(2)}</td>
              <td className="border p-2">{(dentist.categories["GOZ"] || 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}