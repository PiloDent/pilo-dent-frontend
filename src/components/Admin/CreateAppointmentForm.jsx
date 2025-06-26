cat > src/components/Admin/CreateAppointmentForm.jsx << 'EOF'
import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import DatePickerComponent from "../common/DatePickerComponent";
import { formatISO } from "date-fns";

export default function CreateAppointmentForm({ onAppointmentAdded }) {
  // lookups
  const [patients, setPatients] = useState([]);
  const [dentists, setDentists] = useState([]);

  // date & slots
  const [selectedDate, setSelectedDate] = useState(null);
  const [disabledRanges, setDisabledRanges] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");

  // form payload
  const [form, setForm] = useState({
    patient_id: "",
    dentist_id: "",
    duration_minutes: 30,
    notes: "",
  });

  // fetch patients & dentists
  useEffect(() => {
    (async () => {
      let { data: p } = await supabase.from("patients").select("id,first_name,last_name");
      let { data: d } = await supabase.from("profiles").select("id,role").eq("role","dentist");
      setPatients(p||[]);
      setDentists(d||[]);
    })();
  }, []);

  // fetch blocked date ranges
  useEffect(() => {
    (async () => {
      let { data } = await supabase
        .from("appointment_block_ranges")
        .select("from_date,to_date");
      setDisabledRanges(
        (data||[]).map(r=>({ from:new Date(r.from_date), to:new Date(r.to_date) }))
      );
    })();
  }, []);

  // when date changes fetch slots
  useEffect(() => {
    setSelectedTime("");
    setAvailableSlots([]);
    if (!selectedDate) return;
    (async () => {
      const isoDate = formatISO(selectedDate,{representation:"date"});
      let { data: slots } = await supabase
        .rpc("get_available_slots",{ p_date: isoDate });
      setAvailableSlots(slots||[]);
    })();
  }, [selectedDate]);

  const handleChange = e =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      return alert("Please pick a date and time slot.");
    }
    const scheduled_time = `${formatISO(selectedDate)}T${selectedTime}`;
    let { error } = await supabase
      .from("appointments")
      .insert([{ ...form, scheduled_time }]);
    if (error) alert("Error: "+error.message);
    else {
      alert("Appointment created!");
      onAppointmentAdded?.();
      setForm({ patient_id:"", dentist_id:"", duration_minutes:30, notes:"" });
      setSelectedDate(null);
      setSelectedTime("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded shadow mt-10">
      <h2 className="text-xl font-semibold">Create Appointment</h2>

      {/* Patient / Dentist */}
      <select name="patient_id" value={form.patient_id} onChange={handleChange} className="w-full border p-2" required>
        <option value="">Select Patient</option>
        {patients.map(p=>(
          <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
        ))}
      </select>
      <select name="dentist_id" value={form.dentist_id} onChange={handleChange} className="w-full border p-2" required>
        <option value="">Select Dentist</option>
        {dentists.map(d=>(
          <option key={d.id} value={d.id}>{d.id}</option>
        ))}
      </select>

      {/* Date Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
        <DatePickerComponent
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          disabledDates={disabledRanges}
        />
      </div>

      {/* Time Slots */}
      {availableSlots.length>0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Available Times</label>
          <div className="grid grid-cols-3 gap-2">
            {availableSlots.map(slot => {
              const time = slot.slot_time;
              const isSelected = selectedTime===time;
              return (
                <button
                  key={time}
                  type="button"
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

      {/* Duration & Notes */}
      <input
        type="number"
        name="duration_minutes"
        value={form.duration_minutes}
        onChange={handleChange}
        className="w-full border p-2"
        placeholder="Duration (minutes)"
        required
      />
      <textarea
        name="notes"
        value={form.notes}
        onChange={handleChange}
        className="w-full border p-2"
        placeholder="Notes (optional)"
      />

      <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">
        Create Appointment
      </button>
    </form>
  );
}
EOF

