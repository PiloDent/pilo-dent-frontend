import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { useEffect, useState } from "react";
import { format, parse, startOfWeek, getDay } from "date-fns";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "@/supabaseClient";
import { useTranslation } from "react-i18next";

const locales = {
  "en-US": require("date-fns/locale/en-US"),
  "de-DE": require("date-fns/locale/de"),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

export default function Scheduler() {
  const { t, i18n } = useTranslation();
  const [events, setEvents] = useState([]);

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select(
        "id, scheduled_time, duration_minutes, patients(first_name, last_name)"
      );

    if (error) return;

    const mapped = data.map((appt) => ({
      id: appt.id,
      title: `${t("text.appointment")}: ${appt.patients?.first_name ?? ""} ${appt.patients?.last_name ?? ""}`,
      start: new Date(appt.scheduled_time),
      end: new Date(
        new Date(appt.scheduled_time).getTime() + appt.duration_minutes * 60000
      ),
    }));

    setEvents(mapped);
  };

  useEffect(() => {
    // sync locale
    const locale = i18n.language === 'de' ? 'de-DE' : 'en-US';
    localizer.locales['current'] = locales[locale];
    fetchAppointments();
  }, [i18n.language]);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-2">{t("header.appointment_calendar")}</h2>
      <div className="h-[600px] border">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
        />
      </div>
    </div>
  );
}
