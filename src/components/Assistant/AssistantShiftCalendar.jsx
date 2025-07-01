import { useEffect, useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "@/supabaseClient";

const localizer = momentLocalizer(moment);

export default function AssistantShiftCalendar() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: shifts, error } = await supabase
      .from("shifts")
      .select("shift_date, start_time, end_time")
      .eq("user_id", user.id)
      .eq("role", "assistant");

    if (error) {
      console.error("Error fetching shifts:", error.message);
      return;
    }

    const formatted = shifts.map((s, i) => ({
      id: `shift-${i}`,
      title: "🧑‍⚕️ Your Shift",
      start: new Date(`${s.shift_date}T${s.start_time}`),
      end: new Date(`${s.shift_date}T${s.end_time}`),
      allDay: false,
    }));

    setEvents(formatted);
  };

  return (
    <div className="max-w-6xl mx-auto mt-10 bg-white p-4 rounded shadow">
      <h2 className="text-2xl font-bold mb-4">📅 Your Shift Calendar</h2>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
        defaultView="week"
        views={["week", "day", "agenda"]}
      />
    </div>
  );
}
