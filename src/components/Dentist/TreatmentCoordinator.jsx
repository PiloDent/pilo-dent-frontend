// src/components/Dentist/TreatmentCoordinator.jsx
import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/components/ui/spinner";
import { functionsUrl, trackEvent } from "@/supabaseClient";

export default function TreatmentCoordinator({ patient, treatmentCode }) {
  const { t, i18n } = useTranslation();
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const summaryRef = useRef(null);

  const fetchExplanation = async () => {
    if (!treatmentCode) {
      setError(t("treatment_coordinator.no_code"));
      return;
    }

    trackEvent("tc_button_clicked", {
      treatmentCode,
      language: i18n.language,
    });

    setLoading(true);
    setError(null);
    setResponse(null);

    const start = performance.now();
    try {
      const res = await fetch(`${functionsUrl}/treatment-coordinator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: patient.language || i18n.language,
          treatmentCode,
          patientInfo: {
            age: patient.age,
            anxietyLevel: patient.anxiety_level || null,
            insurance: patient.insurance || null,
          },
        }),
      });
      if (!res.ok) throw new Error("network");
      const data = await res.json();
      if (data.error) throw new Error("ai");

      const duration = Math.round(performance.now() - start);
      trackEvent("tc_api_response", { treatmentCode, duration });

      setResponse(data);
      setTimeout(() => summaryRef.current?.focus(), 0);
    } catch (err) {
      const msg =
        err.message === "network"
          ? t("treatment_coordinator.error_network")
          : err.message === "ai"
          ? t("treatment_coordinator.error_ai")
          : t("treatment_coordinator.error");
      setError(msg);
      trackEvent("tc_error", {
        treatmentCode,
        error: err.message,
        language: i18n.language,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!treatmentCode) {
    return (
      <div
        className="p-4 bg-yellow-100 rounded-2xl shadow-md max-w-2xl mx-auto"
        aria-live="polite"
      >
        <p className="text-yellow-800">{t("treatment_coordinator.no_code")}</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-2xl shadow-md max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">
        {t("treatment_coordinator.title")}
      </h2>

      {!response && !loading && (
        <button
          onClick={fetchExplanation}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {t("treatment_coordinator.explain_button")}
        </button>
      )}

      {loading && (
        <div className="flex items-center space-x-2" aria-live="polite">
          <Spinner />
          <span>{t("treatment_coordinator.loading")}</span>
        </div>
      )}

      {error && (
        <p className="text-red-500" aria-live="polite">
          {error}
        </p>
      )}

      {response && (
        <div
          className="space-y-4 mt-4 transition-opacity duration-300 opacity-100"
          aria-live="polite"
        >
          <div>
            <strong
              id="tc-summary"
              tabIndex={-1}
              ref={summaryRef}
            >
              {t("treatment_coordinator.summary")}
            </strong>
            <p>{response.summary}</p>
          </div>

          <details className="border rounded p-2">
            <summary className="cursor-pointer">
              {t("treatment_coordinator.risks")}
            </summary>
            <p className="mt-1 ml-4">{response.risks}</p>
          </details>

          <details className="border rounded p-2">
            <summary className="cursor-pointer">
              {t("treatment_coordinator.recovery")}
            </summary>
            <p className="mt-1 ml-4">{response.recovery}</p>
          </details>

          <details className="border rounded p-2">
            <summary className="cursor-pointer">
              {t("treatment_coordinator.faq")}
            </summary>
            <ul className="list-disc list-inside mt-1 ml-4">
              {response.faq?.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </details>

          <details className="border rounded p-2">
            <summary className="cursor-pointer">
              {t("treatment_coordinator.next_steps")}
            </summary>
            <p className="mt-1 ml-4">{response.next_steps}</p>
          </details>
        </div>
      )}
    </div>
  );
}
