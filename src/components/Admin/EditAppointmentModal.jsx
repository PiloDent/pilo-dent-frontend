cat > src/components/Admin/EditAppointmentModal.jsx << 'EOF'
import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import DatePickerComponent from "../common/DatePickerComponent";
import { formatISO, parseISO } from "date-fns";

export default function EditAppointmentModal({ appointment, onClose, onUpdate }) {
  // existing date + time
  const initialDate = appointment?.scheduled_time ? parseISO(appointment.scheduled_time) : null;
  const initialTime = appointment?.scheduled_time
    ? formatISO(parseISO(appointment.scheduled_time), { representation: "time" })
    : "";

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedTime, setSelectedTime] = useState(initialTime);
  const [disabledRanges, setDisabledRanges] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [notes, setNotes] = useState(appointment?.notes||"");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // load blocked dates
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("appointment_block_ranges")
        .select("from_date,to_date");
      setDisabledRanges((data||[]).map(r=>({
        from:new Date(r.from_date), to:new Date(r.to_date)
      })));
    })();
  }, []);

  // load slots when date changes
  useEffect(() => {
    setAvailableSlots([]);
    if (!selectedDate) return;
    (async () => {
      const isoDate = formatISO(selectedDate,{ representation: "date" });
      const { data: slots } = await supabase.rpc("get_available_slots",{ p_date:isoDate });
      setAvailableSlots(slots||[]);
    })();
  }, [selectedDate]);

  const handleSave = async () => {
    if (!selectedDate || !selectedTime) {
      return setError("Please pick a date and time.");
    }
    setError("");
    setLoading(true);
    const scheduled_time = `${formatISO(selectedDate)}T${selectedTime}`;
    const { error: upd } = await supabase
      .from("appointments")
      .update({ scheduled_time, notes })
      .eq("id", appointment.id);
    setLoading(false);
    if (upd) setError("Update failed: "+upd.message);
    else {
      onUpdate();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">Edit Appointment</h3>
        {error && <p className="text-red-600 mb-2">{error}</p>}

        {/* Date */}
        <label className="block mb-2 font-medium text-gray-700">
          Date
          <DatePickerComponent
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            disabledDates={disabledRanges}
          />
        </label>

        {/* Time */}
        {availableSlots.length>0 && (
          <div className="mb-4">
            <p className="font-medium text-gray-700 mb-1">Time</p>
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.map(slot => {
                const time = slot.slot_time;
                const isSelected = selectedTime===time;
                return (
                  <button
                    key={time} type="button"
                    onClick={()=>setSelectedTime(time)}
                    className={`py-2 px-3 border rounded ${
                      isSelected ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        <label className="block mb-4">
          <span className="font-medium text-gray-700">Notes</span>
          <textarea
            value={notes}
            onChange={e=>setNotes(e.target.value)}
            className="w-full border rounded px-3 py-2 mt-1"
            rows={4}
          />
        </label>

        {/* Actions */}
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
   );
}
EOF

