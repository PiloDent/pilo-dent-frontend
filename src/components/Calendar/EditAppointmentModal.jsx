import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { supabase } from "@/supabaseClient";

export default function EditAppointmentModal({
  appointment,
  onClose,
  onUpdate,
}) {
  const [start, setStart] = useState(new Date(appointment.start));
  const [duration, setDuration] = useState(
    (appointment.end - appointment.start) / (1000 * 60)
  );
  const [notes, setNotes] = useState(appointment.notes || "");

  const handleSave = async () => {
    const newEnd = new Date(start.getTime() + duration * 60000);

    const { error } = await supabase
      .from("appointments")
      .update({
        scheduled_time: start.toISOString(),
        duration_minutes: duration,
        notes,
      })
      .eq("id", appointment.id);

    if (error) {
      alert("Update failed: " + error.message);
      return;
    }

    onUpdate(); // refresh calendar
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow max-w-md w-full space-y-4">
        <h2 className="text-xl font-bold">Edit Appointment</h2>

        <label className="block">
          Start Time:
          <DatePicker
            selected={start}
            onChange={setStart}
            showTimeSelect
            timeIntervals={15}
            dateFormat="Pp"
            className="border p-2 w-full mt-1"
          />
        </label>

        <label className="block">
          Duration (minutes):
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="border p-2 w-full mt-1"
            min={15}
            step={15}
          />
        </label>

        <label className="block">
          Notes:
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="border p-2 w-full mt-1"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
