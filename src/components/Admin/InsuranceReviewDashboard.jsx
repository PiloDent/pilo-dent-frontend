import { useEffect, useState, useRef } from "react";
import { supabase } from "@/supabaseClient";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useTranslation } from "react-i18next";

export default function InsuranceReviewDashboard() {
  const { t } = useTranslation();
  const [summaries, setSummaries] = useState([]);
  const summaryRef = useRef();

  useEffect(() => {
    fetchSummaries();
  }, []);

  const fetchSummaries = async () => {
    const { data } = await supabase
      .from("insurance_summaries")
      .select(
        `
        id, summary, status, reviewed_at,
        patients(id, first_name, last_name),
        dentists(id, first_name, last_name),
        treatment_history(
          id, created_at, price, notes,
          billing_codes(code, description)
        )
      `
      )
      .order("created_at", { ascending: false });

    setSummaries(data || []);
  };

  const updateStatus = async (id, status) => {
    await supabase
      .from("insurance_summaries")
      .update({ status, reviewed_at: new Date() })
      .eq("id", id);
    fetchSummaries();
  };

  const exportPDF = async (element, name) => {
    const canvas = await html2canvas(element);
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(img, "PNG", 0, 10, width, height);
    pdf.save(`Summary_${name}.pdf`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t("header.insurance_review")}</h1>
      {summaries.length === 0 ? (
        <p>{t("message.no_summaries")}</p>
      ) : (
        summaries.map((s) => (
          <div key={s.id} className="border rounded bg-white p-4 shadow mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-semibold text-lg">
                  {s.patients?.first_name} {s.patients?.last_name} — {s.dentists?.first_name} {s.dentists?.last_name}
                </h2>
                <p className="text-sm text-gray-600">
                  {t("text.status")} <span className="font-medium">{s.status}</span>{" "}
                  {s.reviewed_at && (
                    <>• {t("text.reviewed_on")} {new Date(s.reviewed_at).toLocaleDateString()}</>
                  )}
                </p>
              </div>
              <div className="space-x-2">
                <button
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                  onClick={() => updateStatus(s.id, "finalized")}
                >
                  {t("button.finalize")}
                </button>
                <button
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                  onClick={() => updateStatus(s.id, "rejected")}
                >
                  {t("button.reject")}
                </button>
                <button
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                  onClick={() => exportPDF(summaryRef.current, s.patients?.last_name)}
                >
                  {t("button.export_pdf")}
                </button>
              </div>
            </div>

            <div ref={summaryRef} className="mt-4 space-y-2 text-sm">
              <h3 className="font-semibold">{t("header.justification_summary")}</h3>
              <textarea
                className="w-full border p-2 rounded"
                rows={4}
                value={s.summary}
                readOnly
              />

              <h4 className="mt-4 font-semibold">{t("header.treatments")}</h4>
              <table className="w-full border-t text-xs mt-2">
                <thead>
                  <tr>
                    {[
                      "table_header.date",
                      "table_header.code",
                      "table_header.description",
                      "table_header.price_eur",
                      "table_header.notes",
                    ].map((key) => (
                      <th key={key} className="py-1">
                        {t(key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.treatment_history.map((t) => (
                    <tr key={t.id} className="border-t">
                      <td className="py-1">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className="py-1">{t.billing_codes?.code}</td>
                      <td className="py-1">{t.billing_codes?.description}</td>
                      <td className="py-1">€{t.price.toFixed(2)}</td>
                      <td className="py-1">{t.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
