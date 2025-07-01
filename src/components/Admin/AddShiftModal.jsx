import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { supabase } from "@/supabaseClient";
import { useTranslation } from "react-i18next";

export default function AddShiftModal({ onClose, onSaved }) {
  const { t } = useTranslation();
  const [role, setRole] = useState("dentist");
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [shiftDate, setShiftDate] = useState(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  // Fetch users of selected role whenever role changes
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("role", role);
      if (!error) setUsers(data);
    };
    fetchUsers();
  }, [role]);

  const handleSave = async () => {
    if (!selectedUserId) {
      alert(t("error.select_user"));
      return;
    }
    const payload = {
      user_id: selectedUserId,
      role,
      shift_date: shiftDate.toISOString().split("T")[0], // YYYY-MM-DD
      start_time: startTime,
      end_time: endTime,
    };
    const { error } = await supabase.from("shifts").insert([payload]);
    if (error) {
      alert(t("error.failed_save_shift", { message: error.message }));
    } else {
      onSaved();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow max-w-md w-full space-y-4">
        <h2 className="text-lg font-bold">{t("header.add_shift")}</h2>

        {/* Role Selector */}
        <label className="block">
          {t("label.role")}:
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border p-2 mt-1"
          >
            <option value="dentist">{t("option.dentist")}</option>
            <option value="assistant">{t("option.assistant")}</option>
          </select>
        </label>

        {/* User Selector */}
        <label className="block">
          {role === "dentist" ? t("label.dentist") : t("label.assistant")}:
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full border p-2 mt-1"
          >
            <option value="">{role === "dentist" ? t("placeholder.select_dentist") : t("placeholder.select_assistant")}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>

        {/* Date Picker */}
        <label className="block">
          {t("label.shift_date")}:
          <DatePicker
            selected={shiftDate}
            onChange={(date) => setShiftDate(date)}
            dateFormat="yyyy-MM-dd"
            className="w-full border p-2 mt-1"
          />
        </label>

        {/* Time Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            {t("label.start_time")}:
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full border p-2 mt-1"
              required
            />
          </label>
          <label className="block">
            {t("label.end_time")}:
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full border p-2 mt-1"
              required
            />
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded">
            {t("button.cancel")}
          </button>
          <button
            onClick={handleSave}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            {t("button.save_shift")}
          </button>
        </div>
      </div>
    </div>
  );
}