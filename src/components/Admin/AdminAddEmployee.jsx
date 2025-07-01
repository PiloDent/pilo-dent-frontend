import { useState } from "react";
import { supabase } from "@/supabaseClient";
import bcrypt from "bcryptjs";
import { useTranslation } from "react-i18next";

export default function AdminAddEmployee() {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("assistant");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [weeklyHours, setWeeklyHours] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pin.length < 4 || pin.length > 6) {
      setMessage(t("error.pin_length"));
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // Hash the PIN using bcrypt
      const salt = bcrypt.genSaltSync(10);
      const pinHash = bcrypt.hashSync(pin, salt);

      const { error } = await supabase.from("employees").insert([
        {
          full_name: fullName,
          role,
          email,
          pin_hash: pinHash,
          weekly_hours: parseInt(weeklyHours),
        },
      ]);

      if (error) throw error;

      setMessage(t("status.employee_added"));
      setFullName("");
      setRole("assistant");
      setEmail("");
      setPin("");
      setWeeklyHours("");
    } catch (err) {
      console.error(err);
      setMessage(t("error.employee_add_failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-semibold mb-4">{t("header.add_new_employee")}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder={t("placeholder.full_name")}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="assistant">{t("option.assistant")}</option>
          <option value="dentist">{t("option.dentist")}</option>
          <option value="admin">{t("option.admin")}</option>
        </select>

        <input
          type="email"
          placeholder={t("placeholder.email_optional")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
        />

        <input
          type="number"
          placeholder={t("placeholder.pin")}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />

        <input
          type="number"
          placeholder={t("placeholder.weekly_hours")}
          value={weeklyHours}
          onChange={(e) => setWeeklyHours(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          {loading ? t("button.saving") : t("button.add_employee")}
        </button>
      </form>

      {message && (
        <p className="mt-4 text-sm text-center text-gray-700">{message}</p>
      )}
    </div>
  );
}