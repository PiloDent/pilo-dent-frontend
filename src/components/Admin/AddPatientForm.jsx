import { useState } from "react";
import { supabase } from "@/supabaseClient";
import { useTranslation } from "react-i18next";

export default function AddPatientForm() {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    dob: "",
  });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    const { data, error } = await supabase
      .from("patients")
      .insert([
        {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          dob: form.dob,
          status: "awaiting_form",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(error);
      setStatus(t("status.save_error"));
    } else {
      setStatus(t("status.patient_created"));
      setForm({ first_name: "", last_name: "", dob: "" });
    }

    setLoading(false);
  };

  return (
    <div className="bg-white shadow-md rounded p-6 max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">{t("header.add_patient_minimal")}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder={t("placeholder.first_name")}
          value={form.first_name}
          onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          required
          className="w-full p-3 border rounded"
        />
        <input
          type="text"
          placeholder={t("placeholder.last_name")}
          value={form.last_name}
          onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          required
          className="w-full p-3 border rounded"
        />
        <input
          type="date"
          placeholder={t("placeholder.dob")}
          value={form.dob}
          onChange={(e) => setForm({ ...form, dob: e.target.value })}
          required
          className="w-full p-3 border rounded"
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-3 rounded"
          disabled={loading}
        >
          {loading ? t("button.saving") : t("button.create_patient")}
        </button>
        {status && (
          <p className="mt-2 text-center text-sm text-gray-700">{status}</p>
        )}
      </form>
    </div>
  );
}
