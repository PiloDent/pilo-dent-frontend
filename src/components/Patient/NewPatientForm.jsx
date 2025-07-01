// src/components/Patient/NewPatientForm.jsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/supabaseClient";
import LanguageSwitcher from "../LanguageSwitcher.jsx";

const PUBLIC_INSURERS = [
  "AOK",
  "Techniker Krankenkasse",
  "Barmer",
  "DAK-Gesundheit",
  "SBK",
  "IKK classic",
  "KKH",
  "BKK",
];
const PRIVATE_INSURERS = [
  "Debeka",
  "HUK-COBURG",
  "Signal Iduna",
  "Allianz",
  "AXA",
  "R+V",
];

export default function NewPatientForm({ onSuccess }) {
  const { t } = useTranslation();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    gender: "",
    address: "",
    phone: "",
    email: "",
    insurerType: "public",
    insurer: "",
    insuranceNumber: "",
    allergies: "",
    medications: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    if (!form.insurer) {
      setErrorMsg(t("new_patient.select_insurer"));
      setLoading(false);
      return;
    }

    try {
      const { data, error: insertErr } = await supabase
        .from("patients")
        .insert([
          {
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
            dob: form.dob,
            gender: form.gender,
            address: form.address.trim(),
            phone: form.phone.trim(),
            email: form.email.trim() || null,
            insurer_type: form.insurerType,
            insurance_provider: form.insurer,
            insurance_number: form.insuranceNumber.trim(),
            allergies: form.allergies.trim() || null,
            medications: form.medications.trim() || null,
            status: "awaiting_form",
          },
        ])
        .select()
        .single();

      if (insertErr) throw insertErr;

      onSuccess?.();
    } catch (err) {
      console.error(err);
      setErrorMsg(t("new_patient.submit_error"));
    } finally {
      setLoading(false);
    }
  };

  const insurerList =
    form.insurerType === "public" ? PUBLIC_INSURERS : PRIVATE_INSURERS;

  return (
    <div>
      {/* Only patient-facing */}
      <LanguageSwitcher />

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
        <h3 className="text-xl font-semibold mb-4">
          {t("new_patient.title")}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder={t("new_patient.first_name")}
            value={form.firstName}
            onChange={handleChange("firstName")}
            required
            className="p-3 border rounded"
          />
          <input
            type="text"
            placeholder={t("new_patient.last_name")}
            value={form.lastName}
            onChange={handleChange("lastName")}
            required
            className="p-3 border rounded"
          />
          <input
            type="date"
            placeholder={t("new_patient.dob")}
            value={form.dob}
            onChange={handleChange("dob")}
            required
            className="p-3 border rounded"
          />
          <select
            value={form.gender}
            onChange={handleChange("gender")}
            required
            className="p-3 border rounded"
          >
            <option value="">{t("new_patient.gender_placeholder")}</option>
            <option value="male">{t("new_patient.gender_male")}</option>
            <option value="female">{t("new_patient.gender_female")}</option>
            <option value="diverse">{t("new_patient.gender_diverse")}</option>
          </select>
          <input
            type="text"
            placeholder={t("new_patient.address")}
            value={form.address}
            onChange={handleChange("address")}
            required
            className="p-3 border rounded col-span-full"
          />
          <input
            type="tel"
            placeholder={t("new_patient.phone")}
            value={form.phone}
            onChange={handleChange("phone")}
            required
            className="p-3 border rounded"
          />
          <input
            type="email"
            placeholder={t("new_patient.email_optional")}
            value={form.email}
            onChange={handleChange("email")}
            className="p-3 border rounded"
          />
        </div>

        <div className="space-y-2">
          <label className="block">{t("new_patient.insurer_type")}</label>
          <select
            value={form.insurerType}
            onChange={handleChange("insurerType")}
            className="p-3 border rounded w-full md:w-1/2"
          >
            <option value="public">{t("new_patient.public")}</option>
            <option value="private">{t("new_patient.private")}</option>
          </select>

          <label className="block mt-2">{t("new_patient.insurer")}</label>
          <select
            value={form.insurer}
            onChange={handleChange("insurer")}
            required
            className="p-3 border rounded w-full md:w-1/2"
          >
            <option value="">{t("new_patient.choose_insurer")}</option>
            {insurerList.map((ins) => (
              <option key={ins} value={ins}>
                {ins}
              </option>
            ))}
          </select>

          <label className="block mt-2">{t("new_patient.insurance_number")}</label>
          <input
            type="text"
            placeholder={t("new_patient.insurance_number")}
            value={form.insuranceNumber}
            onChange={handleChange("insuranceNumber")}
            required
            className="p-3 border rounded w-full md:w-1/2"
          />

          <label className="block mt-4">{t("new_patient.allergies")}</label>
          <input
            type="text"
            placeholder={t("new_patient.allergies")}
            value={form.allergies}
            onChange={handleChange("allergies")}
            className="p-3 border rounded w-full"
          />

          <label className="block mt-2">{t("new_patient.medications")}</label>
          <input
            type="text"
            placeholder={t("new_patient.medications")}
            value={form.medications}
            onChange={handleChange("medications")}
            className="p-3 border rounded w-full"
          />
        </div>

        {errorMsg && <p className="text-red-600">{errorMsg}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white p-3 rounded text-lg mt-4"
        >
          {loading
            ? t("new_patient.registering")
            : t("new_patient.register")}
        </button>
      </form>
    </div>
  );
}
