import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useTranslation } from "react-i18next";

export default function ClaimsManager() {
  const { t } = useTranslation();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchClaims = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("insurance_claims")
      .select(
        `
        id,
        patient_id,
        appointment_id,
        submitted_at,
        status,
        error_message,
        claim_justifications ( justification )
      `)
      .order("submitted_at", { ascending: false });
    if (error) {
      console.error(t("error.fetch_claims"), error);
    } else {
      setClaims(data);
    }
    setLoading(false);
  };

  const invokeSubmitClaims = async () => {
    setLoading(true);
    try {
      await fetch("/functions/submit-claims", { method: "POST" });
      setTimeout(fetchClaims, 1000);
    } catch (err) {
      console.error(t("error.invoke_submit"), err);
    } finally {
      setLoading(false);
    }
  };

  const retryClaim = async (id) => {
    setLoading(true);
    const { error } = await supabase
      .from("insurance_claims")
      .update({ status: "pending", error_message: null })
      .eq("id", id);
    if (error) console.error(t("error.retry_claim"), error);
    await invokeSubmitClaims();
  };

  const generateJustification = async (claimId) => {
    setLoading(true);
    try {
      const resp = await fetch("/functions/ai-claim-justifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
      });
      const { justification } = await resp.json();
      setClaims((prev) =>
        prev.map((c) =>
          c.id === claimId
            ? { ...c, claim_justifications: [{ justification }] }
            : c
        )
      );
    } catch (err) {
      console.error(t("error.generate_justification"), err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto bg-white rounded shadow space-y-4">
      <h1 className="text-2xl font-bold">{t("header.claims_manager")}</h1>

      <button
        onClick={invokeSubmitClaims}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? t("text.submitting") : t("button.retry_all")}      
      </button>

      {loading && <p>{t("message.loading")}</p>}

      <table className="min-w-full bg-white border mt-4">
        <thead className="bg-gray-100">
          <tr>
            {[
              "claim_id",
              "patient_id",
              "appointment_id",
              "submitted",
              "status",
              "error",
              "justification",
              "actions",
            ].map((key) => (
              <th key={key} className="px-4 py-2 border text-left">
                {t(`table_header.${key}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {claims.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 border text-sm truncate max-w-xs">
                {c.id}
              </td>
              <td className="px-4 py-2 border text-sm">{c.patient_id}</td>
              <td className="px-4 py-2 border text-sm">{c.appointment_id}</td>
              <td className="px-4 py-2 border text-sm">
                {new Date(c.submitted_at).toLocaleString()}
              </td>
              <td className="px-4 py-2 border text-sm">{c.status}</td>
              <td className="px-4 py-2 border text-sm text-red-600">
                {c.error_message || t("text.na")}
              </td>
              <td className="px-4 py-2 border text-sm">
                {c.claim_justifications?.[0]?.justification ? (
                  <p className="whitespace-pre-wrap">
                    {c.claim_justifications[0].justification}
                  </p>
                ) : (
                  <span className="text-gray-400">{t("text.na")}</span>
                )}
              </td>
              <td className="px-4 py-2 border space-x-2">
                {(c.status === "failed" || c.status === "rejected") && (
                  <button
                    onClick={() => retryClaim(c.id)}
                    disabled={loading}
                    className="bg-yellow-500 text-white px-2 py-1 rounded text-sm"
                  >
                    {t("button.retry")}
                  </button>
                )}
                <button
                  onClick={() => generateJustification(c.id)}
                  disabled={loading}
                  className="bg-indigo-600 text-white px-2 py-1 rounded text-sm"
                >
                  {t("button.generate_justification")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
