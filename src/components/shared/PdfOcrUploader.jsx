// src/components/PdfOcrUploader.jsx
import { useState } from "react";

export default function PdfOcrUploader() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
    setError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please choose a PDF first");
      return;
    }

    setLoading(true);
    setError("");
    const form = new FormData();
    form.append("file", file);

    try {
      const resp = await fetch("/api/ocr", {
        method: "POST",
        body: form,
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "OCR failed");
      setResult(json.parsed);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow max-w-lg">
      <h2 className="text-xl font-semibold mb-2">OCR: Parse Intake PDF</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={onFileChange}
          className="block"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Parsing…" : "Upload & Parse"}
        </button>
      </form>
      {error && <p className="mt-2 text-red-600">{error}</p>}
      {result && (
        <div className="mt-4">
          <h3 className="font-medium mb-1">Parsed Fields:</h3>
          <pre className="bg-gray-100 p-2 rounded overflow-auto text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
