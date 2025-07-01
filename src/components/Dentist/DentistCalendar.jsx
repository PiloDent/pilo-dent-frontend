// src/components/Dentist/DentistCalendar.jsx
import { useEffect, useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "@/supabaseClient";
import { useSessionContext } from "../../context/SessionContext.jsx";
import EditAppointmentModal from "../Calendar/EditAppointmentModal";
import AddBlockModal from "./AddBlockModal";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const localizer = momentLocalizer(moment);

export default function DentistCalendar() {
  const { session } = useSessionContext();
  const dentistId = session?.user?.id;
  const [events, setEvents] = useState([]);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [summary, setSummary] = useState({ total: 0, blocked: 0, booked: 0 });
  const [filterType, setFilterType] = useState("all");
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [typeBreakdown, setTypeBreakdown] = useState({});
  const [selectedTreatmentType, setSelectedTreatmentType] = useState("all");

  useEffect(() => {
    fetchEvents();

    // Real-time listener scoped to this dentist’s appointments
    const subscription = supabase
      .from(`appointments:dentist_id=eq.${dentistId}`)
      .on("UPDATE", (payload) => {
        if (payload.new.checked_in) {
          alert(
            `Patient checked in: ${payload.new.patient_first_name} ${payload.new.patient_last_name}`
          );
        }
        fetchEvents();
      })
      .subscribe();

    return () => {
      supabase.removeSubscription(subscription);
    };
  }, [dentistId]);

  async function fetchEvents() {
    if (!dentistId) return;

    const [
      { data: appts = [], error: apptError },
      { data: blocks = [], error: blockError },
    ] = await Promise.all([
      supabase
        .from("appointments")
        .select(
          "id, scheduled_time, duration_minutes, checked_in, notes, status, type, patient:patient_id(first_name,last_name)"
        )
        .eq("dentist_id", dentistId),
      supabase
        .from("blocked_times")
        .select("start, end_time, reason")
        .eq("dentist_id", dentistId),
    ]);

    if (apptError || blockError) {
      console.error("Failed to load calendar data:", apptError || blockError);
      return;
    }

    // build appointment events
    const appointmentEvents = appts.map((appt) => ({
      id: appt.id,
      title:
        appt.status === "cancelled"
          ? `❌ Cancelled – ${appt.patient.first_name}`
          : `${appt.patient.first_name} – ${appt.notes || ""}`,
      start: new Date(appt.scheduled_time),
      end: new Date(
        new Date(appt.scheduled_time).getTime() +
          appt.duration_minutes * 60000
      ),
      allDay: false,
      type: appt.type || "unknown",
      status: appt.status,
      checkedIn: appt.checked_in,
      isAppointment: true,
    }));

    // build block events
    const blockEvents = blocks.map((b, i) => ({
      id: `block-${i}`,
      title: b.reason || "Unavailable",
      start: new Date(b.start),
      end: new Date(b.end_time),
      allDay: false,
      isBlocked: true,
    }));

    const allEvents = [...appointmentEvents, ...blockEvents];
    setEvents(allEvents);

    // you can recalc summary/stats here…
    // setSummary({ total: allEvents.length, blocked: blockEvents.length, booked: appointmentEvents.length });
    // setTypeBreakdown(...);
    // setMonthlyStats(...);
  }

  const eventStyleGetter = (event) => {
    let bg = "#3b82f6"; // default blue
    if (event.isBlocked) bg = "#f97316";
    else if (event.status === "cancelled") bg = "#ef4444";
    else if (event.checkedIn) bg = "#16a34a";
    return {
      style: {
        backgroundColor: bg,
        color: "#fff",
        borderRadius: 4,
        padding: "2px 4px",
        display: "flex",
        alignItems: "center",
      },
    };
  };

  const handleSelectEvent = (ev) => {
    if (!ev.isBlocked) setSelectedAppt(ev);
  };

  return (
    <div className="mt-10 p-4 border rounded shadow bg-white max-w-5xl mx-auto space-y-6">
      {/* — summary / filters / charts could go here — */}

      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        views={["day", "week", "agenda"]}
        defaultView="week"
        onSelectEvent={handleSelectEvent}
        eventPropGetter={eventStyleGetter}
        components={{
          event: ({ event }) => (
            <div className="flex items-center">
              {event.checkedIn && event.isAppointment && (
                <span className="mr-1">✅</span>
              )}
              <span>{event.title}</span>
            </div>
          ),
        }}
      />

      {selectedAppt && (
        <EditAppointmentModal
          appointment={selectedAppt}
          onClose={() => setSelectedAppt(null)}
          onUpdate={fetchEvents}
        />
      )}

      {showAddBlock && (
        <AddBlockModal onClose={() => setShowAddBlock(false)} onSaved={fetchEvents} />
      )}
    </div>
  );
}
