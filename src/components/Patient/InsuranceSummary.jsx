// src/components/Dentist/InsuranceSummary.jsx
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/supabaseClient";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function InsuranceSummary({ patientId, patientName }) {
  const [treatments, setTreatments] = useState([]);
  const [dentist, setDentist] = useState(null);
  const [summaryText, setSummaryText] = useState("");
  const [summaryId, setSummaryId] = useState(null);
  const summaryRef = useRef();

  useEffect(() => {
    if (patientId) fetchData();
  }, [patientId]);

  const fetchData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // load dentist info
    const { data: dentistData } = await supabase
      .from("dentists")
      .select("first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();
    setDentist(dentistData);

    // load treatments
    const { data: th } = await supabase
      .from("treatment_history")
      .select("id, created_at, price, notes, billing_codes(code, description)")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: true });
    setTreatments(th || []);

    // check existing submission
    const { data: existing } = await supabase
      .from("insurance_submissions")
      .select("id, summary_text")
      .eq("patient_id", patientId)
      .eq("dentist_id", user.id)
      .maybeSingle();

    if (existing) {
      setSummaryId(existing.id);
      setSummaryText(existing.summary_text);
    } else {
      await generateSummary(th || []);
    }
  };

  // server-side summary via your proxy
  const generateSummary = async (thData) => {
    const items = thData.map(
      (t) => `${t.billing_codes.code}: ${t.billing_codes.description}`
    );
    const res = await fetch("/functions/insurance-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientName,
        dentistName: `${dentist.first_name} ${dentist.last_name}`,
        items,
      }),
    });
    const { summary } = await res.json();
    setSummaryText(summary);
    await saveSubmissionToDB(summary);
  };

  // upsert to your table
  const saveSubmissionToDB = async (summary) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!patientId || !user) return;

    // insert or update
    if (summaryId) {
      await supabase
        .from("insurance_submissions")
        .update({ summary_text: summary, reviewed: false })
        .eq("id", summaryId);
    } else {
      const { data } = await supabase
        .from("insurance_submissions")
        .insert({
          dentist_id: user.id,
          patient_id: patientId,
          summary_text: summary,
          reviewed: false,
        })
        .single();
      setSummaryId(data.id);
    }
  };

  // download PDF snapshot
  const exportToPDF = async () => {
    const el = summaryRef.current;
    const canvas = await html2canvas(el);
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(img, "PNG", 0, 10, w, h);
    pdf.save(`Insurance_Summary_${patientName}.pdf`);
  };

  return (
    <div className="bg-white border p-4 rounded shadow mt-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">🧾 Insurance Summary</h3>
        <button
          onClick={exportToPDF}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          📄 Export PDF
        </button>
      </div>
      <div ref={summaryRef} className="mt-4 text-sm space-y-3">
        <p>
          <strong>Patient:</strong> {patientName}
        </p>
        {dentist && (
          <p>
            <strong>Dentist:</strong> {dentist.first_name} {dentist.last_name}
          </p>
        )}
        <hr />
        <h4 className="font-semibold">💬 AI-Generated Justification</h4>
        <textarea
          className="w-full border rounded p-2 text-sm"
          rows={5}
          value={summaryText}
          onChange={(e) => setSummaryText(e.target.value)}
        />
        <button
          onClick={() => saveSubmissionToDB(summaryText)}
          className="mt-2 bg-green-600 text-white px-4 py-2 rounded"
        >
          ✅ Save & Send to Admin
        </button>
        <hr className="my-4" />
        {treatments.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">🗂️ Treatments</h4>
            <table className="w-full text-left border-t text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1">Date</th>
                  <th className="px-2 py-1">Code</th>
                  <th className="px-2 py-1">Description</th>
                  <th className="px-2 py-1">Price (€)</th>
                  <th className="px-2 py-1">Notes</th>
                </tr>
              </thead>
              <tbody>
                {treatments.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-2 py-1">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-2 py-1">{t.billing_codes.code}</td>
                    <td className="px-2 py-1">{t.billing_codes.description}</td>
                    <td className="px-2 py-1">{t.price.toFixed(2)}</td>
                    <td className="px-2 py-1">{t.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
