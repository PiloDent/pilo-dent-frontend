// src/components/Shared/ExportButtons.jsx
import { jsPDF } from "jspdf";
import "jspdf-autotable";
// import straight from the ESM entry in node_modules/xlsx
import * as XLSX from "xlsx";

export default function ExportButtons({ data, columns, fileName }) {
  // CSV
  const exportCSV = () => {
    const header = columns.map((c) => c.header);
    const rows = data.map((row) => columns.map((c) => row[c.accessor]));
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.csv`;
    link.click();
  };

  // XLSX
  const exportExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      columns.map((c) => c.header),
      ...data.map((row) => columns.map((c) => row[c.accessor])),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  // PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(fileName.replace(/_/g, " "), 14, 16);
    doc.autoTable({
      startY: 22,
      head: [columns.map((c) => c.header)],
      body: data.map((row) => columns.map((c) => row[c.accessor])),
    });
    doc.save(`${fileName}.pdf`);
  };

  return (
    <div className="flex gap-2 mb-4">
      <button onClick={exportCSV} className="btn-sm">
        📥 CSV
      </button>
      <button onClick={exportExcel} className="btn-sm">
        📊 XLSX
      </button>
      <button onClick={exportPDF} className="btn-sm">
        📄 PDF
      </button>
    </div>
  );
}
