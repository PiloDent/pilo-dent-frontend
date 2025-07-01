import React, { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { formatISO, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";

export default function EditAppointmentModal({
  appointment,
  onClose,
  onUpdate,
}) {
  const { t } = useTranslation();
  const initialDate = appointment?.scheduled_time
    ? parseISO(appointment.scheduled_time)
    : null;

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedTime, setSelectedTime] = useState(
    appointment?.scheduled_time
      ? formatISO(parseISO(appointment.scheduled_time), {
          representation: "time",
        })
      : ""
  );
  const [disabledRanges, setDisabledRanges] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [notes, setNotes] = useState(appointment?.notes || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBlocked() {
      const { data, error } = await supabase
        .from("appointment_block_ranges")
        .select("from_date, to_date");
      if (!error && data) {
        setDisabledRanges(
          data.map((r) => ({
            start: new Date(r.from_date),
            end: new Date(r.to_date),
          }))
        );
      }
    }
    loadBlocked();
  }, []);

  useEffect(() => {
    setAvailableSlots([]);
    if (!selectedDate) return;

    (async () => {
      const isoDate = formatISO(selectedDate, { representation: "date" });
      const { data: slots, error } = await supabase.rpc(
        "get_available_slots",
        { p_date: isoDate }
      );
      if (!error && slots) {
        setAvailableSlots(slots);
      }
    })();
  }, [selectedDate]);

  const handleSave = async () => {
    if (!selectedDate || !selectedTime) {
      return setError(t("alert.pick_date_time"));
    }
    setError("");
    setLoading(true);

    const scheduled_time = `${formatISO(selectedDate)}T${selectedTime}`;
    const updates = { scheduled_time, notes };

    const { error: updErr } = await supabase
      .from("appointments")
      .update(updates)
      .eq("id", appointment.id);

    setLoading(false);
    if (updErr) {
      setError(t("error.update_failed", { message: updErr.message }));
    } else {
      onUpdate();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">{t("header.edit_appointment")}</h3>
        {error && <p className="text-red-600 mb-2">{error}</p>}

        <div className="mb-4">
          <label className="block mb-2 font-medium text-gray-700">
            {t("label.date")}
          </label>
          <DatePicker
            selected={selectedDate}
            onChange={setSelectedDate}
            excludeDateIntervals={disabledRanges}
            dateFormat="yyyy-MM-dd"
            className="w-full border p-2 rounded"
            placeholderText={t("placeholder.select_date")}
          />
        </div>

        {availableSlots.length > 0 && (
          <div className="mb-4">
            <p className="font-medium text-gray-700 mb-1">{t("label.time")}</p>
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

        <div className="mb-4">
          <label className="block mb-2 font-medium text-gray-700">
            {t("label.notes")}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border rounded px-3 py-2"
            rows={4}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
          >
            {t("button.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            {loading ? t("button.saving") : t("button.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
