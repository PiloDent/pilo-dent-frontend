import { useEffect, useState, useRef } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "@/supabaseClient";
import EditAppointmentModal from "./EditAppointmentModal";
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
import { useTranslation } from "react-i18next";

const localizer = momentLocalizer(moment);

export default function AdminCalendar() {
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [statsData, setStatsData] = useState([]);
  const chartRef = useRef(null);

  useEffect(() => {
    fetchEvents();
    fetchStats();
  }, []);

  const fetchEvents = async () => {
    const { data: appointments } = await supabase
      .from("appointments")
      .select(
        "id, scheduled_time, duration_minutes, checked_in, patient:patient_id(first_name, last_name), notes"
      );

    const { data: blocks } = await supabase
      .from("blocked_times")
      .select("start, end_time, reason");

    const { data: shifts } = await supabase
      .from("shifts")
      .select("shift_date, start_time, end_time, role, profile:profile_id(name)");

    const appointmentEvents = (appointments || []).map((appt) => ({
      id: appt.id,
      title: `${appt.patient.first_name} ${appt.patient.last_name}` +
             (appt.notes ? ` — ${appt.notes}` : ""),
      start: new Date(appt.scheduled_time),
      end: new Date(
        new Date(appt.scheduled_time).getTime() + appt.duration_minutes * 60000
      ),
      allDay: false,
      isAppointment: true,
      checkedIn: appt.checked_in,
      bgColor: appt.checked_in ? "#16a34a" : "#60a5fa",
    }));

    const blockEvents = (blocks || []).map((blk, i) => ({
      id: `block-${i}`,
      title: blk.reason || t("text.unavailable"),
      start: new Date(blk.start),
      end: new Date(blk.end_time),
      allDay: false,
      isBlocked: true,
      bgColor: "#f97316",
    }));

    const shiftEvents = (shifts || []).map((shift, i) => ({
      id: `shift-${i}`,
      title: (shift.role === "assistant" ? "🧑‍⚕️" : "🦷") +
             ` ${shift.profile.name} ${t("text.shift")}`,
      start: new Date(`${shift.shift_date}T${shift.start_time}`),
      end: new Date(`${shift.shift_date}T${shift.end_time}`),
      allDay: false,
      isShift: true,
      bgColor: "#34d399",
    }));

    setEvents([...appointmentEvents, ...blockEvents, ...shiftEvents]);
  };

  const fetchStats = async () => {
    const grouped = {};
    events.forEach((e) => {
      if (!e.isAppointment) return;
      const date = moment(e.start).format("YYYY-MM-DD");
      grouped[date] = (grouped[date] || 0) + 1;
    });
    const data = Object.entries(grouped).map(([date, count]) => ({ date, count }));
    setStatsData(data);
  };

  const handleCheckInToggle = async (event) => {
    const newStatus = !event.checkedIn;
    await supabase
      .from("appointments")
      .update({ checked_in: newStatus })
      .eq("id", event.id);
    await fetchEvents();
  };

  const eventStyleGetter = (event) => ({
    style: {
      backgroundColor: event.bgColor,
      borderRadius: "5px",
      opacity: 0.9,
      color: "white",
      border: "0px",
      paddingLeft: "5px",
    },
  });

  const CustomEvent = ({ event }) => (
    <div className="flex justify-between items-center">
      <span>{event.title}</span>
      {event.isAppointment && (
        <button
          onClick={(e) => { e.stopPropagation(); handleCheckInToggle(event); }}
          className="ml-2 text-xs bg-white text-black px-2 py-0.5 rounded shadow"
        >
          {event.checkedIn ? t("button.checked_in") : t("button.check_in")}
        </button>
      )}
    </div>
  );

  const handleSelectEvent = (event) => {
    if (!event.isBlocked && !event.isShift) setSelectedAppt(event);
  };

  const exportPDF = async () => {
    const canvas = await html2canvas(chartRef.current);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    pdf.addImage(imgData, "PNG", 10, 10, 190, 60);
    pdf.save("appointment-stats.pdf");
  };

  return (
    <div className="mt-10 p-4 rounded shadow bg-white max-w-6xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold">{t("header.admin_calendar")}</h2>

      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
        views={["day", "week", "agenda"]}
        defaultView="week"
        onSelectEvent={handleSelectEvent}
        eventPropGetter={eventStyleGetter}
        components={{ event: CustomEvent }}
      />

      {selectedAppt && (
        <EditAppointmentModal
          appointment={selectedAppt}
          onClose={() => setSelectedAppt(null)}
          onUpdate={() => { setSelectedAppt(null); fetchEvents(); }}
        />
      )}

      <button
        onClick={() => setShowAddBlock(true)}
        className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
      >
        {t("button.add_block")}      
      </button>

      {showAddBlock && (
        <AddBlockModal
          onClose={() => setShowAddBlock(false)}
          onSaved={() => { setShowAddBlock(false); fetchEvents(); }}
        />
      )}

      <div className="p-4 border rounded">
        <h3 className="text-xl mb-2">{t("header.daily_appointment_counts")}</h3>
        <div ref={chartRef} className="w-full h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statsData}>  
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <button
          onClick={exportPDF}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {t("button.export_chart_pdf")}
        </button>
      </div>
    </div>
  );
}
