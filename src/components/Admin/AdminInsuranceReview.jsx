import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import ExportButtons from "../Shared/ExportButtons";
import { useTranslation } from "react-i18next";

export default function AdminInsuranceReview() {
  const { t } = useTranslation();
  const [submissions, setSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [updatedSummary, setUpdatedSummary] = useState("");

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    const { data, error } = await supabase
      .from("insurance_submissions")
      .select(
        `
        id,
        patient_id,
        summary_text,
        reviewed,
        created_at,
        patients (first_name, last_name),
        dentists (first_name, last_name)
      `)
      .order("created_at", { ascending: false });

    if (error) console.error(t("error.loading_submissions"), error);
    else setSubmissions(data || []);
  };

  const exportData = submissions.map((s) => ({
    id:           s.id,
    patient:      `${s.patients.first_name} ${s.patients.last_name}`,
    dentist:      `${s.dentists.first_name} ${s.dentists.last_name}`,
    date:         new Date(s.created_at).toLocaleDateString(),
    reviewed:     s.reviewed ? t("text.yes") : t("text.no"),
    summary_text: s.summary_text.replace(/\r?\n/g, " "),
  }));

  const columns = [
    { header: t("table_header.id"),           accessor: "id"           },
    { header: t("table_header.patient"),      accessor: "patient"      },
    { header: t("table_header.dentist"),      accessor: "dentist"      },
    { header: t("table_header.date"),         accessor: "date"         },
    { header: t("table_header.reviewed"),     accessor: "reviewed"     },
    { header: t("table_header.summary_text"), accessor: "summary_text" },
  ];

  const exportPDF = async () => {
    const element = document.getElementById("review-section");
    if (!element) return;
    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 10, width, height);
    pdf.save(`insurance_submission_${selected.id}.pdf`);
  };

  const saveSummaryUpdate = async () => {
    if (!selected) return;
    await supabase
      .from("insurance_submissions")
      .update({ summary_text: updatedSummary, reviewed: true })
      .eq("id", selected.id);

    alert(t("alert.summary_reviewed"));
    setSelected(null);
    fetchSubmissions();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">
        {t("header.insurance_submissions_review")}
      </h1>

      <ExportButtons
        data={exportData}
        columns={columns}
        fileName="insurance_submissions"
      />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">{t("header.submissions")}</h2>
          <ul className="space-y-2 max-h-[500px] overflow-y-auto">
            {submissions.map((sub) => (
              <li key={sub.id}>
                <button
                  onClick={() => {
                    setSelected(sub);
                    setUpdatedSummary(sub.summary_text);
                  }}
                  className="text-blue-600 hover:underline"
                >
                  {sub.patients.first_name} {sub.patients.last_name} — {new Date(sub.created_at).toLocaleDateString()} {sub.reviewed ? t("text.reviewed") : t("text.pending_review")}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {selected && (
          <div
            id="review-section"
            className="bg-white p-4 rounded shadow space-y-4"
          >
            <h2 className="font-semibold">{t("header.summary_review")}</h2>
            <p>
              <strong>{t("text.patient")}:</strong> {selected.patients.first_name} {selected.patients.last_name}
            </p>
            <p>
              <strong>{t("text.dentist")}:</strong> {selected.dentists.first_name} {selected.dentists.last_name}
            </p>

            <textarea
              className="w-full border p-2 rounded min-h-[150px]"
              value={updatedSummary}
              onChange={(e) => setUpdatedSummary(e.target.value)}
            />

            <div className="flex gap-2">
              <button
                onClick={saveSummaryUpdate}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                {t("button.mark_reviewed_save")}
              </button>
              <button
                onClick={exportPDF}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                {t("button.export_pdf")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
