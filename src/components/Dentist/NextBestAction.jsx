import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/components/ui/spinner";
import { functionsUrl, trackEvent } from "@/supabaseClient";

export default function NextBestAction({ patient, treatments, appointments }) {
  const { t, i18n } = useTranslation();
  const [recs, setRecs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const headingRef = useRef(null);

  const fetchRecs = async () => {
    // Validation
    if (!patient || !treatments) {
      setError(t("next_best_action.no_data"));
      return;
    }

    trackEvent("nba_button_clicked", {
      patientId: patient.id,
      language: i18n.language,
    });

    setLoading(true);
    setError(null);
    setRecs(null);

    const payload = {
      language: patient.language || i18n.language,
      patient: {
        id: patient.id,
        age: patient.age,
        no_show_risk: patient.no_show_risk,
        perio_risk_score: patient.perio_risk_score,
        compliance_score: patient.compliance_score,
      },
      treatments,
      appointments,
    };

    const start = performance.now();
    try {
      const res = await fetch(
        `${functionsUrl}/next-best-action`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error("network");
      const data = await res.json();
      if (data.error) throw new Error("ai");

      const duration = Math.round(performance.now() - start);
      trackEvent("nba_api_response", { duration });

      setRecs(data.recommendations || []);
      // focus for accessibility
      setTimeout(() => headingRef.current?.focus(), 0);
    } catch (err) {
      const msg =
        err.message === "network"
          ? t("next_best_action.error_network")
          : err.message === "ai"
          ? t("next_best_action.error_ai")
          : t("next_best_action.error");
      setError(msg);
      trackEvent("nba_error", { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-3">
        {t("next_best_action.title")}
      </h3>

      {!recs && !loading && (
        <button
          onClick={fetchRecs}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          {t("next_best_action.explain_button")}
        </button>
      )}

      {loading && (
        <div className="flex items-center space-x-2 mt-2" aria-live="polite">
          <Spinner />
          <span>{t("next_best_action.loading")}</span>
        </div>
      )}

      {error && (
        <p className="text-red-500 mt-2" aria-live="polite">
          {error}
        </p>
      )}

      {recs && recs.length > 0 && (
        <div
          className="mt-4 space-y-3 transition-opacity duration-300 opacity-100"
          aria-live="polite"
        >
          <h4
            id="nba-heading"
            tabIndex={-1}
            ref={headingRef}
            className="font-semibold"
          >
            {t("next_best_action.recommendations")}
          </h4>
          {recs.map((r, i) => (
            <details key={i} className="border rounded p-2">
              <summary className="cursor-pointer">
                {r.action} ({t(`urgency.${r.urgency}`)})
              </summary>
              <p className="mt-1 ml-4">{r.reason}</p>
            </details>
          ))}

          {/* Optional: link to deeper docs */}
          {false && (
            <a
              href={`/docs/next-best-action`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline mt-2 block"
            >
              {t("next_best_action.learn_more")}
            </a>
          )}
        </div>
      )}

      {recs && recs.length === 0 && !error && (
        <p className="mt-2 text-gray-600">{t("next_best_action.no_data")}</p>
      )}
    </div>
  );
}
