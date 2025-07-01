import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { supabase } from "@/supabaseClient";

export default function AddBlockModal({ onClose, onSaved }) {
  const [start, setStart] = useState(new Date());
  const [end, setEnd] = useState(new Date(Date.now() + 30 * 60000));
  const [reason, setReason] = useState("Break");

  const handleSave = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("blocked_times").insert([
      {
        dentist_id: user.id,
        start: start.toISOString(),
        end_time: end.toISOString(),
        reason,
      },
    ]);

    if (error) {
      alert("Failed to save: " + error.message);
    } else {
      onSaved();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow space-y-4 max-w-md w-full">
        <h2 className="text-lg font-bold">➕ Add Blocked Time</h2>

        <label className="block">
          Start Time:
          <DatePicker
            selected={start}
            onChange={(date) => setStart(date)}
            showTimeSelect
            timeIntervals={15}
            dateFormat="Pp"
            className="border p-2 w-full mt-1"
          />
        </label>

        <label className="block">
          End Time:
          <DatePicker
            selected={end}
            onChange={(date) => setEnd(date)}
            showTimeSelect
            timeIntervals={15}
            dateFormat="Pp"
            className="border p-2 w-full mt-1"
          />
        </label>

        <label className="block">
          Reason:
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="border p-2 w-full mt-1"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
