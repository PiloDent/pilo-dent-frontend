import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function AddBlockModal({ onClose, onSaved }) {
  const { t } = useTranslation();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!start || !end || !reason) {
      setError(t("error.fill_all_fields"));
      setLoading(false);
      return;
    }

    if (new Date(end) <= new Date(start)) {
      setError(t("error.end_after_start"));
      setLoading(false);
      return;
    }

    try {
      // Call your API or supabase to insert the block
      // Example:
      // await supabase.from("blocked_times").insert({ start, end_time: end, reason });

      // Simulate async success:
      setTimeout(() => {
        setLoading(false);
        onSaved();
        onClose();
      }, 500);
    } catch (err) {
      setError(t("error.failed_save_block", { message: err.message }));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow max-w-md w-full"
      >
        <h3 className="text-xl font-bold mb-4">{t("header.add_blocked_time")}</h3>

        {error && <p className="text-red-600 mb-2">{error}</p>}

        <label className="block mb-2">
          {t("label.start_datetime")}
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full border rounded px-3 py-2 mt-1"
            required
          />
        </label>

        <label className="block mb-2">
          {t("label.end_datetime")}
          <input
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full border rounded px-3 py-2 mt-1"
            required
          />
        </label>

        <label className="block mb-4">
          {t("label.reason")}
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border rounded px-3 py-2 mt-1"
            placeholder={t("placeholder.reason")}
            required
          />
        </label>

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
            disabled={loading}
          >
            {t("button.cancel")}
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? t("button.saving") : t("button.save_block")}
          </button>
        </div>
      </form>
    </div>
  );
}
