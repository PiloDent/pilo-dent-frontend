import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function PatientHistory({ patientId, patientName }) {
  const [treatments, setTreatments] = useState([]);
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    if (patientId) {
      fetchTreatments();
      fetchNotes();

      const subscription = supabase
        .channel("realtime-treatments")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "treatment_history",
            filter: `patient_id=eq.${patientId}`,
          },
          fetchTreatments
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notes",
            filter: `patient_id=eq.${patientId}`,
          },
          fetchNotes
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [patientId]);

  const fetchTreatments = async () => {
    const { data, error } = await supabase
      .from("treatment_history")
      .select(
        "id, treatment_date, billing_codes(code, description, cost), dentists(name)"
      )
      .eq("patient_id", patientId)
      .order("treatment_date", { ascending: false });

    if (error) {
      console.error("Failed to fetch treatment history:", error);
    } else {
      setTreatments(data);
    }
  };

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from("notes")
      .select("note_text, created_at, dentists(name)")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch notes:", error);
    } else {
      setNotes(data);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();

    doc.text(`Patient Record: ${patientName}`, 14, 16);

    doc.autoTable({
      startY: 22,
      head: [["Date", "Code", "Description", "Cost (€)", "Dentist"]],
      body: treatments.map((t) => [
        new Date(t.treatment_date).toLocaleDateString(),
        t.billing_codes?.code || "",
        t.billing_codes?.description || "",
        (t.billing_codes?.cost || 0).toFixed(2),
        t.dentists?.name || "",
      ]),
    });

    if (notes.length > 0) {
      doc.text("Notes", 14, doc.lastAutoTable.finalY + 10);
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 14,
        head: [["Date", "Dentist", "Note"]],
        body: notes.map((n) => [
          new Date(n.created_at).toLocaleDateString(),
          n.dentists?.name || "",
          n.note_text,
        ]),
      });
    }

    doc.save(`${patientName}_records.pdf`);
  };

  const exportCSV = () => {
    let csv = `Treatment History for ${patientName}\nDate,Code,Description,Cost,Dentist\n`;
    treatments.forEach((t) => {
      csv += `${new Date(t.treatment_date).toLocaleDateString()},${
        t.billing_codes?.code || ""
      },${t.billing_codes?.description || ""},${(
        t.billing_codes?.cost || 0
      ).toFixed(2)},${t.dentists?.name || ""}\n`;
    });

    csv += `\nNotes\nDate,Dentist,Note\n`;
    notes.forEach((n) => {
      csv += `${new Date(n.created_at).toLocaleDateString()},${
        n.dentists?.name || ""
      },${n.note_text}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${patientName}_records.csv`;
    link.click();
  };

  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-lg font-semibold">📁 Treatment History</h3>

      <div className="flex gap-2 mb-2">
        <button
          onClick={exportCSV}
          className="bg-gray-700 text-white px-4 py-2 rounded text-sm"
        >
          📥 Export CSV
        </button>
        <button
          onClick={exportPDF}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
        >
          📄 Export PDF
        </button>
      </div>

      <table className="w-full table-auto border-collapse bg-white">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1 text-left">Date</th>
            <th className="border px-2 py-1 text-left">Code</th>
            <th className="border px-2 py-1 text-left">Description</th>
            <th className="border px-2 py-1 text-left">Cost (€)</th>
            <th className="border px-2 py-1 text-left">Dentist</th>
          </tr>
        </thead>
        <tbody>
          {treatments.map((t) => (
            <tr key={t.id}>
              <td className="border px-2 py-1">
                {new Date(t.treatment_date).toLocaleDateString()}
              </td>
              <td className="border px-2 py-1">{t.billing_codes?.code}</td>
              <td className="border px-2 py-1">
                {t.billing_codes?.description}
              </td>
              <td className="border px-2 py-1">
                {(t.billing_codes?.cost || 0).toFixed(2)}
              </td>
              <td className="border px-2 py-1">{t.dentists?.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
