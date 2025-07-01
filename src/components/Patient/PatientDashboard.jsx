// src/components/Patient/PatientDashboard.jsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { supabase } from "@/supabaseClient";
import LanguageSwitcher from "../LanguageSwitcher.jsx";
import TreatmentCoordinator from "../Dentist/TreatmentCoordinator.jsx";

export default function PatientDashboard() {
  const { t } = useTranslation();

  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [desiredDate, setDesiredDate] = useState(null);
  const [waitlistStatus, setWaitlistStatus] = useState("");

  useEffect(() => {
    fetchPatientData();
  }, []);

  const fetchPatientData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch patient profile
    const { data: patientData } = await supabase
      .from("patients")
      .select("id, first_name, last_name, email, phone")
      .eq("user_id", user.id)
      .maybeSingle();
    setPatient(patientData);
    if (!patientData) return;

    // Fetch upcoming appointments
    const { data: appts } = await supabase
      .from("appointments")
      .select(
        "id, date, appointment_time as time, dentist(first_name, last_name)"
      )
      .eq("patient_id", patientData.id)
      .order("date", { ascending: true })
      .limit(5);
    setAppointments(appts || []);

    // Fetch treatment history
    const { data: treatmentsData } = await supabase
      .from("treatment_history")
      .select("id, date, billing_code(code), notes")
      .eq("patient_id", patientData.id)
      .order("date", { ascending: false })
      .limit(5);
    setTreatments(treatmentsData || []);
  };

  // Join waitlist for a desired date
  const joinWaitlist = async () => {
    if (!desiredDate) {
      setWaitlistStatus(t("patient_dashboard.select_date"));
      return;
    }
    const dateStr = desiredDate.toISOString().split("T")[0];
    const { error } = await supabase.from("waitlist").insert({
      patient_id: patient.id,
      desired_date: dateStr,
    });
    if (error) {
      setWaitlistStatus(t("patient_dashboard.waitlist_error", { message: error.message }));
    } else {
      setWaitlistStatus(t("patient_dashboard.waitlist_success", { date: dateStr }));
    }
  };

  if (!patient) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold">{t("patient_dashboard.loading")}</h2>
      </div>
    );
  }

  // Determine the latest treatment code for the AI coordinator
  const latestCode = treatments[0]?.billing_code?.code || "";

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded shadow space-y-6">
      {/* only patient‐facing: language toggle */}
      <LanguageSwitcher />

      <h1 className="text-2xl font-bold mb-4">
        {t("patient_dashboard.title")}
      </h1>

      {/* Patient Info */}
      <section>
        <h2 className="text-xl font-semibold mb-2">{t("patient_dashboard.profile")}</h2>
        <p>
          <strong>{t("patient_dashboard.name")}:</strong> {patient.first_name}{" "}
          {patient.last_name}
        </p>
        {patient.email && (
          <p>
            <strong>{t("patient_dashboard.email")}:</strong> {patient.email}
          </p>
        )}
        {patient.phone && (
          <p>
            <strong>{t("patient_dashboard.phone")}:</strong> {patient.phone}
          </p>
        )}
      </section>

      {/* Upcoming Appointments */}
      <section>
        <h2 className="text-xl font-semibold mb-2">
          {t("patient_dashboard.upcoming_appointments")}
        </h2>
        {appointments.length === 0 ? (
          <p>{t("patient_dashboard.no_upcoming")}</p>
        ) : (
          <ul className="list-disc pl-5">
            {appointments.map((appt) => (
              <li key={appt.id}>
                {new Date(appt.date).toLocaleDateString()} {t("patient_dashboard.at")}{" "}
                {appt.time} {t("patient_dashboard.with")} Dr.{" "}
                {appt.dentist.first_name} {appt.dentist.last_name}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Treatment History */}
      <section>
        <h2 className="text-xl font-semibold mb-2">
          {t("patient_dashboard.recent_treatments")}
        </h2>
        {treatments.length === 0 ? (
          <p>{t("patient_dashboard.no_recent")}</p>
        ) : (
          <ul className="list-disc pl-5">
            {treatments.map((t) => (
              <li key={t.id}>
                {new Date(t.date).toLocaleDateString()} — {t.billing_code.code}{" "}
                {t.notes && <em>({t.notes})</em>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Waitlist Section */}
      <section className="border-t pt-4">
        <h2 className="text-xl font-semibold mb-2">
          {t("patient_dashboard.waitlist_title")}
        </h2>
        <p>{t("patient_dashboard.waitlist_description")}</p>
        <div className="flex items-center space-x-2 mt-2">
          <DatePicker
            selected={desiredDate}
            onChange={(date) => {
              setDesiredDate(date);
              setWaitlistStatus("");
            }}
            placeholderText={t("patient_dashboard.waitlist_placeholder")}
            className="p-2 border rounded"
          />
          <button
            onClick={joinWaitlist}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            {t("patient_dashboard.waitlist_button")}
          </button>
        </div>
        {waitlistStatus && <p className="mt-2 text-sm">{waitlistStatus}</p>}
      </section>

      {/* AI Treatment Coordinator */}
      <section className="border-t pt-4">
        <h2 className="text-xl font-semibold mb-2">
          {t("patient_dashboard.ai_coordinator_title")}
        </h2>
        <TreatmentCoordinator patient={patient} treatmentCode={latestCode} />
      </section>
    </div>
  );
}
