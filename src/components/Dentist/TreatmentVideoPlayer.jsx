import { useState } from "react";
import { treatmentVideos } from "../../data/treatmentVideos";

const languages = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "tr", label: "Türkçe" },
  { code: "pl", label: "Polski" },
  { code: "ar", label: "العربية" },
];

export default function TreatmentVideoPlayer() {
  const [selectedTreatment, setSelectedTreatment] = useState("filling");
  const [selectedLang, setSelectedLang] = useState("de");

  const video = treatmentVideos.find((v) => v.key === selectedTreatment)
    ?.videos[selectedLang];

  return (
    <div className="mt-10 space-y-4 max-w-xl mx-auto border rounded p-6 shadow">
      <h2 className="text-xl font-bold">🎬 Explain Treatment to Patient</h2>

      <div className="flex gap-4">
        <select
          value={selectedTreatment}
          onChange={(e) => setSelectedTreatment(e.target.value)}
          className="w-1/2 border p-2"
        >
          {treatmentVideos.map((t) => (
            <option key={t.key} value={t.key}>
              {t.title}
            </option>
          ))}
        </select>

        <select
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value)}
          className="w-1/2 border p-2"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      {video ? (
        <div className="aspect-video mt-4">
          <iframe
            src={video}
            title="Treatment Explanation Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full rounded"
          />
        </div>
      ) : (
        <p className="text-sm text-red-500">
          No video available for this combination.
        </p>
      )}
    </div>
  );
}
