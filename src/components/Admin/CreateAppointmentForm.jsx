import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import DatePickerComponent from "../common/DatePickerComponent";
import { formatISO } from "date-fns";
import { useTranslation } from "react-i18next";

export default function CreateAppointmentForm({ onAppointmentAdded }) {
  const { t } = useTranslation();
  const [patients, setPatients] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [disabledRanges, setDisabledRanges] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [form, setForm] = useState({
    patient_id: "",
    dentist_id: "",
    duration_minutes: 30,
    notes: "",
  });

  useEffect(() => {
    (async () => {
      let { data: p } = await supabase.from("patients").select("id, first_name, last_name");
      let { data: d } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("role", "dentist");
      setPatients(p ?? []);
      setDentists(d ?? []);
    })();

    (async () => {
      let { data } = await supabase
        .from("appointment_block_ranges")
        .select("from_date, to_date");
      if (data) {
        setDisabledRanges(
          data.map((r) => ({ from: new Date(r.from_date), to: new Date(r.to_date) }))
        );
      }
    })();
  }, []);

  useEffect(() => {
    setSelectedTime("");
    setAvailableSlots([]);
    if (!selectedDate) return;

    (async () => {
      const isoDate = formatISO(selectedDate, { representation: "date" });
      const { data: slots, error } = await supabase.rpc("get_available_slots", { p_date: isoDate });
      if (!error && slots) setAvailableSlots(slots);
    })();
  }, [selectedDate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      return alert(t("alert.pick_date_time"));
    }

    const scheduled_time = `${formatISO(selectedDate)}T${selectedTime}`;
    const { error } = await supabase.from("appointments").insert([
      { ...form, scheduled_time },
    ]);

    if (error) alert(t("error.create_appointment", { message: error.message }));
    else {
      alert(t("alert.appointment_created"));
      onAppointmentAdded?.();
      setForm({ patient_id: "", dentist_id: "", duration_minutes: 30, notes: "" });
      setSelectedDate(null);
      setSelectedTime("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded shadow mt-10">
      <h2 className="text-xl font-semibold">{t("header.create_appointment")}</h2>

      <select
        name="patient_id"
        value={form.patient_id}
        onChange={handleChange}
        className="w-full border p-2"
        required
      >
        <option value="">{t("placeholder.select_patient")}</option>
        {patients.map((p) => (
          <option key={p.id} value={p.id}>
            {p.first_name} {p.last_name}
          </option>
        ))}
      </select>

      <select
        name="dentist_id"
        value={form.dentist_id}
        onChange={handleChange}
        className="w-full border p-2"
        required
      >
        <option value="">{t("placeholder.select_dentist")}</option>
        {dentists.map((d) => (
          <option key={d.id} value={d.id}>
            {d.first_name} {d.last_name}
          </option>
        ))}
      </select>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("label.select_date")}
        </label>
        <DatePickerComponent
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          disabledDates={disabledRanges}
        />
      </div>

      {availableSlots.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("label.available_times")}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {availableSlots.map((slot) => {
              const time = slot.slot_time;
              const isSelected = selectedTime === time;
              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => setSelectedTime(time)}
                  className={`py-2 px-3 border rounded ${
                    isSelected
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {time}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <input
        type="number"
        name="duration_minutes"
        value={form.duration_minutes}
        onChange={handleChange}
        className="w-full border p-2"
        placeholder={t("placeholder.duration")}
        required
      />
      <textarea
        name="notes"
        value={form.notes}
        onChange={handleChange}
        className="w-full border p-2"
        placeholder={t("placeholder.notes_optional")}
      />

      <button className="w-full bg-blue-600 text-white py-2 rounded" type="submit">
        {t("button.create_appointment")}
      </button>
    </form>
  );
}
