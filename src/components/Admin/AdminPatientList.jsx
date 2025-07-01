import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { useTranslation } from "react-i18next";

export default function AdminPatientList() {
  const { t } = useTranslation();
  const [patients, setPatients] = useState([]);
  const [nameFilter, setNameFilter] = useState("");
  const [insurerFilter, setInsurerFilter] = useState("");

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    const { data, error } = await supabase
      .from("patients")
      .select(
        "id, first_name, last_name, dob, insurer_type, insurance_provider, status, updated_at"
      )
      .order("updated_at", { ascending: false });

    if (error) return console.error(t("error.fetch_patients"), error);
    setPatients(data);
  };

  const filtered = patients.filter((p) => {
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    if (!fullName.includes(nameFilter.toLowerCase())) return false;
    if (insurerFilter && p.insurer_type !== insurerFilter) return false;
    return true;
  });

  const exportCSV = () => {
    const header = [
      t("table_header.first"),
      t("table_header.last"),
      t("table_header.dob"),
      t("table_header.insurer_type"),
      t("table_header.provider"),
      t("table_header.status"),
    ];
    const rows = filtered.map((p) => [
      p.first_name,
      p.last_name,
      new Date(p.dob).toLocaleDateString(),
      p.insurer_type,
      p.insurance_provider,
      p.status,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "patients_report.csv";
    a.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(t("header.patient_report"), 14, 16);
    doc.autoTable({
      head: [[
        t("table_header.first"),
        t("table_header.last"),
        t("table_header.dob"),
        t("table_header.insurer_type"),
        t("table_header.provider"),
        t("table_header.status"),
      ]],
      body: filtered.map((p) => [
        p.first_name,
        p.last_name,
        new Date(p.dob).toLocaleDateString(),
        p.insurer_type,
        p.insurance_provider,
        p.status,
      ]),
      startY: 22,
    });
    doc.save("patients_report.pdf");
  };

  const getPDFUrl = (id) => {
    const { data } = supabase.storage.from("intake_forms").getPublicUrl(`patient_${id}.pdf`);
    return data.publicUrl;
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{t("header.admin_patient_list")}</h1>

      <div className="flex flex-wrap gap-4 mb-4">
        <input
          type="text"
          placeholder={t("placeholder.search_name")}
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className="p-2 border rounded"
        />
        <select
          value={insurerFilter}
          onChange={(e) => setInsurerFilter(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">{t("placeholder.all_insurer_types")}</option>
          <option value="public">{t("option.public")}</option>
          <option value="private">{t("option.private")}</option>
        </select>
        <button onClick={exportCSV} className="bg-gray-700 text-white px-3 py-1 rounded">
          {t("button.export_csv")}
        </button>
        <button onClick={exportPDF} className="bg-blue-600 text-white px-3 py-1 rounded">
          {t("button.export_pdf")}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead className="bg-gray-100">
            <tr>
              {[
                "first",
                "last",
                "dob",
                "insurer_type",
                "provider",
                "status",
                "intake_form",
              ].map((key) => (
                <th key={key} className="px-4 py-2 border text-left">
                  {t(`table_header.${key}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border">{p.first_name}</td>
                <td className="px-4 py-2 border">{p.last_name}</td>
                <td className="px-4 py-2 border">{new Date(p.dob).toLocaleDateString()}</td>
                <td className="px-4 py-2 border">{p.insurer_type}</td>
                <td className="px-4 py-2 border">{p.insurance_provider}</td>
                <td className="px-4 py-2 border">{p.status}</td>
                <td className="px-4 py-2 border">
                  {p.status !== "awaiting_form" ? (
                    <a
                      href={getPDFUrl(p.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {t("link.view_pdf")}
                    </a>
                  ) : (
                    <span className="text-gray-500">{t("text.na")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
