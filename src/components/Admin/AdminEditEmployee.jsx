import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import bcrypt from "bcryptjs";
import { useTranslation } from "react-i18next";

export default function AdminEditEmployee({ prefillId = "", onClose }) {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(prefillId);
  const [weeklyHours, setWeeklyHours] = useState("");
  const [newPin, setNewPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (prefillId) return;
    const fetchEmployees = async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, weekly_hours");
      if (error) {
        console.error(t("error.fetch_employees"), error.message);
      } else {
        setEmployees(data);
      }
    };
    fetchEmployees();
  }, [prefillId, t]);

  useEffect(() => {
    const loadSelected = async () => {
      if (!selectedEmployeeId) return;
      const { data } = await supabase
        .from("employees")
        .select("weekly_hours")
        .eq("id", selectedEmployeeId)
        .single();
      if (data) {
        setWeeklyHours(data.weekly_hours || "");
      }
    };
    loadSelected();
  }, [selectedEmployeeId]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;

    setLoading(true);
    setMessage("");

    try {
      const updateData = {
        weekly_hours: parseInt(weeklyHours),
      };

      if (newPin.trim()) {
        if (newPin.length < 4 || newPin.length > 6) {
          setMessage(t("error.pin_length"));
          setLoading(false);
          return;
        }
        const salt = bcrypt.genSaltSync(10);
        updateData.pin_hash = bcrypt.hashSync(newPin, salt);
      }

      const { error } = await supabase
        .from("employees")
        .update(updateData)
        .eq("id", selectedEmployeeId);

      if (error) throw error;

      setMessage(t("status.employee_updated"));
      setNewPin("");
    } catch (err) {
      console.error(err);
      setMessage(t("error.update_employee_failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-semibold mb-4">{t("header.edit_employee")}</h2>

      <form onSubmit={handleUpdate} className="space-y-4">
        {!prefillId && (
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">{t("placeholder.select_employee")}</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name}
              </option>
            ))}
          </select>
        )}

        <input
          type="number"
          placeholder={t("placeholder.weekly_hours")}
          value={weeklyHours}
          onChange={(e) => setWeeklyHours(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />

        <input
          type="number"
          placeholder={t("placeholder.new_pin")}
          value={newPin}
          onChange={(e) => setNewPin(e.target.value)}
          className="w-full p-2 border rounded"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          {loading ? t("button.updating") : t("button.update_employee")}
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-full text-sm mt-2 text-blue-600 hover:underline"
          >
            {t("button.cancel")}
          </button>
        )}
      </form>

      {message && (
        <p className="mt-4 text-sm text-center text-gray-700">{message}</p>
      )}
    </div>
  );
}